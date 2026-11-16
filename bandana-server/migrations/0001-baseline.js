"use strict";

/**
 * Baseline-миграция.
 *
 * ВАЖНО: прод-БД уже содержит все таблицы — их создал прежний
 * `Model.sync({ alter: true })` (см. историю index.js до внедрения Umzug).
 * Эта миграция должна безопасно и БЕЗ ИЗМЕНЕНИЯ ДАННЫХ применяться
 * как на пустой локальной БД, так и на уже существующей проде:
 *   - все CREATE TABLE через IF NOT EXISTS;
 *   - все ADD COLUMN через IF NOT EXISTS;
 *   - CREATE TYPE (enum) через DO $$ ... EXCEPTION WHEN duplicate_object;
 *   - FK — через DO $$ ... IF NOT EXISTS (information_schema.table_constraints).
 * На проде каждая команда — no-op (объект уже существует), на чистой базе —
 * создаёт схему с нуля. Ничего не удаляется и не переименовывается.
 *
 * Структура колонок/типов/дефолтов взята из models/*.js (источник истины) —
 * проверена сверкой с фактическим DDL, который генерирует
 * `Model.sync({ alter: true })` на этой версии Sequelize/Postgres.
 *
 * Порядок создания: родительские таблицы без FK → затем MasterClassReviews
 * (ссылается на master_classes).
 */

async function up({ context: sequelize }) {
  const q = (sql) => sequelize.query(sql);

  // ============================================================
  // master_classes (модель MasterClasses, tableName: "master_classes")
  // ============================================================
  await q(`
    CREATE TABLE IF NOT EXISTS "master_classes" (
      "id" UUID PRIMARY KEY,
      "name" VARCHAR(200) NOT NULL,
      "description" TEXT,
      "event_date" TIMESTAMP WITH TIME ZONE,
      "link" VARCHAR(200) NOT NULL,
      "is_archived" BOOLEAN NOT NULL DEFAULT false,
      "reviews_enabled" BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
      "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL
    );
  `);
  await q(`
    COMMENT ON COLUMN "master_classes"."is_archived"
      IS 'Архивные мероприятия не показываются';
  `);
  await q(`
    COMMENT ON COLUMN "master_classes"."reviews_enabled"
      IS 'Включены ли отзывы для этого мастер-класса';
  `);

  // ============================================================
  // Events (модель Events, tableName: "Events")
  // Колонки is_archived/reviews_enabled в модели НЕ объявлены — их добавляла
  // ad-hoc addMissingColumns() в index.js, переносим ту же логику ниже.
  // ============================================================
  await q(`
    CREATE TABLE IF NOT EXISTS "Events" (
      "id" UUID PRIMARY KEY,
      "description" TEXT,
      "event_date" VARCHAR(255),
      "fileName" VARCHAR(255),
      "fileUrl" VARCHAR(255),
      "photoFileId" VARCHAR(255),
      "place" VARCHAR(255),
      "type" VARCHAR(255),
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
    );
  `);

  // ============================================================
  // Gallery (модель Gallery, tableName по умолчанию: "Galleries")
  // ============================================================
  await q(`
    CREATE TABLE IF NOT EXISTS "Galleries" (
      "id" UUID PRIMARY KEY,
      "fileName" VARCHAR(255) NOT NULL,
      "fileUrl" VARCHAR(255) NOT NULL,
      "filter" VARCHAR(255) NOT NULL,
      "footer" VARCHAR(255) NOT NULL,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
    );
  `);

  // ============================================================
  // Video (модель Video, tableName по умолчанию: "Videos")
  // ============================================================
  await q(`
    CREATE TABLE IF NOT EXISTS "Videos" (
      "id" UUID PRIMARY KEY,
      "fileName" VARCHAR(255) NOT NULL,
      "fileUrl" VARCHAR(255) NOT NULL,
      "name" VARCHAR(255) NOT NULL,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
    );
  `);

  // ============================================================
  // Teams (модель Teams, tableName по умолчанию: "Teams")
  // ============================================================
  await q(`
    CREATE TABLE IF NOT EXISTS "Teams" (
      "id" UUID PRIMARY KEY,
      "name" VARCHAR(255) NOT NULL,
      "city" VARCHAR(255) NOT NULL,
      "ageRange" TEXT,
      "instructors" TEXT,
      "choreographer" TEXT,
      "achievements" JSON DEFAULT '[]',
      "photoFileId" TEXT,
      "fileName" TEXT,
      "description" TEXT,
      "isRecruiting" BOOLEAN NOT NULL DEFAULT false,
      "fileUrl" TEXT,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
    );
  `);

  // ============================================================
  // Notification (модель Notification, tableName: "Notifications")
  // ============================================================
  await q(`
    CREATE TABLE IF NOT EXISTS "Notifications" (
      "id" UUID PRIMARY KEY,
      "cookie_id" VARCHAR(36) NOT NULL,
      "message" TEXT NOT NULL,
      "type" VARCHAR(20),
      "is_read" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
    );
  `);

  // ============================================================
  // User (модель User, tableName по умолчанию: "Users")
  // Используется message-монитором бота (bot/utils/messageMonitor.js).
  // ============================================================
  await q(`
    CREATE TABLE IF NOT EXISTS "Users" (
      "id" BIGINT PRIMARY KEY,
      "username" VARCHAR(255),
      "first_name" VARCHAR(255),
      "last_name" VARCHAR(255),
      "language_code" VARCHAR(10),
      "is_bot" BOOLEAN DEFAULT false,
      "is_premium" BOOLEAN DEFAULT false,
      "message_count" INTEGER DEFAULT 0,
      "first_seen" TIMESTAMP WITH TIME ZONE,
      "last_active" TIMESTAMP WITH TIME ZONE,
      "chats_seen_in" BIGINT[] DEFAULT ARRAY[]::BIGINT[],
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
    );
  `);

  // ============================================================
  // Chat (модель Chat, tableName по умолчанию: "Chats")
  // ============================================================
  await q(`
    DO $$
    BEGIN
      CREATE TYPE "public"."enum_Chats_type" AS ENUM ('private', 'group', 'supergroup', 'channel');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END
    $$;
  `);
  await q(`
    CREATE TABLE IF NOT EXISTS "Chats" (
      "id" BIGINT PRIMARY KEY,
      "type" "public"."enum_Chats_type" NOT NULL,
      "title" VARCHAR(255),
      "username" VARCHAR(255),
      "invite_link" VARCHAR(255),
      "description" TEXT,
      "members_count" INTEGER,
      "admins_count" INTEGER,
      "message_count" INTEGER DEFAULT 0,
      "first_seen" TIMESTAMP WITH TIME ZONE,
      "last_activity" TIMESTAMP WITH TIME ZONE,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
    );
  `);

  // ============================================================
  // Message (модель Message, tableName по умолчанию: "Messages")
  // ============================================================
  await q(`
    CREATE TABLE IF NOT EXISTS "Messages" (
      "id" UUID PRIMARY KEY,
      "telegram_message_id" BIGINT,
      "update_type" VARCHAR(30) NOT NULL DEFAULT 'message',
      "message_type" VARCHAR(30) NOT NULL DEFAULT 'text',
      "content" TEXT,
      "user_id" BIGINT,
      "chat_id" BIGINT,
      "file_id" VARCHAR(255),
      "file_size" BIGINT,
      "is_edited" BOOLEAN DEFAULT false,
      "sent_at" TIMESTAMP WITH TIME ZONE,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
    );
  `);

  // ============================================================
  // Добавляем недостающие колонки в Events (перенос из index.js:addMissingColumns)
  // ============================================================
  await q(`
    ALTER TABLE "Events" ADD COLUMN IF NOT EXISTS "is_archived" BOOLEAN DEFAULT false;
  `);
  await q(`
    ALTER TABLE "Events" ADD COLUMN IF NOT EXISTS "reviews_enabled" BOOLEAN DEFAULT true;
  `);

  // ============================================================
  // MasterClassReview (модель Review, tableName: "MasterClassReviews")
  // Создаётся ПОСЛЕ master_classes — на неё ссылается FK ниже.
  // ============================================================
  await q(`
    DO $$
    BEGIN
      CREATE TYPE "public"."enum_MasterClassReviews_status" AS ENUM ('pending', 'approved', 'rejected', 'blocked');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END
    $$;
  `);
  await q(`
    CREATE TABLE IF NOT EXISTS "MasterClassReviews" (
      "id" UUID PRIMARY KEY,
      "author_name" VARCHAR(50) NOT NULL,
      "master_class_id" UUID,
      "master_class_name" VARCHAR(200),
      "master_class_date" TIMESTAMP WITH TIME ZONE,
      "rating" INTEGER NOT NULL,
      "content" TEXT NOT NULL,
      "status" "public"."enum_MasterClassReviews_status" NOT NULL DEFAULT 'pending',
      "rejection_reason" TEXT,
      "cookie_id" VARCHAR(36),
      "ip_address" VARCHAR(45),
      "user_agent" TEXT,
      "is_blocked" BOOLEAN NOT NULL DEFAULT false,
      "blocked_at" TIMESTAMP WITH TIME ZONE,
      "blocked_reason" TEXT,
      "submitted_at" TIMESTAMP WITH TIME ZONE NOT NULL,
      "reviewed_at" TIMESTAMP WITH TIME ZONE,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
    );
  `);
  await q(`
    COMMENT ON COLUMN "MasterClassReviews"."master_class_name"
      IS 'Название мастер-класса на момент создания отзыва';
  `);
  await q(`
    COMMENT ON COLUMN "MasterClassReviews"."master_class_date"
      IS 'Дата мастер-класса на момент создания отзыва';
  `);

  // ============================================================
  // FK MasterClassReviews.master_class_id -> master_classes.id
  // (перенос ad-hoc DO $$ блока из index.js, с ИСПРАВЛЕНИЕМ бага и доп.
  // проверкой безопасности — см. комментарий ниже)
  //
  // БАГ в оригинале: index.js ссылался на таблицу "MasterClasses" —
  // такой таблицы никогда не существовало, реальная таблица называется
  // "master_classes" (см. tableName в models/master_classes.js).
  // ALTER там гарантированно падал с "relation MasterClasses does not exist"
  // и глушился try/catch — то есть в проде этот FK, судя по всему, никогда
  // фактически не создавался. Здесь ссылка исправлена на реальную таблицу.
  //
  // Доп. защита для существующей проде: если в MasterClassReviews уже есть
  // "осиротевшие" master_class_id (ссылки на несуществующие master_classes —
  // такое могло накопиться именно из-за того, что FK никогда не работал),
  // ADD CONSTRAINT пропускается с NOTICE, а не фейлится и не трогает данные.
  //
  // ON DELETE SET NULL (а не CASCADE): при удалении мастер-класса отзывы НЕ
  // удаляются, а их master_class_id обнуляется. Это соответствует модели
  // (master_class_id allowNull:true + денормализованные master_class_name/
  // master_class_date, сохраняющие контекст отзыва) — отзывы переживают
  // удаление МК.
  // ============================================================
  await q(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'MasterClassReviews_master_class_id_fkey'
      ) THEN
        IF NOT EXISTS (
          SELECT 1 FROM "MasterClassReviews" r
          WHERE r.master_class_id IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM "master_classes" mc WHERE mc.id = r.master_class_id
            )
        ) THEN
          ALTER TABLE "MasterClassReviews"
          ADD CONSTRAINT "MasterClassReviews_master_class_id_fkey"
          FOREIGN KEY ("master_class_id")
          REFERENCES "master_classes"("id")
          ON DELETE SET NULL;
        ELSE
          RAISE NOTICE 'Skipping MasterClassReviews_master_class_id_fkey: orphaned master_class_id rows exist, fix data before re-running';
        END IF;
      END IF;
    END
    $$;
  `);
}

async function down() {
  throw new Error(
    "0001-baseline — это снимок уже существующей прод-схемы, откат не поддерживается",
  );
}

module.exports = { up, down };
