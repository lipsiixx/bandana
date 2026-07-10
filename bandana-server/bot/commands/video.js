const { showMenu } = require("../helpers/menu");

module.exports = (bot) => {
  bot.command("video", (ctx) => showMenu(ctx, 2, "🎥 Управление видео:"));
  bot.hears("video", (ctx) => showMenu(ctx, 2, "🎥 Управление видео:"));
};
