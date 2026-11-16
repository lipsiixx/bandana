const { Umzug, SequelizeStorage } = require("umzug");
const sequelize = require("./config/db");

// Переиспользуем единственный экземпляр Sequelize (config/db.js) — та же БД,
// те же креды из .env, что и у остального приложения.
const umzug = new Umzug({
  migrations: {
    glob: "migrations/*.js",
  },
  context: sequelize,
  storage: new SequelizeStorage({ sequelize, tableName: "SequelizeMeta" }),
  logger: console,
});

/**
 * Применяет все непримененные миграции из ./migrations по порядку.
 * Идемпотентна: если новых миграций нет — просто ничего не делает.
 */
async function runMigrations() {
  const applied = await umzug.up();
  return applied;
}

module.exports = { umzug, runMigrations };

// Прямой запуск: `node migrate.js` / `npm run migrate`
if (require.main === module) {
  runMigrations()
    .then((applied) => {
      if (applied.length === 0) {
        console.log("✅ Миграции не требуются — схема уже актуальна");
      } else {
        console.log(
          `✅ Применены миграции: ${applied.map((m) => m.name).join(", ")}`,
        );
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Ошибка применения миграций:", err);
      process.exit(1);
    });
}
