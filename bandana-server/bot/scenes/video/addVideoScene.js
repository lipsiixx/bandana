const { Scenes, Markup } = require("telegraf");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const Video = require("../../../models/video");
const {
  clearMessages,
  getYandexDirectLink,
} = require("../../helpers/telegram");
const {
  validateVideoUrl,
  validateVideoName,
} = require("../../helpers/validators");

const uploadDir = path.join(__dirname, "../../../uploads");

async function saveVideoFromUrl(url) {
  try {
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const fileName = Date.now() + ".mp4";
    const filePath = path.join(uploadDir, fileName);
    const writer = fs.createWriteStream(filePath);
    const response = await axios({
      url,
      method: "GET",
      responseType: "stream",
    });
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
      writer.on("finish", () => resolve({ fileName, filePath }));
      writer.on("error", reject);
    });
  } catch (err) {
    console.error("Ошибка при скачивании видео:", err);
    return null;
  }
}

const CANCEL_KB = Markup.inlineKeyboard([
  [Markup.button.callback("⛔ Отмена", "stop")],
]);

const addVideoScene = new Scenes.WizardScene(
  "add_video",

  // 0 - ссылка
  async (ctx) => {
    ctx.wizard.state.data = {};
    ctx.wizard.state.sentMessages = [];
    const msg = await ctx.reply(
      "🎬 Пришли публичную ссылку на видео с Яндекс.Диска:\n\nПример: «https://disk.yandex.ru/i/abcdef123»",
      CANCEL_KB,
    );
    ctx.wizard.state.sentMessages.push(msg.message_id);
    return ctx.wizard.next();
  },

  // 1 - проверяем ссылку, просим название
  async (ctx) => {
    if (ctx.callbackQuery?.data === "stop") {
      try {
        await ctx.answerCbQuery();
      } catch {}
      await clearMessages(ctx);
      return ctx.scene.leave();
    }

    if (!ctx.message?.text) {
      const msg = await ctx.reply("❌ Отправь ссылку текстом!", CANCEL_KB);
      ctx.wizard.state.sentMessages.push(msg.message_id);
      return;
    }

    const check = validateVideoUrl(ctx.message.text);
    if (!check.ok) {
      try {
        await ctx.deleteMessage(ctx.message.message_id);
      } catch {}
      const msg = await ctx.reply(check.message, CANCEL_KB);
      ctx.wizard.state.sentMessages.push(msg.message_id);
      return;
    }

    ctx.wizard.state.data.publicUrl = ctx.message.text.trim();
    try {
      await ctx.deleteMessage(ctx.message.message_id);
    } catch {}
    await clearMessages(ctx);

    const msg = await ctx.reply(
      "✅ Ссылка принята!\n\n📝 Введи название видео:\n\nПример: «Выступление на фестивале Лето 2025»",
      CANCEL_KB,
    );
    ctx.wizard.state.sentMessages.push(msg.message_id);
    return ctx.wizard.next();
  },

  // 2 - название и сохранение
  async (ctx) => {
    if (ctx.callbackQuery?.data === "stop") {
      try {
        await ctx.answerCbQuery();
      } catch {}
      await clearMessages(ctx);
      return ctx.scene.leave();
    }

    if (!ctx.message?.text) {
      const msg = await ctx.reply("❌ Введи название текстом!", CANCEL_KB);
      ctx.wizard.state.sentMessages.push(msg.message_id);
      return;
    }

    const check = validateVideoName(ctx.message.text);
    if (!check.ok) {
      try {
        await ctx.deleteMessage(ctx.message.message_id);
      } catch {}
      const msg = await ctx.reply(check.message, CANCEL_KB);
      ctx.wizard.state.sentMessages.push(msg.message_id);
      return;
    }

    ctx.wizard.state.data.name = ctx.message.text.trim();
    try {
      await ctx.deleteMessage(ctx.message.message_id);
    } catch {}
    await clearMessages(ctx);

    const loadingMsg = await ctx.reply("⏳ Скачиваю видео, подожди...");

    try {
      const directUrl = await getYandexDirectLink(
        ctx.wizard.state.data.publicUrl,
      );
      if (!directUrl) throw new Error("Не удалось получить прямую ссылку");

      const saved = await saveVideoFromUrl(directUrl);
      if (!saved) throw new Error("Не удалось скачать видео");

      await Video.create({
        fileName: saved.fileName,
        fileUrl: `/uploads/${saved.fileName}`,
        name: ctx.wizard.state.data.name,
      });

      try {
        await ctx.deleteMessage(loadingMsg.message_id);
      } catch {}
      await ctx.reply(
        `✅ Видео «${ctx.wizard.state.data.name}» успешно добавлено!`,
      );
    } catch (err) {
      console.error("Ошибка при добавлении видео:", err);
      try {
        await ctx.deleteMessage(loadingMsg.message_id);
      } catch {}
      await ctx.reply(
        "❌ Ошибка при добавлении видео. Проверь ссылку и попробуй снова.",
      );
    }

    return ctx.scene.leave();
  },
);

module.exports = addVideoScene;
