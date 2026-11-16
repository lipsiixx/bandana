const { Markup } = require("telegraf");

module.exports = (bot) => {
  bot.start(async (ctx) => {
    await ctx.reply(
      `Привет, ${ctx.from.first_name || "друг"}!`,
      Markup.keyboard([
        ["events", "gallery", "video"],
        ["team", "reviews", "masterclasses"],
        ["password"],
      ]).resize(),
    );
  });

  bot.command("menu", (ctx) => {
    return ctx.reply(
      "Меню",
      Markup.keyboard([
        ["events", "gallery", "video"],
        ["team", "reviews", "masterclasses"],
        ["password"],
      ]).resize(),
    );
  });
};
