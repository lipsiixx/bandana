module.exports = (bot) => {
  bot.command("reviews", async (ctx) => {
    await ctx.scene.enter("review_moderation");
  });

  bot.hears("reviews", async (ctx) => {
    await ctx.scene.enter("review_moderation");
  });
};
