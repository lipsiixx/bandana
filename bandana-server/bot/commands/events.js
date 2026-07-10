const { showMenu } = require("../helpers/menu");

module.exports = (bot) => {
  bot.command("events", (ctx) => showMenu(ctx, 0, "📅 Управление событиями:"));
  bot.hears("events", (ctx) => showMenu(ctx, 0, "📅 Управление событиями:"));
};
