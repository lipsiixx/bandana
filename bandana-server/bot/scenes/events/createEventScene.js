const { Scenes } = require("telegraf");
const Events = require("../../../models/events");
const {
  savePhoto,
  validate,
  clearMessages,
} = require("../../helpers/telegram");
const { Markup } = require("telegraf");
const {
  validateDescription,
  validateEventDate,
  validatePlace,
} = require("../../helpers/validators");

const CANCEL_KB = Markup.inlineKeyboard([
  [Markup.button.callback("⛔ Отмена", "stop")],
]);

const createEventScene = new Scenes.WizardScene(
  "create_event",

  // 0 - старт
  async (ctx) => {
    ctx.wizard.state.data = {};
    ctx.wizard.state.sentMessages = [];
    const msg = await ctx.reply("📸 Пришли фото события:", CANCEL_KB);
    ctx.wizard.state.sentMessages.push(msg.message_id);
    return ctx.wizard.next();
  },

  // 1 - фото
  async (ctx) => {
    if (ctx.callbackQuery?.data === "stop") {
      try {
        await ctx.answerCbQuery();
      } catch {}
      await clearMessages(ctx);
      return ctx.scene.leave();
    }

    const valid = await validate(ctx, "❌ Отправь фото!", "photo");
    if (!valid) return;

    const photo = ctx.message.photo.pop();
    ctx.wizard.state.data.photoFileId = photo.file_id;

    await clearMessages(ctx);

    const msg = await ctx.replyWithPhoto(photo.file_id, {
      caption:
        "✅ Фото принято!\n\n📝 Теперь напиши описание события:\n\nПример: «Летний фестиваль Hip-Hop на открытой площадке»",
      ...CANCEL_KB,
    });
    ctx.wizard.state.sentMessages.push(msg.message_id);
    return ctx.wizard.next();
  },

  // 2 - описание
  async (ctx) => {
    if (ctx.callbackQuery?.data === "stop") {
      try {
        await ctx.answerCbQuery();
      } catch {}
      await clearMessages(ctx);
      return ctx.scene.leave();
    }

    const valid = await validate(ctx, "❌ Напиши описание текстом!", "text");
    if (!valid) return;

    const check = validateDescription(ctx.message.text);
    if (!check.ok) {
      try {
        await ctx.deleteMessage(ctx.message.message_id);
      } catch {}
      const msg = await ctx.reply(check.message, CANCEL_KB);
      ctx.wizard.state.sentMessages.push(msg.message_id);
      return;
    }

    ctx.wizard.state.data.description = ctx.message.text.trim();
    try {
      await ctx.deleteMessage(ctx.message.message_id);
    } catch {}
    await clearMessages(ctx);

    const msg = await ctx.reply(
      "✅ Описание принято!\n\n📅 Напиши дату события:\n\nФормат: ДД.ММ.ГГГГ\nПример: «25.06.2025»",
      CANCEL_KB,
    );
    ctx.wizard.state.sentMessages.push(msg.message_id);
    return ctx.wizard.next();
  },

  // 3 - дата
  async (ctx) => {
    if (ctx.callbackQuery?.data === "stop") {
      try {
        await ctx.answerCbQuery();
      } catch {}
      await clearMessages(ctx);
      return ctx.scene.leave();
    }

    const valid = await validate(ctx, "❌ Введи дату текстом!", "text");
    if (!valid) return;

    const check = validateEventDate(ctx.message.text);
    if (!check.ok) {
      try {
        await ctx.deleteMessage(ctx.message.message_id);
      } catch {}
      const msg = await ctx.reply(check.message, CANCEL_KB);
      ctx.wizard.state.sentMessages.push(msg.message_id);
      return;
    }

    ctx.wizard.state.data.event_date = ctx.message.text.trim();
    try {
      await ctx.deleteMessage(ctx.message.message_id);
    } catch {}
    await clearMessages(ctx);

    const msg = await ctx.reply(
      "✅ Дата принята!\n\n📍 Напиши место проведения:\n\nПример: «Москва, Парк Горького, главная сцена»",
      CANCEL_KB,
    );
    ctx.wizard.state.sentMessages.push(msg.message_id);
    return ctx.wizard.next();
  },

  // 4 - место и сохранение
  async (ctx) => {
    if (ctx.callbackQuery?.data === "stop") {
      try {
        await ctx.answerCbQuery();
      } catch {}
      await clearMessages(ctx);
      return ctx.scene.leave();
    }

    const valid = await validate(ctx, "❌ Введи место текстом!", "text");
    if (!valid) return;

    const check = validatePlace(ctx.message.text);
    if (!check.ok) {
      try {
        await ctx.deleteMessage(ctx.message.message_id);
      } catch {}
      const msg = await ctx.reply(check.message, CANCEL_KB);
      ctx.wizard.state.sentMessages.push(msg.message_id);
      return;
    }

    ctx.wizard.state.data.place = ctx.message.text.trim();
    try {
      await ctx.deleteMessage(ctx.message.message_id);
    } catch {}
    await clearMessages(ctx);

    try {
      const fileData = await savePhoto(ctx, ctx.wizard.state.data.photoFileId);

      await Events.create({
        description: ctx.wizard.state.data.description,
        event_date: ctx.wizard.state.data.event_date,
        place: ctx.wizard.state.data.place,
        photoFileId: ctx.wizard.state.data.photoFileId,
        fileName: fileData.fileName,
        fileUrl: `/uploads/${fileData.fileName}`,
      });

      await ctx.replyWithPhoto(ctx.wizard.state.data.photoFileId, {
        caption:
          `✅ Событие создано!\n\n` +
          `📝 ${ctx.wizard.state.data.description}\n` +
          `📅 ${ctx.wizard.state.data.event_date}\n` +
          `📍 ${ctx.wizard.state.data.place}`,
      });
    } catch (e) {
      console.error("Create event error:", e);
      await ctx.reply("❌ Ошибка при создании события. Попробуй позже.");
    }

    return ctx.scene.leave();
  },
);

module.exports = createEventScene;
