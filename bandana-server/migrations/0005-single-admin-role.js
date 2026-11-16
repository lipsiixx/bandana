"use strict";

/**
 * Упрощение модели доступа веб-админки: убираем роли (owner/editor/moderator) —
 * теперь все именные аккаунты равноправны ("админ"), без разделения прав.
 * См. также services/adminAccountService.js, routes/adminRouter.js.
 */

async function up({ context: sequelize }) {
  const q = (sql, options) => sequelize.query(sql, options);

  await q(`ALTER TABLE "admin_users" DROP COLUMN IF EXISTS "role";`);
  await q(`ALTER TABLE "admin_invites" DROP COLUMN IF EXISTS "role";`);
  await q(`DROP TYPE IF EXISTS "public"."enum_admin_role";`);
}

async function down({ context: sequelize }) {
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
    ALTER TABLE "admin_users"
    ADD COLUMN IF NOT EXISTS "role" "public"."enum_admin_role" NOT NULL DEFAULT 'owner';
  `);
  await q(`
    ALTER TABLE "admin_invites"
    ADD COLUMN IF NOT EXISTS "role" "public"."enum_admin_role" NOT NULL DEFAULT 'owner';
  `);
}

module.exports = { up, down };
