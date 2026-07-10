const { Scenes } = require("telegraf");
const MasterClasses = require("../../../models/master_classes");

const createMasterClassScene = new Scenes.WizardScene(
  "create_master_class",

  // Шаг 1 - Название
  async (ctx) => {
    ctx.wizard.state.data = {};
    ctx.wizard.state.sentMessages = [];

    const msg = await ctx.reply("✏️ Введите название мастер-класса:");
    ctx.wizard.state.sentMessages.push(msg.message_id);
    return ctx.wizard.next();
  },

  // Шаг 2 - Ссылка
  async (ctx) => {
    const name = ctx.message?.text?.trim();

    if (!name || name.length < 2) {
      const msg = await ctx.reply(
        "❌ Название слишком короткое. Введите заново:",
      );
      ctx.wizard.state.sentMessages.push(msg.message_id);
      return;
    }

    ctx.wizard.state.data.name = name;

    const msg = await ctx.reply(
      "🔗 Введите ссылку (например, на Яндекс.Диск или регистрацию):",
    );
    ctx.wizard.state.sentMessages.push(msg.message_id);
    return ctx.wizard.next();
  },

  // Шаг 3 - Дата
  async (ctx) => {
    const link = ctx.message?.text?.trim();

    if (!link) {
      const msg = await ctx.reply("❌ Ссылка обязательна. Введите заново:");
      ctx.wizard.state.sentMessages.push(msg.message_id);
      return;
    }

    ctx.wizard.state.data.link = link;

    const msg = await ctx.reply(
      "📅 Введите дату проведения (в формате ГГГГ-ММ-ДД)\nИли отправьте /skip, если дата не нужна:",
    );
    ctx.wizard.state.sentMessages.push(msg.message_id);
    return ctx.wizard.next();
  },

  // Шаг 4 - Сохранение
  async (ctx) => {
    let eventDate = null;
    const text = ctx.message?.text?.trim();

    if (text && text.toLowerCase() !== "/skip") {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(text)) {
        const msg = await ctx.reply(
          "❌ Неверный формат даты. Используйте ГГГГ-ММ-ДД:",
        );
        ctx.wizard.state.sentMessages.push(msg.message_id);
        return;
      }
      eventDate = text;
    }

    try {
      await MasterClasses.create({
        name: ctx.wizard.state.data.name,
        link: ctx.wizard.state.data.link,
        event_date: eventDate,
        is_archived: false,
      });

      await ctx.reply("✅ Мастер-класс успешно создан!");
    } catch (err) {
      console.error(err);
      await ctx.reply("❌ Ошибка при создании мастер-класса.");
    }

    // Очищаем сообщения
    for (const id of ctx.wizard.state.sentMessages) {
      try {
        await ctx.deleteMessage(id);
      } catch (e) {}
    }
    return ctx.scene.leave();
  },
);

module.exports = createMasterClassScene;
