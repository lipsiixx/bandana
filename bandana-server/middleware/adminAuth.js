// Middleware для защиты эндпоинтов веб-админки.
// Требует подписанную cookie admin_session (см. services/adminAuthService.js).
// Payload сессии именной: {sub, email, name, exp} — заполняется в
// AdminController.login/acceptInvite. Все именные аккаунты равноправны —
// отдельных ролей/прав нет.
const { verifySessionToken } = require("../services/adminAuthService");

function adminAuth(req, res, next) {
  const token = req.cookies?.admin_session;
  const payload = verifySessionToken(token);

  if (!payload) {
    return res.status(401).json({
      success: false,
      message: "Требуется авторизация",
    });
  }

  req.admin = payload;
  next();
}

module.exports = adminAuth;
