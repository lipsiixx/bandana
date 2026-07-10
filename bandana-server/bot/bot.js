const { Telegraf, Scenes, session, Markup } = require("telegraf");
require("dotenv").config();

const { showMenu, handleEventCallback } = require("./helpers/menu");

const startCommand = require("./commands/start");
const eventsCommand = require("./commands/events");
const galleryCommand = require("./commands/gallery");
const teamCommand = require("./commands/team");
const reviewsCommands = require("./commands/reviews");
const masterclassesCommand = require("./commands/masterclasses");

// Сцены
const createEventScene = require("./scenes/events/createEventScene");
const updateEventScene = require("./scenes/events/updateEventScene");
const deleteEventScene = require("./scenes/events/deleteEventScene");

const addPhotoScene = require("./scenes/gallery/addPhotoScene");
const updatePhotoScene = require("./scenes/gallery/updatePhotoScene");
const deletePhotoScene = require("./scenes/gallery/deletePhotoScene");

const addVideoScene = require("./scenes/video/addVideoScene");
const updateVideoScene = require("./scenes/video/updateVideoScene");
const deleteVideoScene = require("./scenes/video/deleteVideoScene");

const addTeamScene = require("./scenes/teams/addTeamScene");
const updateTeamScene = require("./scenes/teams/updateTeamScene");
const deleteTeamScene = require("./scenes/teams/deleteTeamScene");

const createMasterClassScene = require("./scenes/master_classes/createMasterClassScene");
const updateMasterClassScene = require("./scenes/master_classes/updateMasterClassScene");
const deleteMasterClassScene = require("./scenes/master_classes/deleteMasterClassScene");

const reviewModerationScene = require("./scenes/moderations/masterClassReviewModerationScene");
const reviewListScene = require("./scenes/moderations/masterClassReviewModerationScene"); // новая сцена для списка отзывов

// Модели
const Events = require("../models/events");
const Review = require("../models/review");

const bot = new Telegraf(process.env.BOT_TOKEN);

// ==================== Stage и сцены ====================
const stage = new Scenes.Stage([
  createEventScene,
  updateEventScene,
  deleteEventScene,
  addPhotoScene,
  updatePhotoScene,
  deletePhotoScene,
  addVideoScene,
  updateVideoScene,
  deleteVideoScene,
  addTeamScene,
  updateTeamScene,
  deleteTeamScene,
  createMasterClassScene,
  updateMasterClassScene,
  deleteMasterClassScene,
  reviewModerationScene,
  reviewListScene, // добавили
]);

// Обработчик навигационных действий внутри сцен
stage.action(
  /create_event|update_event|delete_event|add_photo|update_photo|delete_photo|add_video|update_video|delete_video|add_team|update_team|delete_team|moderate|reviews_toggle|create_master_class|update_master_class|delete_master_class|list_reviews|blocked_users/,
  handleEventCallback,
);

// ==================== Middlewares ====================
bot.use(session());
bot.use(stage.middleware());

const ADMINS_ID = (process.env.ADMINS_ID || "")
  .split(",")
  .map((id) => Number(id))
  .filter(Boolean);

// Проверка админа + команды меню
bot.use(async (ctx, next) => {
  if (ctx.scene?.current) return next();

  const text = ctx.message?.text || ctx.callbackQuery?.data;
  if (!text) return next();

  const userId = ctx.from?.id;
  if (!ADMINS_ID.includes(userId)) {
    return ctx.reply("Ты не админ🤡");
  }

  if (ctx.callbackQuery) {
    try {
      await ctx.answerCbQuery();
    } catch (e) {}
  }

  const command = text.startsWith("/") ? text.slice(1).split(" ")[0] : text;

  const GLOBAL_COMMANDS = [
    "events",
    "gallery",
    "video",
    "team",
    "reviews",
    "masterclasses",
  ];

  if (GLOBAL_COMMANDS.includes(command)) {
    switch (command) {
      case "events":
        return showMenu(ctx, 0, "📅 Управление событиями:");
      case "gallery":
        return showMenu(ctx, 1, "🖼 Управление фото:");
      case "video":
        return showMenu(ctx, 2, "🎥 Управление видео:");
      case "team":
        return showMenu(ctx, 3, "👥 Управление командой:");
      case "reviews":
        // Вместо showMenu сразу запускаем модерацию
        return ctx.scene.enter("review_moderation");
      case "masterclasses":
        return showMenu(ctx, 5, "🎓 Управление мастер-классами:");
    }
  }

  return next();
});

// ==================== Глобальные действия для отзывов ====================

// Кнопка "Модерация" из меню отзывов
bot.action("moderate_reviews", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    await ctx.scene.enter("masterclass_review_moderation");
  } catch (err) {
    console.error("Error entering moderation:", err);
    await ctx.reply("❌ Ошибка при открытии модерации");
  }
});

// Показать список отзывов (с пагинацией)
bot.action("list_reviews", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    await ctx.scene.enter("review_list");
  } catch (err) {
    console.error("Error entering review list:", err);
    await ctx.reply("❌ Ошибка при открытии списка отзывов");
  }
});

// Показать список заблокированных пользователей (кнопочный)
bot.action("blocked_users", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const blockedUsers = await Review.findAll({
      where: { is_blocked: true },
      attributes: [
        "id",
        "cookie_id",
        "ip_address",
        "author_name",
        "blocked_reason",
        "blocked_at",
      ],
      limit: 20,
    });

    if (blockedUsers.length === 0) {
      return ctx.reply("📭 Нет заблокированных пользователей");
    }

    let message = "🚫 *ЗАБЛОКИРОВАННЫЕ ПОЛЬЗОВАТЕЛИ:*\n\n";
    const buttons = [];
    for (const user of blockedUsers) {
      message += `👤 ${user.author_name || "Неизвестный"}\n`;
      if (user.cookie_id)
        message += `🍪 Cookie: ${user.cookie_id.substring(0, 8)}...\n`;
      if (user.ip_address) message += `🌐 IP: ${user.ip_address}\n`;
      message += `📝 Причина: ${user.blocked_reason || "Не указана"}\n`;
      message += `📅 Дата: ${new Date(user.blocked_at).toLocaleString("ru-RU")}\n\n`;
      buttons.push([
        Markup.button.callback(
          `🔓 Разблокировать ${user.author_name || user.cookie_id?.substring(0, 6)}`,
          `unblock_user_${user.id}`,
        ),
      ]);
    }
    buttons.push([Markup.button.callback("◀️ Назад", "back_to_reviews_menu")]);

    await ctx.reply(message, {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard(buttons),
    });
  } catch (err) {
    console.error("Blocked list error:", err);
    await ctx.reply("❌ Ошибка при получении списка заблокированных");
  }
});

// Разблокировка по ID записи в таблице Review
bot.action(/unblock_user_(\d+)/, async (ctx) => {
  const reviewId = ctx.match[1];
  try {
    const review = await Review.findByPk(reviewId);
    if (!review) {
      return ctx.answerCbQuery("Запись не найдена");
    }
    await review.update({
      is_blocked: false,
      blocked_at: null,
      blocked_reason: null,
    });
    await ctx.answerCbQuery("✅ Пользователь разблокирован");
    await ctx.reply(
      `✅ Пользователь ${review.author_name || "неизвестный"} разблокирован.`,
    );
    // обновляем меню
    setTimeout(() => showMenu(ctx, 4, "🔧 Управление отзывами:"), 1500);
  } catch (err) {
    console.error("Unblock error:", err);
    await ctx.answerCbQuery("Ошибка разблокировки");
  }
});

// Управление включением/выключением отзывов для события
bot.action(/toggle_reviews_(.+)/, async (ctx) => {
  const eventId = ctx.match[1];
  try {
    const event = await Events.findByPk(eventId);
    if (!event) return ctx.answerCbQuery("Событие не найдено");

    const newStatus = event.reviews_enabled === false;
    await event.update({ reviews_enabled: newStatus });
    await ctx.answerCbQuery();
    await ctx.reply(
      newStatus
        ? `✅ Отзывы для "${event.name}" открыты`
        : `🔒 Отзывы для "${event.name}" закрыты`,
    );
    setTimeout(() => showMenu(ctx, 4, "🔧 Управление отзывами:"), 1500);
  } catch (err) {
    console.error("Toggle reviews error:", err);
    await ctx.answerCbQuery("Ошибка");
    await ctx.reply("❌ Ошибка при изменении статуса отзывов");
  }
});

// Кнопка "Назад в меню отзывов"
bot.action("back_to_reviews_menu", async (ctx) => {
  await ctx.answerCbQuery();
  return showMenu(ctx, 4, "🔧 Управление отзывами:");
});

bot.command("unblock", async (ctx) => {
  const userId = ctx.from.id;
  if (!ADMINS_ID.includes(userId)) {
    return ctx.reply("⛔ Только для администраторов!");
  }

  const args = ctx.message.text.split(" ");
  if (args.length !== 2) {
    return ctx.reply(
      "📝 Использование:\n" +
        "/unblock cookie_id\n" +
        "/unblock ip_address\n\n" +
        "Примеры:\n" +
        "/unblock 550e8400-e29b-41d4-a716-446655440000\n" +
        "/unblock 192.168.1.1",
    );
  }

  const identifier = args[1];
  const isIP = identifier.includes(".") || identifier.includes(":");

  try {
    const where = isIP ? { ip_address: identifier } : { cookie_id: identifier };
    const [updatedCount] = await Review.update(
      { is_blocked: false, blocked_at: null, blocked_reason: null },
      { where },
    );

    if (updatedCount > 0) {
      await ctx.reply(
        `✅ Пользователь разблокирован!\n\nОбновлено записей: ${updatedCount}`,
      );
    } else {
      await ctx.reply(
        `❌ Пользователь с ${isIP ? "IP" : "Cookie ID"} "${identifier}" не найден`,
      );
    }
  } catch (err) {
    console.error("Unblock error:", err);
    await ctx.reply("❌ Ошибка при разблокировке");
  }
});

bot.command("blocked", async (ctx) => {
  const userId = ctx.from.id;
  if (!ADMINS_ID.includes(userId)) {
    return ctx.reply("⛔ Только для администраторов!");
  }

  try {
    const blockedUsers = await Review.findAll({
      where: { is_blocked: true },
      attributes: [
        "cookie_id",
        "ip_address",
        "blocked_reason",
        "blocked_at",
        "author_name",
      ],
      group: [
        "cookie_id",
        "ip_address",
        "blocked_reason",
        "blocked_at",
        "author_name",
      ],
      limit: 20,
    });

    if (blockedUsers.length === 0) {
      return ctx.reply("📭 Нет заблокированных пользователей");
    }

    let message = "🚫 *ЗАБЛОКИРОВАННЫЕ ПОЛЬЗОВАТЕЛИ:*\n\n";
    blockedUsers.forEach((user, index) => {
      message += `${index + 1}. 👤 ${user.author_name || "Неизвестный"}\n`;
      if (user.cookie_id)
        message += `   🍪 Cookie: ${user.cookie_id.substring(0, 8)}...\n`;
      if (user.ip_address) message += `   🌐 IP: ${user.ip_address}\n`;
      message += `   📝 Причина: ${user.blocked_reason || "Не указана"}\n`;
      message += `   📅 Дата: ${new Date(user.blocked_at).toLocaleString("ru-RU")}\n\n`;
    });

    message += `\n💡 Для разблокировки используйте:\n/unblock <cookie_id или ip>`;
    await ctx.reply(message, { parse_mode: "Markdown" });
  } catch (err) {
    console.error("Blocked list error:", err);
    await ctx.reply("❌ Ошибка при получении списка заблокированных");
  }
});
bot.catch((err, ctx) => {
  console.error("Критическая ошибка:", err);
  ctx.reply("Произошла ошибка. Пожалуйста, попробуйте позже.").catch(() => {});
});

// Регистрация команд
startCommand(bot);
eventsCommand(bot);
galleryCommand(bot);
teamCommand(bot);
reviewsCommands(bot);
masterclassesCommand(bot);

module.exports = bot;
