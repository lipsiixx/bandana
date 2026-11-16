"use strict";

/**
 * Многопользовательская авторизация веб-админки взамен одного общего пароля
 * (ADMIN_PASSWORD_HASH). Три таблицы:
 *   - admin_users: именные аккаунты с ролью (owner/editor/moderator);
 *   - admin_invites: приглашения по email (ссылка с токеном, живёт 7 дней);
 *   - admin_activity: лента последних действий для дашборда и будущего
 *     полного журнала.
 *
 * Сид: если admin_users пуста и заданы ADMIN_OWNER_EMAIL + ADMIN_OWNER_PASSWORD,
 * создаём первого владельца — иначе входить в админку будет некому.
 */

const bcrypt = require("bcryptjs");
const crypto = require("crypto");

async function up({ context: sequelize }) {
  const q = (sql, options) => sequelize.query(sql, options);

  await q(`
    DO $$
    BEGIN
      CREATE TYPE "public"."enum_admin_role" AS ENUM ('owner', 'editor', 'moderator');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END
    $$;
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS "admin_users" (
      "id" UUID PRIMARY KEY,
      "email" VARCHAR(255) NOT NULL UNIQUE,
      "password_hash" VARCHAR(255) NOT NULL,
      "name" VARCHAR(255) NOT NULL,
      "role" "public"."enum_admin_role" NOT NULL,
      "last_login_at" TIMESTAMP WITH TIME ZONE,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
      "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL
    );
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS "admin_invites" (
      "id" UUID PRIMARY KEY,
      "email" VARCHAR(255) NOT NULL,
      "role" "public"."enum_admin_role" NOT NULL,
      "token_hash" VARCHAR(64) NOT NULL UNIQUE,
      "invited_by_id" UUID REFERENCES "admin_users"("id") ON DELETE SET NULL,
      "invited_by_name" VARCHAR(255),
      "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
      "accepted_at" TIMESTAMP WITH TIME ZONE,
      "revoked_at" TIMESTAMP WITH TIME ZONE,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
      "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL
    );
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS "admin_activity" (
      "id" UUID PRIMARY KEY,
      "admin_id" UUID REFERENCES "admin_users"("id") ON DELETE SET NULL,
      "admin_name" VARCHAR(255) NOT NULL,
      "action" VARCHAR(50) NOT NULL,
      "section" VARCHAR(50) NOT NULL,
      "summary" TEXT NOT NULL,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL
    );
  `);
  await q(`
    CREATE INDEX IF NOT EXISTS "idx_admin_activity_created_at"
    ON "admin_activity" ("created_at" DESC);
  `);

  const [[{ count }]] = await q(`SELECT COUNT(*)::int AS count FROM "admin_users";`);
  if (count === 0 && process.env.ADMIN_OWNER_EMAIL && process.env.ADMIN_OWNER_PASSWORD) {
    const passwordHash = await bcrypt.hash(process.env.ADMIN_OWNER_PASSWORD, 10);
    await q(
      `
      INSERT INTO "admin_users" ("id", "email", "password_hash", "name", "role", "created_at", "updated_at")
      VALUES (:id, :email, :passwordHash, :name, 'owner', NOW(), NOW());
      `,
      {
        replacements: {
          id: crypto.randomUUID(),
          email: process.env.ADMIN_OWNER_EMAIL.trim().toLowerCase(),
          passwordHash,
          name: process.env.ADMIN_OWNER_NAME || "Владелец",
        },
      },
    );
    console.log(`✅ Создан владелец админки: ${process.env.ADMIN_OWNER_EMAIL}`);
  } else if (count === 0) {
    console.warn(
      "⚠️  admin_users пуста и ADMIN_OWNER_EMAIL/ADMIN_OWNER_PASSWORD не заданы — " +
        "войти в админку будет некому, пока кто-то не создаст первого owner'а вручную.",
    );
  }
}

async function down({ context: sequelize }) {
  await sequelize.query(`DROP TABLE IF EXISTS "admin_activity";`);
  await sequelize.query(`DROP TABLE IF EXISTS "admin_invites";`);
  await sequelize.query(`DROP TABLE IF EXISTS "admin_users";`);
  await sequelize.query(`DROP TYPE IF EXISTS "public"."enum_admin_role";`);
}

module.exports = { up, down };
