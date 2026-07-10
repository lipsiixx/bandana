const { Scenes, Markup } = require("telegraf");
const Events = require("../../../models/events");
const fs = require("fs");
const path = require("path");

const uploadDir = path.join(__dirname, "../../../uploads");

const deleteEventScene = new Scenes.WizardScene(
  "delete_event",

  // Шаг 0 — загружаем события
  async (ctx) => {
    ctx.wizard.state.sentMessages = [];

    const events = await Events.findAll();
    if (!events.length) {
      await ctx.reply("Нет событий для удаления.");
      return ctx.scene.leave();
    }

    ctx.wizard.state.events = events;
    ctx.wizard.state.currentIndex = 0;

    await showEventSlide(ctx);
    return ctx.wizard.next();
  },

  // Шаг 1 — обработка кнопок
  async (ctx) => {
    if (!ctx.callbackQuery) return;

    const action = ctx.callbackQuery.data;
    try {
      await ctx.answerCbQuery();
    } catch {}

    const events = ctx.wizard.state.events;
    let idx = ctx.wizard.state.currentIndex;

    if (action === "delete") {
      const ev = events[idx];

      // Удаляем файл
      if (ev.fileName) {
        const filePath = path.join(uploadDir, ev.fileName);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch {}
        }
      }

      await ev.destroy();

      events.splice(idx, 1);

      if (events.length === 0) {
        await clearAllMessages(ctx);
        await ctx.reply("🗑 Событие удалено! Больше событий нет.");
        return ctx.scene.leave();
      }

      ctx.wizard.state.currentIndex =
        idx >= events.length ? events.length - 1 : idx;
      await ctx.reply("🗑 Событие удалено!");
      return showEventSlide(ctx);
    }

    if (action === "next") {
      ctx.wizard.state.currentIndex = (idx + 1) % events.length;
      return showEventSlide(ctx);
    }

    if (action === "prev") {
      ctx.wizard.state.currentIndex = (idx - 1 + events.length) % events.length;
      return showEventSlide(ctx);
    }

    if (action === "stop") {
      await clearAllMessages(ctx);
      return ctx.scene.leave();
    }
  },
);

async function showEventSlide(ctx) {
  await clearAllMessages(ctx);

  const idx = ctx.wizard.state.currentIndex;
  const event = ctx.wizard.state.events[idx];
  const total = ctx.wizard.state.events.length;

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback("⬅️", "prev"),
      Markup.button.callback("🗑 Удалить", "delete"),
      Markup.button.callback("➡️", "next"),
    ],
    [Markup.button.callback("⛔ Завершить", "stop")],
  ]);

  const caption =
    `📝 ${event.description || "—"}\n` +
    `📅 ${event.event_date || "—"}\n` +
    `📍 ${event.place || "—"}\n\n` +
    `${idx + 1}/${total}`;

  let msg;
  if (event.fileName) {
    const filePath = path.join(uploadDir, event.fileName);
    if (fs.existsSync(filePath)) {
      msg = await ctx.replyWithPhoto(
        { source: filePath },
        { caption, ...keyboard },
      );
    } else {
      msg = await ctx.reply("📷 Файл не найден\n" + caption, keyboard);
    }
  } else {
    msg = await ctx.reply("📷 Фото нет\n" + caption, keyboard);
  }

  ctx.wizard.state.sentMessages.push(msg.message_id);
}

async function clearAllMessages(ctx) {
  for (const id of ctx.wizard.state.sentMessages || []) {
    try {
      await ctx.deleteMessage(id);
    } catch {}
  }
  ctx.wizard.state.sentMessages = [];
}

module.exports = deleteEventScene;
