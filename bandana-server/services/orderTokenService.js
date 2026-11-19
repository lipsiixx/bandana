// Защищённая ссылка доступа к заказу без регистрации (/order/:token на сайте).
// Паттерн 1:1 с инвайт-токенами веб-админки (services/adminAccountService.js):
// клиенту отдаётся случайный токен, в БД хранится только его sha256-хэш —
// найти заказ можно только пересчитав хэш присланного токена.
const crypto = require("crypto");

const Order = require("../models/order");

function generateOrderToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashOrderToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function findOrderByToken(token) {
  if (!token) return null;
  return Order.findOne({ where: { access_token_hash: hashOrderToken(token) } });
}

module.exports = { generateOrderToken, hashOrderToken, findOrderByToken };
