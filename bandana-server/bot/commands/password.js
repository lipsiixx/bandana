module.exports = (bot) => {
  bot.command("password", async (ctx) => {
    await ctx.scene.enter("change_admin_password");
  });

  bot.hears("password", async (ctx) => {
    await ctx.scene.enter("change_admin_password");
  });
};
