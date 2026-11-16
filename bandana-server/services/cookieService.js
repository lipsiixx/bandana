// Единый модуль подписи/проверки cookie посетителя (visitor_id).
// Секрет читается из окружения ОДИН раз при загрузке модуля — без фолбэка:
// если COOKIE_SECRET не задан, падаем на старте, а не работаем с дефолтным секретом.
const crypto = require("crypto");

const COOKIE_SECRET = process.env.COOKIE_SECRET;

if (!COOKIE_SECRET) {
  throw new Error(
    "COOKIE_SECRET не задан в окружении — задайте его в .env (см. .env.example)",
  );
}

function signCookie(value) {
  const signature = crypto
    .createHmac("sha256", COOKIE_SECRET)
    .update(value)
    .digest("hex");
  return `${value}.${signature}`;
}

function verifyCookie(signedValue) {
  if (!signedValue) return null;
  const lastDotIndex = signedValue.lastIndexOf(".");
  if (lastDotIndex === -1) return null;
  const value = signedValue.substring(0, lastDotIndex);
  const signature = signedValue.substring(lastDotIndex + 1);
  const expectedSignature = crypto
    .createHmac("sha256", COOKIE_SECRET)
    .update(value)
    .digest("hex");
  if (signature !== expectedSignature) return null;
  return value;
}

module.exports = { signCookie, verifyCookie };
