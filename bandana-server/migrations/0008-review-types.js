"use strict";

/**
 * Разделение отзывов на три категории: мастер-классы (как было), услуги
 * (привязка к конкретному завершённому заказу — одна анкета один отзыв) и
 * занятия по танцам (новая сущность dance_classes — регулярные группы/
 * направления, которых в проекте раньше не было).
 *
 * Существующая таблица MasterClassReviews не переименовывается и не теряет
 * ни одной колонки — все текущие строки остаются отзывами на мастер-классы
 * (review_type по умолчанию 'masterclass'), чтобы не трогать живые данные
 * и код, который их читает.
 */

async function up({ context: sequelize }) {
  const q = (sql, options) => sequelize.query(sql, options);

  await q(`
    DO $$
    BEGIN
      CREATE TYPE "public"."enum_review_type" AS ENUM ('masterclass', 'service', 'dance_class');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END
    $$;
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS "dance_classes" (
      "id" UUID PRIMARY KEY,
      "name" VARCHAR(200) NOT NULL,
      "description" TEXT,
      "is_archived" BOOLEAN NOT NULL DEFAULT false,
      "reviews_enabled" BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  await q(`
    ALTER TABLE "MasterClassReviews"
    ADD COLUMN IF NOT EXISTS "review_type" "public"."enum_review_type" NOT NULL DEFAULT 'masterclass';
  `);

  await q(`
    ALTER TABLE "MasterClassReviews"
    ADD COLUMN IF NOT EXISTS "order_id" UUID REFERENCES "orders"("id") ON DELETE SET NULL;
  `);
  await q(`
    ALTER TABLE "MasterClassReviews"
    ADD COLUMN IF NOT EXISTS "service_id" UUID REFERENCES "services"("id") ON DELETE SET NULL;
  `);
  await q(`
    ALTER TABLE "MasterClassReviews"
    ADD COLUMN IF NOT EXISTS "service_title" VARCHAR(200);
  `);
  await q(`
    ALTER TABLE "MasterClassReviews"
    ADD COLUMN IF NOT EXISTS "dance_class_id" UUID REFERENCES "dance_classes"("id") ON DELETE SET NULL;
  `);
  await q(`
    ALTER TABLE "MasterClassReviews"
    ADD COLUMN IF NOT EXISTS "dance_class_name" VARCHAR(200);
  `);

  // Один отзыв на один заказ — на уровне БД (Postgres допускает сколько
  // угодно NULL в UNIQUE-индексе, так что отзывы других типов не затронуты).
  await q(`
    CREATE UNIQUE INDEX IF NOT EXISTS "idx_master_class_reviews_order_id_unique"
    ON "MasterClassReviews" ("order_id");
  `);
  await q(`
    CREATE INDEX IF NOT EXISTS "idx_master_class_reviews_review_type"
    ON "MasterClassReviews" ("review_type", "status");
  `);
  await q(`
    CREATE INDEX IF NOT EXISTS "idx_master_class_reviews_dance_class_id"
    ON "MasterClassReviews" ("dance_class_id");
  `);
}

async function down({ context: sequelize }) {
  const q = (sql, options) => sequelize.query(sql, options);

  await q(`DROP INDEX IF EXISTS "idx_master_class_reviews_dance_class_id";`);
  await q(`DROP INDEX IF EXISTS "idx_master_class_reviews_review_type";`);
  await q(`DROP INDEX IF EXISTS "idx_master_class_reviews_order_id_unique";`);

  await q(`ALTER TABLE "MasterClassReviews" DROP COLUMN IF EXISTS "dance_class_name";`);
  await q(`ALTER TABLE "MasterClassReviews" DROP COLUMN IF EXISTS "dance_class_id";`);
  await q(`ALTER TABLE "MasterClassReviews" DROP COLUMN IF EXISTS "service_title";`);
  await q(`ALTER TABLE "MasterClassReviews" DROP COLUMN IF EXISTS "service_id";`);
  await q(`ALTER TABLE "MasterClassReviews" DROP COLUMN IF EXISTS "order_id";`);
  await q(`ALTER TABLE "MasterClassReviews" DROP COLUMN IF EXISTS "review_type";`);

  await q(`DROP TABLE IF EXISTS "dance_classes";`);
  await q(`DROP TYPE IF EXISTS "public"."enum_review_type";`);
}

module.exports = { up, down };
