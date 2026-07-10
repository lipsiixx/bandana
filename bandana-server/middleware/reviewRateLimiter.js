const crypto = require("crypto");
const { Op } = require("sequelize");
const Review = require("../models/review");

const RATE_LIMIT_CONFIG = {
  maxReviews: 3, // 3 отзыва в час
  timeWindowHours: 1, // за 1 час
  blockDays: 60, // блокировка на 60 дней
  checkDuplicates: true, // проверка дубликатов (один пользователь - один отзыв на МК)
};

const COOKIE_SECRET =
  process.env.COOKIE_SECRET || "my-super-secret-key-change-it";

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

function getCleanIP(req) {
  let ip =
    req.ip ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    "unknown";
  if (ip.startsWith("::ffff:")) ip = ip.substring(7);
  return ip;
}

const reviewRateLimiter = async (req, res, next) => {
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

    // ==================== ПРОВЕРКА БЛОКИРОВКИ (только по cookie) ====================
    const blockedUser = await Review.findOne({
      where: {
        cookie_id: cookieId,
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

    // ==================== ПРОВЕРКА ЛИМИТА ОТЗЫВОВ (3 В ЧАС по cookie) ====================
    const timeAgo = new Date(
      Date.now() - RATE_LIMIT_CONFIG.timeWindowHours * 60 * 60 * 1000,
    );
    const recentReviews = await Review.count({
      where: {
        cookie_id: cookieId,
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

    // ==================== ПРОВЕРКА ДУБЛИКАТА (на тот же мастер-класс по cookie) ====================
    const masterClassId = req.params.id;
    if (masterClassId && RATE_LIMIT_CONFIG.checkDuplicates) {
      const existingReview = await Review.findOne({
        where: {
          master_class_id: masterClassId,
          cookie_id: cookieId,
          status: { [Op.in]: ["pending", "approved"] },
        },
      });

      if (existingReview) {
        return res.status(400).json({
          success: false,
          message: "❌ Вы уже оставляли отзыв на этот мастер-класс",
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
    req.cookieId = req.cookies?.visitor_id || crypto.randomUUID();
    req.ipAddress = getCleanIP(req);
    req.userAgent = req.headers["user-agent"] || "unknown";
    next();
  }
};

module.exports = reviewRateLimiter;
module.exports.RATE_LIMIT_CONFIG = RATE_LIMIT_CONFIG;
