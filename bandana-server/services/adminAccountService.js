// Аккаунты веб-админки: именные аккаунты (все — админы, без ролей) и приглашения.
// Заменяет старую модель "один общий пароль на всех" (ADMIN_PASSWORD_HASH) —
// см. миграцию 0003-admin-accounts.js.
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const AdminUser = require("../models/admin_user");
const AdminInvite = require("../models/admin_invite");
const AdminActivity = require("../models/admin_activity");

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 дней — как в тексте инвайта в макете

// Вход только по паролю (без email) — перебираем аккаунты и ищем, чей
// password_hash подходит. Все аккаунты равноправны, поэтому этого достаточно
// для однозначной идентификации (пароли у разных людей разные).
async function verifyCredentials(password) {
  if (!password) return null;
  const users = await AdminUser.findAll();
  for (const user of users) {
    if (await bcrypt.compare(password, user.password_hash)) return user;
  }
  return null;
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateInviteToken() {
  return crypto.randomBytes(32).toString("hex");
}

async function createInvite({ email, invitedBy }) {
  const token = generateInviteToken();
  const invite = await AdminInvite.create({
    email: String(email).trim().toLowerCase(),
    token_hash: hashToken(token),
    invited_by_id: invitedBy.id,
    invited_by_name: invitedBy.name,
    expires_at: new Date(Date.now() + INVITE_TTL_MS),
  });
  return { invite, token };
}

async function findInviteByToken(token) {
  if (!token) return null;
  const invite = await AdminInvite.findOne({ where: { token_hash: hashToken(token) } });
  if (!invite) return null;
  if (invite.accepted_at || invite.revoked_at) return null;
  if (invite.expires_at.getTime() < Date.now()) return null;
  return invite;
}

// Пишет одну строку в ленту действий (для дашборда и будущего полного
// журнала). Best-effort — сбой записи лога не должен ронять само действие.
async function logActivity({ admin, action, section, summary }) {
  try {
    await AdminActivity.create({
      admin_id: admin?.sub || null,
      admin_name: admin?.name || "Система",
      action,
      section,
      summary,
    });
  } catch (err) {
    console.error("Не удалось записать admin_activity:", err);
  }
}

async function getRecentActivity(limit = 4) {
  return AdminActivity.findAll({ order: [["created_at", "DESC"]], limit });
}

module.exports = {
  verifyCredentials,
  generateInviteToken,
  hashToken,
  createInvite,
  findInviteByToken,
  logActivity,
  getRecentActivity,
  INVITE_TTL_MS,
};
