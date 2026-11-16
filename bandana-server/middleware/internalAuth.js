// Middleware для внутренних эндпоинтов (админка/бот), недоступных публично.
// Требует заголовок X-Internal-Secret, совпадающий с process.env.INTERNAL_API_SECRET.
// Если секрет не настроен в окружении — считаем эндпоинт недоступным (503),
// а не пропускаем запрос без проверки.
function internalAuth(req, res, next) {
  const secret = process.env.INTERNAL_API_SECRET;

  if (!secret) {
    console.error(
      "INTERNAL_API_SECRET не задан в окружении — внутренний эндпоинт отключён",
    );
    return res.status(503).json({
      success: false,
      message: "Сервис временно недоступен",
    });
  }

  const provided = req.headers["x-internal-secret"];
  if (provided !== secret) {
    return res.status(403).json({
      success: false,
      message: "Доступ запрещён",
    });
  }

  next();
}

module.exports = internalAuth;
