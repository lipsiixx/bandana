const { Scenes, Markup } = require("telegraf");
const Events = require("../../../models/events");
const { savePhoto } = require("../../helpers/telegram");
const fs = require("fs");
const path = require("path");

const uploadDir = path.join(__dirname, "../../../uploads");

function escapeMarkdown(text) {
  if (!text) return text;
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

const updateEventScene = new Scenes.WizardScene(
  "update_event",

  // Шаг 0 — загружаем события и показываем слайдер
  async (ctx) => {
    ctx.wizard.state.sentMessages = [];
    ctx.wizard.state.fieldToEdit = null;

    const events = await Events.findAll();
    if (!events?.length) {
      await ctx.reply("Событий пока нет");
      return ctx.scene.leave();
    }

    ctx.wizard.state.events = events;
    ctx.wizard.state.currentIndex = 0;

    await showEventSlide(ctx);
    return ctx.wizard.next();
  },

  // Шаг 1 — слайдер: листаем, выбираем поле для редактирования
  async (ctx) => {
    if (!ctx.callbackQuery) return;
    const data = ctx.callbackQuery.data;
    const events = ctx.wizard.state.events;
    let idx = ctx.wizard.state.currentIndex;

    try {
      await ctx.answerCbQuery();
    } catch {}

    // Листание
    if (data === "prev" || data === "next") {
      idx =
        data === "prev"
          ? (idx - 1 + events.length) % events.length
          : (idx + 1) % events.length;

      ctx.wizard.state.currentIndex = idx;
      await showEventSlide(ctx);
      return;
    }

    // Показать меню редактирования
    if (data === "edit") {
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback("📷 Фото", "field_photo")],
        [Markup.button.callback("📝 Описание", "field_description")],
        [Markup.button.callback("📅 Дата", "field_date")],
        [Markup.button.callback("📍 Место", "field_place")],
        [Markup.button.callback("⬅️ Назад", "back_to_slider")],
      ]);

      try {
        await ctx.editMessageReplyMarkup(keyboard.reply_markup);
      } catch {}
      return;
    }

    // Вернуться к слайдеру из меню редактирования
    if (data === "back_to_slider") {
      await showEventSlide(ctx);
      return;
    }

    // Выбор поля для редактирования
    if (data.startsWith("field_")) {
      ctx.wizard.state.fieldToEdit = data.replace("field_", "");
      ctx.session.editEventId = events[idx].id;

      const field = ctx.wizard.state.fieldToEdit;
      const prompts = {
        photo: "📷 Пришли новое фото события:",
        description: "📝 Напиши новое описание:",
        date: "📅 Напиши новую дату (например: 25.06.2025):",
        place: "📍 Напиши новое место:",
      };

      const msg = await ctx.reply(
        prompts[field] || "Введи новое значение:",
        Markup.inlineKeyboard([
          [Markup.button.callback("⬅️ Отмена", "cancel_edit")],
        ]),
      );
      ctx.wizard.state.sentMessages.push(msg.message_id);

      return ctx.wizard.next();
    }

    // Выйти из сцены
    if (data === "stop") {
      await clearAllMessages(ctx);
      return ctx.scene.leave();
    }
  },

  // Шаг 2 — получаем новое значение поля
  async (ctx) => {
    // Отмена редактирования — возвращаемся к слайдеру
    if (ctx.callbackQuery?.data === "cancel_edit") {
      try {
        await ctx.answerCbQuery();
      } catch {}

      // Удаляем сообщение с промптом
      for (const id of ctx.wizard.state.sentMessages) {
        try {
          await ctx.deleteMessage(id);
        } catch {}
      }
      ctx.wizard.state.sentMessages = [];

      ctx.wizard.state.fieldToEdit = null;
      delete ctx.session.editEventId;

      await showEventSlide(ctx);
      return ctx.wizard.selectStep(1);
    }

    const field = ctx.wizard.state.fieldToEdit;
    const eventId = ctx.session.editEventId;

    if (!field || !eventId) {
      await showEventSlide(ctx);
      return ctx.wizard.selectStep(1);
    }

    let newData = {};
    let successMessage = "";

    try {
      if (field === "photo") {
        if (!ctx.message?.photo?.length) {
          await ctx.reply("Пожалуйста, пришли фото");
          return;
        }

        const photo = ctx.message.photo.pop();
        const fileData = await savePhoto(ctx, photo.file_id);

        // Удаляем старый файл
        const old = await Events.findByPk(eventId);
        if (old?.fileName) {
          const oldPath = path.join(uploadDir, old.fileName);
          if (fs.existsSync(oldPath)) {
            try {
              fs.unlinkSync(oldPath);
            } catch {}
          }
        }

        newData = {
          fileName: fileData.fileName,
          photoFileId: photo.file_id,
          fileUrl: `/uploads/${fileData.fileName}`,
        };
        successMessage = "Фото успешно обновлено!";
      } else {
        if (!ctx.message?.text?.trim()) {
          await ctx.reply("Пожалуйста, пришли текст");
          return;
        }

        const text = ctx.message.text.trim();

        // Дата сохраняется в поле event_date
        if (field === "date") {
          newData = { event_date: text };
        } else {
          newData = { [field]: text };
        }

        const names = {
          description: "Описание",
          date: "Дата",
          place: "Место",
        };
        successMessage = `${names[field] || field} обновлено!`;
      }

      await Events.update(newData, { where: { id: eventId } });

      // Обновляем в локальном массиве
      const fresh = await Events.findByPk(eventId);
      if (fresh) {
        const i = ctx.wizard.state.events.findIndex((e) => e.id === eventId);
        if (i !== -1) ctx.wizard.state.events[i] = fresh;
      }

      // Удаляем входящее сообщение пользователя
      try {
        await ctx.deleteMessage(ctx.message.message_id);
      } catch {}

      // Удаляем сообщение с промптом
      for (const id of ctx.wizard.state.sentMessages) {
        try {
          await ctx.deleteMessage(id);
        } catch {}
      }
      ctx.wizard.state.sentMessages = [];

      await ctx.reply(`✅ ${successMessage}`);
    } catch (err) {
      console.error("Ошибка обновления события:", err);
      await ctx.reply("❌ Произошла ошибка при сохранении");
    }

    ctx.wizard.state.fieldToEdit = null;
    delete ctx.session.editEventId;

    await showEventSlide(ctx);
    return ctx.wizard.selectStep(1);
  },
);

async function showEventSlide(ctx) {
  await clearAllMessages(ctx);

  const idx = ctx.wizard.state.currentIndex;
  const event = ctx.wizard.state.events[idx];
  const total = ctx.wizard.state.events.length;

  const description = escapeMarkdown(event.description) || "_не указано_";
  const date =
    escapeMarkdown(event.event_date ? String(event.event_date) : null) ||
    "_не указано_";
  const place = escapeMarkdown(event.place) || "_не указано_";

  const caption =
    `*Событие ${idx + 1} из ${total}*\n\n` +
    `📝 *Описание:* ${description}\n` +
    `📅 *Дата:* ${date}\n` +
    `📍 *Место:* ${place}`;

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback("⬅️", "prev"),
      Markup.button.callback("✏️ Изменить", "edit"),
      Markup.button.callback("➡️", "next"),
    ],
    [Markup.button.callback("⛔ Выйти", "stop")],
  ]);

  let msg;
  try {
    if (event.fileName) {
      const filePath = path.join(uploadDir, event.fileName);
      if (fs.existsSync(filePath)) {
        msg = await ctx.replyWithPhoto(
          { source: filePath },
          { caption, parse_mode: "Markdown", ...keyboard },
        );
      } else {
        msg = await ctx.reply(caption + "\n\n📷 _Файл не найден_", {
          parse_mode: "Markdown",
          ...keyboard,
        });
      }
    } else {
      msg = await ctx.reply(caption + "\n\n📷 _Фото не загружено_", {
        parse_mode: "Markdown",
        ...keyboard,
      });
    }
  } catch (error) {
    console.error("Ошибка отправки слайда:", error);
    msg = await ctx.reply(
      `Событие ${idx + 1}/${total}\n${event.description || "—"}\n${event.event_date || "—"}\n${event.place || "—"}`,
      keyboard,
    );
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

module.exports = updateEventScene;
