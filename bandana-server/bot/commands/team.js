const { showMenu } = require("../helpers/menu");

module.exports = (bot) => {
  bot.command("team", (ctx) => showMenu(ctx, 3, "👥 Управление командой:"));
  bot.hears("team", (ctx) => showMenu(ctx, 3, "👥 Управление командой:"));
};
