"use strict";

/**
 * Singleton-таблица для блока «О себе» на сайте (конструктор в веб-админке).
 * Одна строка (id фиксирован), публикуется явно через published —
 * черновик не должен просачиваться на публичный сайт.
 */

async function up({ context: sequelize }) {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "about_content" (
      "id" INTEGER PRIMARY KEY DEFAULT 1,
      "heading" TEXT NOT NULL DEFAULT '',
      "body" TEXT NOT NULL DEFAULT '',
      "font" VARCHAR(20) NOT NULL DEFAULT 'Unbounded',
      "highlight_color" VARCHAR(10) NOT NULL DEFAULT '#ff3d8b',
      "file_name" VARCHAR(255),
      "file_url" VARCHAR(255),
      "brightness" INTEGER NOT NULL DEFAULT 100,
      "contrast" INTEGER NOT NULL DEFAULT 100,
      "warmth" INTEGER NOT NULL DEFAULT 0,
      "zoom" INTEGER NOT NULL DEFAULT 120,
      "focus_x" INTEGER NOT NULL DEFAULT 45,
      "published" BOOLEAN NOT NULL DEFAULT false,
      "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      CONSTRAINT "about_content_singleton" CHECK ("id" = 1)
    );
  `);
  await sequelize.query(`
    INSERT INTO "about_content" ("id") VALUES (1)
    ON CONFLICT ("id") DO NOTHING;
  `);
}

async function down({ context: sequelize }) {
  await sequelize.query(`DROP TABLE IF EXISTS "about_content";`);
}

module.exports = { up, down };
