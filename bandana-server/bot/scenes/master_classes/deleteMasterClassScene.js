const { Scenes, Markup } = require("telegraf");
const MasterClasses = require("../../../models/master_classes");

const deleteMasterClassScene = new Scenes.WizardScene(
  "delete_master_class",

  // Шаг 1 - Выбор мастер-класса для удаления
  async (ctx) => {
    const masterClasses = await MasterClasses.findAll({
      order: [["created_at", "DESC"]],
    });

    if (masterClasses.length === 0) {
      await ctx.reply("❌ Нет мастер-классов для удаления.");
      return ctx.scene.leave();
    }

    const buttons = masterClasses.map((mc) => [
      Markup.button.callback(`🗑 ${mc.name.substring(0, 30)}`, `del_${mc.id}`),
    ]);

    await ctx.reply("Выберите мастер-класс для **удаления**:", {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard(buttons),
    });

    return ctx.wizard.next();
  },

  // Шаг 2 - Подтверждение удаления
  async (ctx) => {
    if (!ctx.callbackQuery) return;

    const action = ctx.callbackQuery.data;
    await ctx.answerCbQuery();

    if (!action.startsWith("del_")) return;

    const id = action.replace("del_", "");
    const mc = await MasterClasses.findByPk(id);

    if (!mc) {
      await ctx.reply("❌ Мастер-класс не найден.");
      return ctx.scene.leave();
    }

    await mc.destroy();
    await ctx.reply(`✅ Мастер-класс "${mc.name}" успешно удалён.`);

    return ctx.scene.leave();
  },
);

module.exports = deleteMasterClassScene;
