const express = require("express");
const router = express.Router();

const AdminController = require("../controller/adminController");
const OrderAdminController = require("../controller/orderAdminController");
const adminAuth = require("../middleware/adminAuth");
const { uploadPhoto, uploadVideo, uploadOrderDeliveredFiles } = require("../middleware/upload");

// ==================== АВТОРИЗАЦИЯ И ПРИГЛАШЕНИЯ (без adminAuth) ====================
router.post("/auth/login", AdminController.login);
router.post("/auth/logout", AdminController.logout);
router.get("/invites/:token", AdminController.getInvite);
router.post("/invites/:token/accept", AdminController.acceptInvite);

// Всё остальное — только для авторизованных админов (все аккаунты равноправны)
router.use(adminAuth);

router.get("/auth/me", AdminController.me);

// ==================== ДАШБОРД ====================
router.get("/dashboard", AdminController.dashboard);

// ==================== ЗАГРУЗКА ФАЙЛОВ ====================
router.post("/upload/photo", uploadPhoto, AdminController.uploadPhoto);
router.post("/upload/video", uploadVideo, AdminController.uploadVideo);

// ==================== СОБЫТИЯ ====================
router.get("/events", AdminController.listEvents);
router.post("/events", AdminController.createEvent);
router.put("/events/:id", AdminController.updateEvent);
router.delete("/events/:id", AdminController.deleteEvent);

// ==================== ГАЛЕРЕЯ ====================
router.get("/gallery", AdminController.listGallery);
router.post("/gallery", AdminController.createGalleryPhoto);
router.put("/gallery/:id", AdminController.updateGalleryPhoto);
router.delete("/gallery/:id", AdminController.deleteGalleryPhoto);

// ==================== ВИДЕО ====================
router.get("/video", AdminController.listVideos);
router.post("/video", AdminController.createVideo);
router.put("/video/:id", AdminController.updateVideo);
router.delete("/video/:id", AdminController.deleteVideo);

// ==================== КОМАНДЫ ====================
router.get("/teams", AdminController.listTeams);
router.post("/teams", AdminController.createTeam);
router.put("/teams/:id", AdminController.updateTeam);
router.delete("/teams/:id", AdminController.deleteTeam);

// ==================== МАСТЕР-КЛАССЫ ====================
router.get("/masterclasses", AdminController.listMasterClasses);
router.post("/masterclasses", AdminController.createMasterClass);
router.put("/masterclasses/:id", AdminController.updateMasterClass);
router.delete("/masterclasses/:id", AdminController.deleteMasterClass);

// ==================== ЗАНЯТИЯ ПО ТАНЦАМ ====================
router.get("/dance-classes", AdminController.listDanceClasses);
router.post("/dance-classes", AdminController.createDanceClass);
router.put("/dance-classes/:id", AdminController.updateDanceClass);
router.delete("/dance-classes/:id", AdminController.deleteDanceClass);

// ==================== МОДЕРАЦИЯ ОТЗЫВОВ ====================
router.get("/reviews", AdminController.listReviews);
router.get("/reviews/visitor/:cookieId", AdminController.reviewsByVisitor);
router.post("/reviews/:id/approve", AdminController.approveReview);
router.post("/reviews/:id/reject", AdminController.rejectReview);
router.post("/reviews/:id/block", AdminController.blockReview);
router.post("/unblock-user/:cookieId", AdminController.unblockReviewUser);

// ==================== О СЕБЕ ====================
router.get("/about", AdminController.getAbout);
router.put("/about", AdminController.updateAbout);

// ==================== ДОСТУПЫ ====================
router.get("/accounts", AdminController.listAccounts);
router.delete("/accounts/:id", AdminController.removeAccount);
router.post("/invites", AdminController.createInviteHandler);
router.delete("/invites/:id", AdminController.revokeInvite);

// ==================== КАТАЛОГ УСЛУГ ====================
router.get("/services", OrderAdminController.listServices);
router.post("/services", OrderAdminController.createService);
router.put("/services/:id", OrderAdminController.updateService);
router.delete("/services/:id", OrderAdminController.deleteService);

// ==================== ЗАКАЗЫ ====================
router.get("/orders", OrderAdminController.listOrders);
router.get("/orders/unread-count", OrderAdminController.unreadOrdersCount);
router.get("/orders/:id", OrderAdminController.getOrderDetail);
router.post("/orders/:id/status", OrderAdminController.changeStatus);
router.post("/orders/:id/pricing", OrderAdminController.setPricing);
router.post(
  "/orders/:id/files",
  uploadOrderDeliveredFiles,
  OrderAdminController.uploadDeliveredFiles,
);
router.post("/orders/:id/messages", OrderAdminController.postAdminMessage);
router.post("/orders/:id/archive", OrderAdminController.archiveOrder);

module.exports = router;
