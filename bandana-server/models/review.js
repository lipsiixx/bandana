const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Review = sequelize.define(
  "MasterClassReview",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    author_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        len: [2, 50],
        notEmpty: true,
      },
    },
    master_class_id: {
      type: DataTypes.UUID,
      allowNull: true, // ← Меняем на true, чтобы отзывы не удалялись при удалении МК
    },
    // ========== НОВЫЕ ПОЛЯ ДЛЯ ХРАНЕНИЯ КОПИИ ДАННЫХ МК ==========
    master_class_name: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: "Название мастер-класса на момент создания отзыва",
    },
    master_class_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Дата мастер-класса на момент создания отзыва",
    },
    // ============================================================
    // ========== ТИП ОТЗЫВА И ПРИВЯЗКА К УСЛУГЕ/ЗАНЯТИЮ ==========
    // review_type различает три независимые категории отзывов; у каждой —
    // свой набор заполненных полей (остальные FK остаются NULL).
    review_type: {
      type: DataTypes.ENUM("masterclass", "service", "dance_class"),
      defaultValue: "masterclass",
      allowNull: false,
    },
    order_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: "Заказ услуги, к которому привязан отзыв (review_type = service)",
    },
    service_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    service_title: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: "Название услуги на момент создания отзыва",
    },
    dance_class_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    dance_class_name: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: "Название направления на момент создания отзыва",
    },
    // ============================================================
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5,
        isInt: true,
      },
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 2000],
      },
    },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected", "blocked"),
      defaultValue: "pending",
      allowNull: false,
    },
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    cookie_id: {
      type: DataTypes.STRING(36),
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_blocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    blocked_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    blocked_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    submitted_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "MasterClassReviews",
    // Продублировано в migrations/0002-review-indexes.js (источник истины
    // для реальной БД — эти индексы здесь только для dev-синка/документации).
    indexes: [
      { name: "idx_master_class_reviews_cookie_id", fields: ["cookie_id"] },
      { name: "idx_master_class_reviews_ip_address", fields: ["ip_address"] },
      { name: "idx_master_class_reviews_status", fields: ["status"] },
      {
        name: "idx_master_class_reviews_submitted_at",
        fields: ["submitted_at"],
      },
      {
        name: "idx_master_class_reviews_mc_status_submitted",
        fields: ["master_class_id", "status", "submitted_at"],
      },
      {
        name: "idx_master_class_reviews_cookie_submitted",
        fields: ["cookie_id", "submitted_at"],
      },
      {
        name: "idx_master_class_reviews_cookie_blocked",
        fields: ["cookie_id", "is_blocked", "blocked_at"],
      },
    ],
  },
);

module.exports = Review;
