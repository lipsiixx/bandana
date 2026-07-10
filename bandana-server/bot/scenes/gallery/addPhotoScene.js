const { Scenes, Markup } = require("telegraf");
const Gallery = require("../../../models/gallery");
const {
  savePhoto,
  validate,
  clearMessages,
} = require("../../helpers/telegram");
const {
  validateGalleryFilter,
  validateGalleryFooter,
} = require("../../helpers/validators");

const CANCEL_KB = Markup.inlineKeyboard([
  [Markup.button.callback("⛔ Отмена", "stop")],
]);

const addPhotoScene = new Scenes.WizardScene(
  "add_photo",

  // 0 - старт
  async (ctx) => {
    ctx.wizard.state.data = {};
    ctx.wizard.state.sentMessages = [];
    const msg = await ctx.reply("📸 Пришли фото для галереи:", CANCEL_KB);
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
        "✅ Фото принято!\n\n🎨 Введи название фильтра:\n\nПример: «summer», «retro», «black&white»",
      ...CANCEL_KB,
    });
    ctx.wizard.state.sentMessages.push(msg.message_id);
    return ctx.wizard.next();
  },

  // 2 - фильтр
  async (ctx) => {
    if (ctx.callbackQuery?.data === "stop") {
      try {
        await ctx.answerCbQuery();
      } catch {}
      await clearMessages(ctx);
      return ctx.scene.leave();
    }

    const valid = await validate(ctx, "❌ Введи фильтр текстом!", "text");
    if (!valid) return;

    const check = validateGalleryFilter(ctx.message.text);
    if (!check.ok) {
      try {
        await ctx.deleteMessage(ctx.message.message_id);
      } catch {}
      const msg = await ctx.reply(check.message, CANCEL_KB);
      ctx.wizard.state.sentMessages.push(msg.message_id);
      return;
    }

    ctx.wizard.state.data.filter = ctx.message.text.trim();
    try {
      await ctx.deleteMessage(ctx.message.message_id);
    } catch {}
    await clearMessages(ctx);

    const msg = await ctx.reply(
      "✅ Фильтр принят!\n\n💬 Введи подпись под фото:\n\nПример: «Фестиваль Break Dance 2025, финальный день»",
      CANCEL_KB,
    );
    ctx.wizard.state.sentMessages.push(msg.message_id);
    return ctx.wizard.next();
  },

  // 3 - подпись и сохранение
  async (ctx) => {
    if (ctx.callbackQuery?.data === "stop") {
      try {
        await ctx.answerCbQuery();
      } catch {}
      await clearMessages(ctx);
      return ctx.scene.leave();
    }

    const valid = await validate(ctx, "❌ Введи подпись текстом!", "text");
    if (!valid) return;

    const check = validateGalleryFooter(ctx.message.text);
    if (!check.ok) {
      try {
        await ctx.deleteMessage(ctx.message.message_id);
      } catch {}
      const msg = await ctx.reply(check.message, CANCEL_KB);
      ctx.wizard.state.sentMessages.push(msg.message_id);
      return;
    }

    ctx.wizard.state.data.footer = ctx.message.text.trim();
    try {
      await ctx.deleteMessage(ctx.message.message_id);
    } catch {}
    await clearMessages(ctx);

    try {
      const fileData = await savePhoto(ctx, ctx.wizard.state.data.photoFileId);

      await Gallery.create({
        fileName: fileData.fileName,
        fileUrl: `/uploads/${fileData.fileName}`,
        filter: ctx.wizard.state.data.filter,
        footer: ctx.wizard.state.data.footer,
      });

      await ctx.replyWithPhoto(
        { source: fileData.fileUrl },
        {
          caption:
            `✅ Фото добавлено в галерею!\n\n` +
            `🎨 Фильтр: ${ctx.wizard.state.data.filter}\n` +
            `💬 Подпись: ${ctx.wizard.state.data.footer}`,
        },
      );
    } catch (err) {
      console.error("Gallery save error:", err);
      await ctx.reply("❌ Ошибка при добавлении фото.");
    }

    return ctx.scene.leave();
  },
);

module.exports = addPhotoScene;
