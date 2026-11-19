// Подписанная сессионная cookie веб-админки. Проверка логина/пароля живёт
// в services/adminAccountService.js (именные аккаунты, роли) — этот модуль
// отвечает только за подпись/проверку токена сессии.
// Секрет читается из окружения один раз при загрузке модуля — без фолбэка:
// без него падаем на старте (как COOKIE_SECRET в cookieService.js).
const crypto = require("crypto");

const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 дней

if (!ADMIN_SESSION_SECRET) {
  throw new Error(
    "ADMIN_SESSION_SECRET не задан в окружении — задайте его в .env (см. .env.example)",
  );
}

function timingSafeEqualHex(a, b) {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function signSession(payload) {
  const body = base64url(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", ADMIN_SESSION_SECRET)
    .update(body)
    .digest("hex");
  return `${body}.${signature}`;
}

function createSessionToken(claims) {
  return signSession({ ...claims, exp: Date.now() + SESSION_TTL_MS });
}

function verifySessionToken(token) {
  if (!token) return null;
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return null;

  const body = token.substring(0, lastDot);
  const signature = token.substring(lastDot + 1);
  const expectedSignature = crypto
    .createHmac("sha256", ADMIN_SESSION_SECRET)
    .update(body)
    .digest("hex");

  if (!timingSafeEqualHex(expectedSignature, signature)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
        "utf8",
      ),
    );
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

module.exports = {
  createSessionToken,
  verifySessionToken,
  timingSafeEqualHex,
  SESSION_TTL_MS,
};
