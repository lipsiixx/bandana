// Анти-спам для создания заказа — по образцу middleware/reviewRateLimiter.js,
// но проще: без постоянной блокировки и проверки дубликатов (заказы, в
// отличие от отзывов, можно оформлять повторно — просто ограничиваем частоту).
const crypto = require("crypto");
const { Op } = require("sequelize");
const Order = require("../models/order");
const { signCookie, verifyCookie } = require("../services/cookieService");

const RATE_LIMIT_CONFIG = {
  maxOrders: 5, // 5 заказов за сутки
  timeWindowHours: 24,
};

function getCleanIP(req) {
  let ip =
    req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || "unknown";
  if (ip.startsWith("::ffff:")) ip = ip.substring(7);
  return ip;
}

const orderRateLimiter = async (req, res, next) => {
  try {
    const rawCookie = req.cookies?.visitor_id;
    let cookieId = rawCookie ? verifyCookie(rawCookie) : null;
    let cookieNeedsRefresh = false;

    if (!cookieId) {
      cookieId = crypto.randomUUID();
      cookieNeedsRefresh = true;
    }

    const ipAddress = getCleanIP(req);
    const userAgent = req.headers["user-agent"] || "unknown";

    // Идентификация по cookie и, если доступен, по IP — чтобы нельзя было
    // обойти лимит простой чисткой cookie
    const identityWhere = [
      { cookie_id: cookieId },
      ...(ipAddress && ipAddress !== "unknown" ? [{ ip_address: ipAddress }] : []),
    ];

    const timeAgo = new Date(
      Date.now() - RATE_LIMIT_CONFIG.timeWindowHours * 60 * 60 * 1000,
    );
    const recentOrders = await Order.count({
      where: { [Op.or]: identityWhere, submitted_at: { [Op.gte]: timeAgo } },
    });

    if (recentOrders >= RATE_LIMIT_CONFIG.maxOrders) {
      return res.status(429).json({
        success: false,
        message: `Можно оформить не более ${RATE_LIMIT_CONFIG.maxOrders} заказов за ${RATE_LIMIT_CONFIG.timeWindowHours} ч. Попробуйте позже.`,
      });
    }

    if (cookieNeedsRefresh) {
      const signedCookie = signCookie(cookieId);
      res.cookie("visitor_id", signedCookie, {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }

    req.cookieId = cookieId;
    req.ipAddress = ipAddress;
    req.userAgent = userAgent;

    next();
  } catch (err) {
    console.error("Order rate limit error:", err);
    // Fail-closed: при ошибке БД/проверки не пропускаем запрос без проверок
    return res.status(503).json({
      success: false,
      message: "Сервис временно недоступен, попробуйте позже",
    });
  }
};

module.exports = orderRateLimiter;
module.exports.RATE_LIMIT_CONFIG = RATE_LIMIT_CONFIG;
