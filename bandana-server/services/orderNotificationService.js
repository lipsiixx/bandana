// Best-effort Telegram-пинг админам о новом заказе/сообщении клиента —
// по образцу уведомлений об отзывах в controller/userController.js
// (bot.telegram.sendMessage + escapeMarkdown на пользовательском вводе).
// Канал бесплатный и уже подключён, поэтому используем его как доп. сигнал —
// управление заказами при этом всё равно идёт через веб-админку, не через бота.
// Email не отправляем — интеграции с почтой в проекте нет (решение владельца).
const bot = require("../bot/bot");
const { escapeMarkdown } = require("../bot/helpers/markdown");

const FORMAT_LABELS = {
  dance_cut: "Dance Cut",
  mix_edit: "Mix Edit",
  performance_edit: "Performance Edit",
  custom_edit: "Custom Edit",
};

function getAdminIds() {
  return (process.env.ADMINS_ID || "")
    .split(",")
    .map(Number)
    .filter(Boolean);
}

async function broadcastToAdmins(text) {
  for (const adminId of getAdminIds()) {
    try {
      await bot.telegram.sendMessage(adminId, text, { parse_mode: "Markdown" });
    } catch (err) {
      console.error(`Не удалось отправить уведомление админу ${adminId}:`, err);
    }
  }
}

async function notifyAdminsNewOrder(order, service) {
  const adminPanelUrl = process.env.ADMIN_PANEL_URL || "";
  const formatLabel = FORMAT_LABELS[order.format] || order.format || "не указан";
  const text = `
🆕 *Новый заказ ${escapeMarkdown(order.order_number)}*

🎧 Услуга: ${escapeMarkdown(service?.title || "")}
🎛 Формат: ${escapeMarkdown(formatLabel)}
👤 Клиент: ${escapeMarkdown(order.contact_name || "не указан")}

${adminPanelUrl ? `🔗 ${adminPanelUrl}/orders/${order.id}` : ""}
`;
  await broadcastToAdmins(text);
}

async function notifyAdminsNewCustomerMessage(order, message) {
  const adminPanelUrl = process.env.ADMIN_PANEL_URL || "";
  const preview = escapeMarkdown(
    message.body.length > 300 ? `${message.body.slice(0, 300)}...` : message.body,
  );
  const text = `
💬 *Новое сообщение по заказу ${escapeMarkdown(order.order_number)}*

${preview}

${adminPanelUrl ? `🔗 ${adminPanelUrl}/orders/${order.id}` : ""}
`;
  await broadcastToAdmins(text);
}

module.exports = { notifyAdminsNewOrder, notifyAdminsNewCustomerMessage };
