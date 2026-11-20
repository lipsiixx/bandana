const crypto = require("crypto");
const { Op } = require("sequelize");
const Review = require("../models/review");
const { signCookie, verifyCookie } = require("../services/cookieService");

const RATE_LIMIT_CONFIG = {
  maxReviews: 3, // 3 отзыва в час
  timeWindowHours: 1, // за 1 час
  blockDays: 60, // блокировка на 60 дней
  checkDuplicates: true, // проверка дубликатов (один пользователь - один отзыв на МК)
};

function getCleanIP(req) {
  let ip =
    req.ip ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    "unknown";
  if (ip.startsWith("::ffff:")) ip = ip.substring(7);
  return ip;
}

// Фабрика — те же проверки (блокировка/лимит/дубликат) переиспользуются для
// отзывов на занятия (dance_class_id), не только на мастер-классы
// (master_class_id). idColumn — колонка Review, по которой ищется дубликат
// для req.params.id.
function makeReviewRateLimiter(idColumn) {
  return async (req, res, next) => {
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
      // обойти блокировку и лимит простой чисткой cookie
      const identityWhere = [
        { cookie_id: cookieId },
        ...(ipAddress && ipAddress !== "unknown"
          ? [{ ip_address: ipAddress }]
          : []),
      ];

      // ==================== ПРОВЕРКА БЛОКИРОВКИ (по cookie и IP) ====================
      const blockedUser = await Review.findOne({
        where: {
          [Op.or]: identityWhere,
          is_blocked: true,
          blocked_at: {
            [Op.gt]: new Date(
              Date.now() - RATE_LIMIT_CONFIG.blockDays * 24 * 60 * 60 * 1000,
            ),
          },
        },
      });

      if (blockedUser) {
        const blockedDate = new Date(blockedUser.blocked_at);
        const unblockDate = new Date(
          blockedDate.getTime() +
            RATE_LIMIT_CONFIG.blockDays * 24 * 60 * 60 * 1000,
        );
        return res.status(403).json({
          success: false,
          message: `🚫 Вы заблокированы до ${unblockDate.toLocaleDateString("ru-RU")}\nПричина: ${blockedUser.blocked_reason || "Нарушение правил"}`,
        });
      }

      // ==================== ПРОВЕРКА ЛИМИТА ОТЗЫВОВ (3 В ЧАС по cookie и IP) ====================
      const timeAgo = new Date(
        Date.now() - RATE_LIMIT_CONFIG.timeWindowHours * 60 * 60 * 1000,
      );
      const recentReviews = await Review.count({
        where: {
          [Op.or]: identityWhere,
          submitted_at: { [Op.gte]: timeAgo },
          status: { [Op.in]: ["pending", "approved"] },
        },
      });

      if (recentReviews >= RATE_LIMIT_CONFIG.maxReviews) {
        return res.status(429).json({
          success: false,
          message: `⚠️ Вы можете оставить не более ${RATE_LIMIT_CONFIG.maxReviews} отзывов в час.\n\nПопробуйте позже.`,
        });
      }

      // ==================== ПРОВЕРКА ДУБЛИКАТА (на ту же сущность по cookie) ====================
      const entityId = req.params.id;
      if (entityId && RATE_LIMIT_CONFIG.checkDuplicates) {
        const existingReview = await Review.findOne({
          where: {
            [idColumn]: entityId,
            cookie_id: cookieId,
            status: { [Op.in]: ["pending", "approved"] },
          },
        });

        if (existingReview) {
          return res.status(400).json({
            success: false,
            message: "❌ Вы уже оставляли отзыв на это",
          });
        }
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

      req.rateLimit = {
        max: RATE_LIMIT_CONFIG.maxReviews,
        windowHours: RATE_LIMIT_CONFIG.timeWindowHours,
        remaining: Math.max(0, RATE_LIMIT_CONFIG.maxReviews - recentReviews),
        used: recentReviews,
      };

      next();
    } catch (err) {
      console.error("Rate limit error:", err);
      // Fail-closed: при ошибке БД/проверки не пропускаем запрос без проверок
      return res.status(503).json({
        success: false,
        message: "Сервис временно недоступен, попробуйте позже",
      });
    }
  };
}

const reviewRateLimiter = makeReviewRateLimiter("master_class_id");

module.exports = reviewRateLimiter;
module.exports.RATE_LIMIT_CONFIG = RATE_LIMIT_CONFIG;
module.exports.forColumn = makeReviewRateLimiter;
