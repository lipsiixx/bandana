const { Markup } = require("telegraf");
const Events = require("../../models/events");

const MENU = {
  0: [
    // События
    { text: "➕ Создать", action: "create_event" },
    { text: "✏ Изменить", action: "update_event" },
    { text: "🗑 Удалить", action: "delete_event" },
  ],
  1: [
    // Фото
    { text: "➕ Добавить", action: "add_photo" },
    { text: "✏ Изменить", action: "update_photo" },
    { text: "🗑 Удалить", action: "delete_photo" },
  ],
  2: [
    // Видео
    { text: "➕ Добавить", action: "add_video" },
    { text: "✏ Изменить", action: "update_video" },
    { text: "🗑 Удалить", action: "delete_video" },
  ],
  3: [
    // Команда
    { text: "➕ Добавить", action: "add_team" },
    { text: "✏ Изменить", action: "update_team" },
    { text: "🗑 Удалить", action: "delete_team" },
  ],
  4: [
    // Управление отзывами (исправлено!)
    { text: "📋 Список отзывов", action: "list_reviews" },
    { text: "🔄 Модерация", action: "moderate_reviews" },
    { text: "🚫 Заблокированные", action: "blocked_users" },
    { text: "🔧 Вкл/Выкл отзывы", action: "reviews_toggle" },
  ],
  5: [
    // Мастер-классы
    { text: "➕ Создать", action: "create_master_class" },
    { text: "✏ Изменить", action: "update_master_class" },
    { text: "🗑 Удалить", action: "delete_master_class" },
  ],
};

async function showMenu(ctx, index, text = "Выбери действие:", columns = 2) {
  const menuItems = MENU[index];
  if (!menuItems) return ctx.reply("❗ Меню не найдено");

  const buttons = [];
  for (let i = 0; i < menuItems.length; i += columns) {
    buttons.push(
      menuItems
        .slice(i, i + columns)
        .map((item) => Markup.button.callback(item.text, item.action)),
    );
  }

  return ctx.reply(text, Markup.inlineKeyboard(buttons));
}

async function handleEventCallback(ctx) {
  try {
    await ctx.answerCbQuery();
  } catch (e) {}

  const action = ctx.callbackQuery?.data;
  if (!action) return;

  // ВАЖНО: НЕ выходим из сцены, если это действия для модерации отзывов
  // Проверяем, не является ли действие внутренним для сцены модерации
  const moderationActions = [
    "approve",
    "reject",
    "prev",
    "next",
    "edit",
    "block",
    "refresh",
    "back_to_review",
    "edit_name",
    "edit_rating",
    "edit_content",
  ];

  if (moderationActions.includes(action)) {
    // Это действие для сцены модерации - НЕ выходим из сцены, НЕ обрабатываем здесь
    return;
  }

  if (ctx.scene?.current?.id) {
    try {
      await ctx.scene.leave();
    } catch (e) {}
  }

  switch (action) {
    // ... все существующие case'ы ...
    case "create_event":
      return ctx.scene.enter("create_event");
    case "update_event":
      return ctx.scene.enter("update_event");
    case "delete_event":
      return ctx.scene.enter("delete_event");
    case "add_photo":
      return ctx.scene.enter("add_photo");
    case "update_photo":
      return ctx.scene.enter("update_photo");
    case "delete_photo":
      return ctx.scene.enter("delete_photo");
    case "add_video":
      return ctx.scene.enter("add_video");
    case "update_video":
      return ctx.scene.enter("update_video");
    case "delete_video":
      return ctx.scene.enter("delete_video");
    case "add_team":
      return ctx.scene.enter("add_team");
    case "update_team":
      return ctx.scene.enter("update_team");
    case "delete_team":
      return ctx.scene.enter("delete_team");
    case "create_master_class":
      return ctx.scene.enter("create_master_class");
    case "update_master_class":
      return ctx.scene.enter("update_master_class");
    case "delete_master_class":
      return ctx.scene.enter("delete_master_class");

    case "moderate_reviews":
      return ctx.scene.enter("review_moderation");

    case "list_reviews":
      return ctx.scene.enter("review_moderation");

    case "blocked_users":
      return; // обрабатывается в bot.js

    case "reviews_toggle": {
      const events = await Events.findAll({
        where: { is_archived: false },
        order: [["event_date", "DESC"]],
      });
      if (events.length === 0) return ctx.reply("❌ Нет доступных событий");

      const buttons = events.map((event) => {
        const status = event.reviews_enabled !== false ? "✅" : "🔒";
        return [
          Markup.button.callback(
            `${status} ${event.name.substring(0, 40)}`,
            `toggle_reviews_${event.id}`,
          ),
        ];
      });
      buttons.push([
        Markup.button.callback("◀️ Назад", "back_to_reviews_menu"),
      ]);

      return ctx.reply(
        "🔧 Выберите событие для управления отзывами:",
        Markup.inlineKeyboard(buttons),
      );
    }

    default:
      return ctx.reply("❗ Неизвестная команда");
  }
}

module.exports = { showMenu, handleEventCallback };
