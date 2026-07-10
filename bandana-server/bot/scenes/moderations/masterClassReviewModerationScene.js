const { Scenes, Markup } = require("telegraf");
const Review = require("../../../models/review");
const { Op } = require("sequelize");
const axios = require("axios");

function escapeMarkdown(text) {
  if (!text) return text;
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

function formatRating(rating) {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

async function clearMessages(ctx) {
  const sessionKey = `review_moderation_${ctx.from.id}`;
  const ids = ctx.session[sessionKey]?.sentMessages || [];
  for (const id of ids) {
    try {
      await ctx.deleteMessage(id);
    } catch (e) {}
  }
  if (ctx.session[sessionKey]) {
    ctx.session[sessionKey].sentMessages = [];
  }
}

async function clearCurrent(ctx) {
  const sessionKey = `review_moderation_${ctx.from.id}`;
  if (ctx.session[sessionKey]?.currentMessageId) {
    try {
      await ctx.deleteMessage(ctx.session[sessionKey].currentMessageId);
    } catch (e) {}
    if (ctx.session[sessionKey]) {
      ctx.session[sessionKey].currentMessageId = null;
    }
  }
}

// Функция для отправки уведомления пользователю через API
async function notifyUserViaAPI(cookieId, message, type) {
  try {
    const API_URL = process.env.PUBLIC_URL || "http://localhost:5000";
    await axios.post(`${API_URL}/api/notify-user`, {
      cookie_id: cookieId,
      message: message,
      type: type,
    });
    console.log(`[NOTIFY] Sent to API: ${type} for cookie ${cookieId}`);
  } catch (err) {
    console.error("[NOTIFY] API error:", err.message);
  }
}

async function showReview(ctx) {
  const sessionKey = `review_moderation_${ctx.from.id}`;
  const sessionData = ctx.session[sessionKey];

  if (!sessionData) {
    console.log("No session data in showReview");
    return ctx.scene.leave();
  }

  const idx = sessionData.currentIndex;
  const reviews = sessionData.reviews;

  if (!reviews || reviews.length === 0) {
    await ctx.reply("✅ Нет отзывов на модерации");
    delete ctx.session[sessionKey];
    await clearMessages(ctx);
    return ctx.scene.leave();
  }

  const review = reviews[idx];
  if (!review) {
    await ctx.reply("❌ Ошибка: отзыв не найден");
    delete ctx.session[sessionKey];
    await clearMessages(ctx);
    return ctx.scene.leave();
  }

  const total = reviews.length;

  let masterClassName = review.master_class_name || "Мастер-класс не найден";
  let masterClassDate = review.master_class_date || "Дата не указана";

  if (masterClassDate && masterClassDate !== "Дата не указана") {
    try {
      masterClassDate = new Date(masterClassDate).toLocaleDateString("ru-RU");
    } catch (e) {
      masterClassDate = "Дата не указана";
    }
  }

  const stars = formatRating(review.rating);
  const text = `*📝 Отзыв ${idx + 1} из ${total}*

👤 *Автор:* ${escapeMarkdown(review.author_name)}
⭐ *Оценка:* ${stars} (${review.rating}/5)
🎓 *Мастер-класс:* ${escapeMarkdown(masterClassName)}
📅 *Дата МК:* ${masterClassDate}
💬 *Текст:* 
${escapeMarkdown(review.content)}

🕐 *Отправлен:* ${new Date(review.submitted_at).toLocaleString("ru-RU")}
${review.cookie_id ? `🍪 *Cookie ID:* ${review.cookie_id.substring(0, 8)}...` : ""}
${review.ip_address ? `🌐 *IP:* ${review.ip_address}` : ""}`;

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback("◀️ Пред.", "prev"),
      Markup.button.callback("✅ Одобрить", "approve"),
      Markup.button.callback("❌ Отклонить", "reject"),
      Markup.button.callback("След. ▶️", "next"),
    ],
    [
      Markup.button.callback("🔨 Заблокировать", "block"),
      Markup.button.callback("🔄 Обновить", "refresh"),
    ],
  ]);

  await clearCurrent(ctx);
  const msg = await ctx.reply(text, { parse_mode: "Markdown", ...keyboard });

  if (!ctx.session[sessionKey]) {
    ctx.session[sessionKey] = {};
  }
  ctx.session[sessionKey].currentMessageId = msg.message_id;
  if (!ctx.session[sessionKey].sentMessages) {
    ctx.session[sessionKey].sentMessages = [];
  }
  ctx.session[sessionKey].sentMessages.push(msg.message_id);

  console.log("Review shown, session preserved");
}

const reviewModerationScene = new Scenes.WizardScene(
  "review_moderation",

  // Шаг 0 - вход в сцену
  async (ctx) => {
    console.log("=== ENTERING MODERATION SCENE ===");
    const userId = ctx.from.id;
    const sessionKey = `review_moderation_${userId}`;

    if (ctx.session[sessionKey] && ctx.session[sessionKey].active) {
      await ctx.reply("⚠️ У вас уже открыта модерация. Завершите её.");
      return ctx.scene.leave();
    }

    ctx.session[sessionKey] = {
      active: true,
      sentMessages: [],
      userId: userId,
      reviews: [],
      currentIndex: 0,
      currentMessageId: null,
    };

    const pending = await Review.findAll({
      where: { status: "pending" },
      order: [["submitted_at", "ASC"]],
    });

    console.log(`Found pending reviews: ${pending.length}`);

    if (pending.length === 0) {
      const msg = await ctx.reply("✅ Нет отзывов на модерации");
      ctx.session[sessionKey].sentMessages.push(msg.message_id);
      setTimeout(async () => {
        await clearMessages(ctx);
        delete ctx.session[sessionKey];
        ctx.scene.leave();
      }, 2000);
      return;
    }

    ctx.session[sessionKey].reviews = pending;
    ctx.session[sessionKey].currentIndex = 0;
    await showReview(ctx);
    return ctx.wizard.next();
  },

  // Шаг 1 - обработка действий
  async (ctx) => {
    console.log("=== STEP 1 - Processing action ===");

    const sessionKey = `review_moderation_${ctx.from.id}`;
    const sessionData = ctx.session[sessionKey];

    if (!sessionData || !sessionData.active) {
      console.log("ERROR: session data is missing!");
      await ctx.reply("❌ Ошибка сессии. Пожалуйста, начните заново: /reviews");
      return ctx.scene.leave();
    }

    if (!ctx.callbackQuery) {
      if (ctx.message?.text) {
        await ctx.reply("⚠️ Используйте кнопки для управления модерацией");
        await showReview(ctx);
      }
      return;
    }

    const action = ctx.callbackQuery.data;
    console.log("Action:", action);

    try {
      await ctx.answerCbQuery();
    } catch (e) {}

    let idx = sessionData.currentIndex;
    let reviews = sessionData.reviews;

    if (!reviews || reviews.length === 0) {
      console.log("Reviews array is empty!");
      await ctx.reply("❌ Список отзывов пуст");
      delete ctx.session[sessionKey];
      await clearMessages(ctx);
      return ctx.scene.leave();
    }

    if (idx === undefined || idx === null || idx >= reviews.length) {
      idx = 0;
      sessionData.currentIndex = 0;
    }

    const currentReview = reviews[idx];
    if (!currentReview) {
      console.log("Current review not found!");
      await ctx.reply("❌ Отзыв не найден");
      return ctx.scene.leave();
    }

    // Навигация
    if (action === "prev") {
      sessionData.currentIndex = idx > 0 ? idx - 1 : reviews.length - 1;
      await clearCurrent(ctx);
      return showReview(ctx);
    }

    if (action === "next") {
      sessionData.currentIndex = idx < reviews.length - 1 ? idx + 1 : 0;
      await clearCurrent(ctx);
      return showReview(ctx);
    }

    if (action === "refresh") {
      await clearCurrent(ctx);
      const newReviews = await Review.findAll({
        where: { status: "pending" },
        order: [["submitted_at", "ASC"]],
      });
      if (newReviews.length === 0) {
        await ctx.reply("✅ Нет отзывов на модерации");
        delete ctx.session[sessionKey];
        await clearMessages(ctx);
        return ctx.scene.leave();
      }
      sessionData.reviews = newReviews;
      sessionData.currentIndex = 0;
      return showReview(ctx);
    }

    // Одобрение
    if (action === "approve") {
      await currentReview.update({
        status: "approved",
        reviewed_at: new Date(),
      });

      const approvalMessage = `✅ *Ваш отзыв одобрен!*\n\n🎓 Мастер-класс: ${currentReview.master_class_name}\n⭐ Оценка: ${currentReview.rating}/5\n📝 Текст: ${currentReview.content.substring(0, 100)}${currentReview.content.length > 100 ? "..." : ""}\n\nСпасибо за ваш отзыв!`;

      await notifyUserViaAPI(
        currentReview.cookie_id,
        approvalMessage,
        "approved",
      );

      await ctx.reply(
        `✅ Отзыв одобрен!\n👤 Автор: ${currentReview.author_name}`,
      );
      reviews.splice(idx, 1);

      if (reviews.length === 0) {
        await ctx.reply("🎉 Все отзывы обработаны!");
        delete ctx.session[sessionKey];
        await clearMessages(ctx);
        return ctx.scene.leave();
      }
      sessionData.currentIndex =
        idx >= reviews.length ? reviews.length - 1 : idx;
      await showReview(ctx);
      return;
    }

    // Отклонение
    if (action === "reject") {
      sessionData.reviewId = currentReview.id;
      sessionData.reviewAuthor = currentReview.author_name;
      sessionData.reviewData = currentReview;
      const msg = await ctx.reply(
        `❌ *ОТКЛОНЕНИЕ ОТЗЫВА*\n\nАвтор: ${currentReview.author_name}\n\n` +
          `Напишите причину отклонения (или отправьте «пропустить»):`,
        { parse_mode: "Markdown" },
      );
      sessionData.sentMessages.push(msg.message_id);
      return ctx.wizard.next();
    }

    if (action === "back_to_review") {
      await showReview(ctx);
      return;
    }

    // Блокировка
    if (action === "block") {
      sessionData.reviewId = currentReview.id;
      sessionData.reviewAuthor = currentReview.author_name;
      sessionData.reviewData = currentReview;
      const msg = await ctx.reply(
        "🔨 *БЛОКИРОВКА ПОЛЬЗОВАТЕЛЯ*\n\n" +
          `👤 Автор: ${currentReview.author_name}\n` +
          `🍪 Cookie: ${currentReview.cookie_id?.substring(0, 8) || "нет"}...\n` +
          `🌐 IP: ${currentReview.ip_address || "нет"}\n\n` +
          `Напишите причину блокировки (или отправьте «стандарт»):`,
        { parse_mode: "Markdown" },
      );
      sessionData.sentMessages.push(msg.message_id);
      return ctx.wizard.selectStep(2);
    }
  },

  // Шаг 2 - обработка отклонения с уведомлением пользователя
  async (ctx) => {
    console.log("=== STEP 2 - Reject handler with notification ===");

    const sessionKey = `review_moderation_${ctx.from.id}`;
    const sessionData = ctx.session[sessionKey];

    if (!ctx.message?.text) {
      await ctx.reply("❌ Отправьте текст");
      return;
    }

    const reason = ctx.message.text.trim();
    const reviewId = sessionData.reviewId;
    const reviewAuthor = sessionData.reviewAuthor;
    const reviewData = sessionData.reviewData;

    const review = await Review.findByPk(reviewId);
    if (!review) {
      await ctx.reply("❌ Отзыв не найден");
      await clearMessages(ctx);
      delete ctx.session[sessionKey];
      return ctx.scene.leave();
    }

    const rejectReason = reason === "пропустить" ? "Не указана" : reason;
    await review.update({
      status: "rejected",
      rejection_reason: rejectReason,
      reviewed_at: new Date(),
    });

    const rejectionMessage = `❌ *Ваш отзыв отклонён*\n\n🎓 Мастер-класс: ${review.master_class_name}\n📝 Причина: ${rejectReason}\n\nВы можете оставить новый отзыв с учётом замечаний.`;

    await notifyUserViaAPI(review.cookie_id, rejectionMessage, "rejected");

    await ctx.reply(
      `❌ Отзыв отклонён!\n👤 Автор: ${reviewAuthor}\n📝 Причина: ${rejectReason}`,
    );

    const idx = sessionData.currentIndex;
    sessionData.reviews.splice(idx, 1);

    if (sessionData.reviews.length === 0) {
      await ctx.reply("🎉 Все отзывы обработаны!");
      delete ctx.session[sessionKey];
      await clearMessages(ctx);
      return ctx.scene.leave();
    }

    sessionData.currentIndex =
      idx >= sessionData.reviews.length ? sessionData.reviews.length - 1 : idx;
    await showReview(ctx);
    return ctx.wizard.selectStep(1);
  },

  // Шаг 3 - обработка блокировки с уведомлением пользователя
  async (ctx) => {
    console.log("=== STEP 3 - Block handler with notification ===");

    const sessionKey = `review_moderation_${ctx.from.id}`;
    const sessionData = ctx.session[sessionKey];

    if (!ctx.message?.text) {
      await ctx.reply("❌ Отправьте текст");
      return;
    }

    const reason = ctx.message.text.trim();
    const reviewId = sessionData.reviewId;
    const reviewAuthor = sessionData.reviewAuthor;
    const reviewData = sessionData.reviewData;

    const review = await Review.findByPk(reviewId);
    if (!review) {
      await ctx.reply("❌ Отзыв не найден");
      delete ctx.session[sessionKey];
      await clearMessages(ctx);
      return ctx.scene.leave();
    }

    const blockReason =
      reason === "стандарт" ? "Нарушение правил сообщества" : reason;

    // Блокируем все отзывы пользователя по cookie и IP
    const [blockedCount] = await Review.update(
      {
        is_blocked: true,
        blocked_at: new Date(),
        blocked_reason: blockReason,
        status: "blocked",
      },
      {
        where: {
          [Op.or]: [
            ...(review.cookie_id ? [{ cookie_id: review.cookie_id }] : []),
            ...(review.ip_address ? [{ ip_address: review.ip_address }] : []),
          ],
        },
      },
    );

    const blockMessage = `🔨 *ВЫ ЗАБЛОКИРОВАНЫ!*\n\n📝 Причина: ${blockReason}\n⏰ Срок: 60 дней\n\nЕсли вы считаете это ошибкой, свяжитесь с администратором.`;

    await notifyUserViaAPI(review.cookie_id, blockMessage, "blocked");

    await ctx.reply(
      `🔨 *ПОЛЬЗОВАТЕЛЬ ЗАБЛОКИРОВАН!*\n👤 Автор: ${reviewAuthor}\n📝 Причина: ${blockReason}\n📊 Заблокировано отзывов: ${blockedCount}`,
      { parse_mode: "Markdown" },
    );

    const idx = sessionData.currentIndex;
    sessionData.reviews.splice(idx, 1);

    if (sessionData.reviews.length === 0) {
      await ctx.reply("🎉 Все отзывы обработаны!");
      delete ctx.session[sessionKey];
      await clearMessages(ctx);
      return ctx.scene.leave();
    }

    sessionData.currentIndex =
      idx >= sessionData.reviews.length ? sessionData.reviews.length - 1 : idx;
    await showReview(ctx);
    return ctx.wizard.selectStep(1);
  },
);

reviewModerationScene.leave(async (ctx) => {
  console.log("=== LEAVING MODERATION SCENE ===");
  const sessionKey = `review_moderation_${ctx.from.id}`;
  delete ctx.session[sessionKey];
  await clearMessages(ctx);
});

module.exports = reviewModerationScene;
