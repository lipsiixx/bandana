// Человекочитаемый номер заказа: BA-YYMMDD-XXXX. Коллизии практически
// невозможны (4 случайных base36-символа на день), но на всякий случай
// проверяем уникальность в БД с несколькими попытками, а не полагаемся
// только на UNIQUE-констрейнт колонки.
const crypto = require("crypto");

const Order = require("../models/order");

function randomSuffix() {
  return crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 4);
}

function datePart() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

async function generateUniqueOrderNumber(maxAttempts = 5) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = `BA-${datePart()}-${randomSuffix()}`;
    const existing = await Order.findOne({ where: { order_number: candidate } });
    if (!existing) return candidate;
  }
  throw new Error("Не удалось сгенерировать уникальный номер заказа");
}

module.exports = { generateUniqueOrderNumber };
