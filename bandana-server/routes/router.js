const express = require("express");
const router = express.Router();
const UserController = require("../controller/userController");
const reviewRateLimiter = require("../middleware/reviewRateLimiter");
const internalAuth = require("../middleware/internalAuth");

// Существующие маршруты
router.get("/events", UserController.getEvents);
router.get("/gallery", UserController.getGallery);
router.get("/gallery-filters", UserController.getGalleryFilters);
router.get("/video", UserController.getVideo);
router.get("/teams", UserController.getTeams);
router.get("/about", UserController.getAbout);
router.post("/contact-form", UserController.postContactForm);
router.post("/send-review", reviewRateLimiter, UserController.sendReview);
router.get("/reviews", UserController.getPublishedReviews);

// НОВЫЕ МАРШРУТЫ ДЛЯ МАСТЕР-КЛАССОВ
router.get("/masterclasses", UserController.getMasterClasses);
router.get("/masterclasses/:id", UserController.getMasterClassById);
router.get("/masterclasses/:id/reviews", UserController.getMasterClassReviews);

// НОВЫЕ МАРШРУТЫ ДЛЯ ОТЗЫВОВ
router.post(
  "/masterclasses/:id/send-review",
  reviewRateLimiter,
  UserController.sendMasterClassReview,
);
router.get(
  "/masterclasses/:id/reviews/approved",
  UserController.getApprovedMasterClassReviews,
);

router.get("/refresh-cookie", UserController.refreshCookie);

// УВЕДОМЛЕНИЯ
// Вызывается ботом при модерации отзыва — внутренний эндпоинт, не для публики
router.post("/notify-user", internalAuth, UserController.notifyUser);
router.get("/notifications", UserController.getNotifications);

// Управление идёт через Telegram-бота, фронтенд эти роуты не использует —
// внутренние эндпоинты, доступные только с секретом
router.post(
  "/admin/block-user/:reviewId",
  internalAuth,
  UserController.blockUser,
);
router.post(
  "/admin/unblock-user/:cookieId",
  internalAuth,
  UserController.unblockUser,
);

module.exports = router;
