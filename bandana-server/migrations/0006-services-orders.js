"use strict";

/**
 * Каталог услуг + система заказов (Phase 1: BANDANA AUDIO).
 *
 *   - services: каталог как данные, не код — новые услуги добавляются
 *     строкой, без деплоя (detail_json хранит форматы/портфолио/FAQ для
 *     услуг со сложным контентом, остальным достаточно базовых полей).
 *   - orders: агрегат заказа — анкета клиента + статус + согласованные
 *     цена/срок + защищённый токен доступа (хранится только его sha256-хэш).
 *   - order_files: исходные (от клиента) и готовые (от админа) файлы —
 *     одна таблица с дискриминатором kind, не две.
 *   - order_messages: тред клиент↔админ.
 *   - order_status_history: append-only журнал смен статуса (не JSONB —
 *     10 статусов с "петлями" Доработка↔В работе неудобно жить в
 *     фиксированных reason/at-колонках по образцу Review).
 */

const crypto = require("crypto");

async function up({ context: sequelize }) {
  const q = (sql, options) => sequelize.query(sql, options);

  await q(`
    DO $$
    BEGIN
      CREATE TYPE "public"."enum_service_status" AS ENUM ('active', 'coming_soon');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END
    $$;
  `);

  await q(`
    DO $$
    BEGIN
      CREATE TYPE "public"."enum_order_status" AS ENUM (
        'new', 'in_review', 'clarifying_details', 'pricing_agreement',
        'confirmed', 'in_progress', 'revision', 'ready', 'completed', 'cancelled'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END
    $$;
  `);

  await q(`
    DO $$
    BEGIN
      CREATE TYPE "public"."enum_order_file_kind" AS ENUM ('source', 'delivered');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END
    $$;
  `);

  await q(`
    DO $$
    BEGIN
      CREATE TYPE "public"."enum_order_message_sender" AS ENUM ('customer', 'admin');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END
    $$;
  `);

  await q(`
    DO $$
    BEGIN
      CREATE TYPE "public"."enum_order_file_uploaded_by" AS ENUM ('customer', 'admin');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END
    $$;
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS "services" (
      "id" UUID PRIMARY KEY,
      "slug" VARCHAR(80) NOT NULL UNIQUE,
      "title" VARCHAR(200) NOT NULL,
      "short_description" TEXT NOT NULL,
      "description" TEXT,
      "cover_image_url" VARCHAR(255),
      "status" "public"."enum_service_status" NOT NULL DEFAULT 'coming_soon',
      "sort_order" INTEGER NOT NULL DEFAULT 0,
      "detail_json" JSONB NOT NULL DEFAULT '{}'::jsonb,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS "orders" (
      "id" UUID PRIMARY KEY,
      "order_number" VARCHAR(20) NOT NULL UNIQUE,
      "access_token_hash" VARCHAR(64) NOT NULL UNIQUE,
      "service_id" UUID NOT NULL REFERENCES "services"("id") ON DELETE RESTRICT,
      "status" "public"."enum_order_status" NOT NULL DEFAULT 'new',
      "format" VARCHAR(40),
      "source_links" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "desired_duration" VARCHAR(100),
      "brief" TEXT,
      "comments" TEXT,
      "timecodes" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "desired_deadline" DATE,
      "contact_telegram" VARCHAR(100),
      "contact_phone" VARCHAR(30),
      "contact_email" VARCHAR(255),
      "contact_name" VARCHAR(100),
      "agreed_price" INTEGER,
      "agreed_deadline" DATE,
      "is_archived" BOOLEAN NOT NULL DEFAULT false,
      "cookie_id" VARCHAR(36),
      "ip_address" VARCHAR(45),
      "user_agent" TEXT,
      "submitted_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);
  await q(`CREATE INDEX IF NOT EXISTS "idx_orders_status" ON "orders" ("status");`);
  await q(`CREATE INDEX IF NOT EXISTS "idx_orders_cookie_id" ON "orders" ("cookie_id");`);
  await q(`CREATE INDEX IF NOT EXISTS "idx_orders_ip_address" ON "orders" ("ip_address");`);
  await q(`CREATE INDEX IF NOT EXISTS "idx_orders_is_archived" ON "orders" ("is_archived");`);

  await q(`
    CREATE TABLE IF NOT EXISTS "order_files" (
      "id" UUID PRIMARY KEY,
      "order_id" UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
      "kind" "public"."enum_order_file_kind" NOT NULL,
      "file_name" VARCHAR(255) NOT NULL,
      "file_url" VARCHAR(255) NOT NULL,
      "mime_type" VARCHAR(100),
      "size_bytes" BIGINT,
      "uploaded_by" "public"."enum_order_file_uploaded_by" NOT NULL,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);
  await q(`CREATE INDEX IF NOT EXISTS "idx_order_files_order_id" ON "order_files" ("order_id");`);

  await q(`
    CREATE TABLE IF NOT EXISTS "order_messages" (
      "id" UUID PRIMARY KEY,
      "order_id" UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
      "sender" "public"."enum_order_message_sender" NOT NULL,
      "admin_id" UUID REFERENCES "admin_users"("id") ON DELETE SET NULL,
      "body" TEXT NOT NULL,
      "is_read_by_customer" BOOLEAN NOT NULL DEFAULT false,
      "is_read_by_admin" BOOLEAN NOT NULL DEFAULT false,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);
  await q(`CREATE INDEX IF NOT EXISTS "idx_order_messages_order_id" ON "order_messages" ("order_id");`);
  await q(`
    CREATE INDEX IF NOT EXISTS "idx_order_messages_unread_admin"
    ON "order_messages" ("is_read_by_admin") WHERE "is_read_by_admin" = false;
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS "order_status_history" (
      "id" UUID PRIMARY KEY,
      "order_id" UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
      "from_status" "public"."enum_order_status",
      "to_status" "public"."enum_order_status" NOT NULL,
      "admin_id" UUID REFERENCES "admin_users"("id") ON DELETE SET NULL,
      "note" TEXT,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);
  await q(`
    CREATE INDEX IF NOT EXISTS "idx_order_status_history_order_id"
    ON "order_status_history" ("order_id");
  `);

  const services = [
    {
      slug: "audio",
      title: "Нарезка и монтаж музыки",
      short_description:
        "Dance Cut, Mix Edit, Performance Edit и Custom Edit — монтаж музыки для выступлений и видео.",
      status: "active",
      sort_order: 0,
    },
    {
      slug: "choreography",
      title: "Хореография",
      short_description: "Постановка номеров и хореографические консультации.",
      status: "coming_soon",
      sort_order: 1,
    },
    {
      slug: "video-content",
      title: "Видео и контент",
      short_description: "Съёмка и монтаж видео для соцсетей и выступлений.",
      status: "coming_soon",
      sort_order: 2,
    },
    {
      slug: "custom-projects",
      title: "Индивидуальные проекты",
      short_description: "Проекты под нестандартные задачи — обсуждается индивидуально.",
      status: "coming_soon",
      sort_order: 3,
    },
  ];

  for (const service of services) {
    await q(
      `
      INSERT INTO "services"
        ("id", "slug", "title", "short_description", "status", "sort_order", "created_at", "updated_at")
      VALUES
        (:id, :slug, :title, :shortDescription, :status, :sortOrder, NOW(), NOW())
      ON CONFLICT ("slug") DO NOTHING;
      `,
      {
        replacements: {
          id: crypto.randomUUID(),
          slug: service.slug,
          title: service.title,
          shortDescription: service.short_description,
          status: service.status,
          sortOrder: service.sort_order,
        },
      },
    );
  }
}

async function down({ context: sequelize }) {
  const q = (sql, options) => sequelize.query(sql, options);

  await q(`DROP TABLE IF EXISTS "order_status_history";`);
  await q(`DROP TABLE IF EXISTS "order_messages";`);
  await q(`DROP TABLE IF EXISTS "order_files";`);
  await q(`DROP TABLE IF EXISTS "orders";`);
  await q(`DROP TABLE IF EXISTS "services";`);

  await q(`DROP TYPE IF EXISTS "public"."enum_order_file_uploaded_by";`);
  await q(`DROP TYPE IF EXISTS "public"."enum_order_message_sender";`);
  await q(`DROP TYPE IF EXISTS "public"."enum_order_file_kind";`);
  await q(`DROP TYPE IF EXISTS "public"."enum_order_status";`);
  await q(`DROP TYPE IF EXISTS "public"."enum_service_status";`);
}

module.exports = { up, down };
