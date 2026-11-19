// Лимит на загрузку исходных файлов к одному заказу — отдельно от
// orderRateLimiter (тот лимитирует создание заказов, не последующие
// загрузки). Защита от заполнения диска через один утёкший/подобранный
// orderId+токен повторными запросами.
const { Op } = require("sequelize");
const OrderFile = require("../models/order_file");

const MAX_UPLOAD_REQUESTS_PER_HOUR = 10;
const MAX_SOURCE_FILES_PER_ORDER = 20;

async function orderUploadRateLimiter(req, res, next) {
  try {
    const orderId = req.params.orderId;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const [recentCount, totalCount] = await Promise.all([
      OrderFile.count({
        where: { order_id: orderId, kind: "source", created_at: { [Op.gte]: oneHourAgo } },
      }),
      OrderFile.count({ where: { order_id: orderId, kind: "source" } }),
    ]);

    if (totalCount >= MAX_SOURCE_FILES_PER_ORDER) {
      return res.status(429).json({
        success: false,
        message: `Достигнут лимит файлов для этого заказа (${MAX_SOURCE_FILES_PER_ORDER})`,
      });
    }

    if (recentCount >= MAX_UPLOAD_REQUESTS_PER_HOUR) {
      return res.status(429).json({
        success: false,
        message: "Слишком много загрузок, попробуйте позже",
      });
    }

    next();
  } catch (err) {
    console.error("Order upload rate limit error:", err);
    return res.status(503).json({
      success: false,
      message: "Сервис временно недоступен, попробуйте позже",
    });
  }
}

module.exports = orderUploadRateLimiter;
