const { showMenu } = require("../helpers/menu");

module.exports = (bot) => {
  bot.command("masterclasses", (ctx) =>
    showMenu(ctx, 4, "🎓 Управление мастер-классами:"),
  );
  bot.hears("masterclasses", (ctx) =>
    showMenu(ctx, 4, "🎓 Управление мастер-классами:"),
  );
};
