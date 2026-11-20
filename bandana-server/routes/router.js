const express = require("express");
const router = express.Router();
const UserController = require("../controller/userController");
const OrderPublicController = require("../controller/orderPublicController");
const reviewRateLimiter = require("../middleware/reviewRateLimiter");
const internalAuth = require("../middleware/internalAuth");
const orderRateLimiter = require("../middleware/orderRateLimiter");
const orderUploadRateLimiter = require("../middleware/orderUploadRateLimiter");
const { uploadOrderSourceFiles } = require("../middleware/upload");

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

// НОВЫЕ МАРШРУТЫ ДЛЯ ЗАНЯТИЙ ПО ТАНЦАМ
router.get("/dance-classes", UserController.getDanceClasses);
router.get("/dance-classes/:id/reviews", UserController.getDanceClassReviews);
router.post(
  "/dance-classes/:id/send-review",
  reviewRateLimiter.forColumn("dance_class_id"),
  UserController.sendDanceClassReview,
);
router.get(
  "/dance-classes/:id/reviews/approved",
  UserController.getApprovedDanceClassReviews,
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

// ==================== УСЛУГИ И ЗАКАЗЫ ====================
router.get("/services", OrderPublicController.getServices);
router.get("/services/:slug", OrderPublicController.getServiceBySlug);
router.get("/services/:slug/reviews", OrderPublicController.getServiceReviews);

router.post("/orders", orderRateLimiter, OrderPublicController.createOrder);
router.patch("/orders/:orderId", OrderPublicController.patchOrder);
router.post(
  "/orders/:orderId/source-files",
  orderUploadRateLimiter,
  uploadOrderSourceFiles,
  OrderPublicController.uploadOrderSourceFiles,
);
router.post("/orders/:orderId/source-links", OrderPublicController.addOrderLink);

router.get("/orders/by-token/:token", OrderPublicController.getOrderByToken);
router.post(
  "/orders/by-token/:token/messages",
  OrderPublicController.postCustomerMessage,
);
router.post(
  "/orders/by-token/:token/review",
  OrderPublicController.submitOrderReview,
);

module.exports = router;
