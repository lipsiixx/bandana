const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Order = sequelize.define(
  "Order",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    order_number: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      comment: "Человекочитаемый номер заказа, напр. BA-251119-A1B2",
    },
    access_token_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
      comment: "sha256 от токена доступа — сам токен в БД не хранится",
    },
    service_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(
        "new",
        "in_review",
        "clarifying_details",
        "pricing_agreement",
        "confirmed",
        "in_progress",
        "revision",
        "ready",
        "completed",
        "cancelled",
      ),
      defaultValue: "new",
      allowNull: false,
    },
    format: {
      type: DataTypes.STRING(40),
      allowNull: true,
      comment: "dance_cut | mix_edit | performance_edit | custom_edit",
    },
    source_links: {
      type: DataTypes.JSONB,
      defaultValue: [],
      allowNull: false,
      comment: "Ссылки на исходники вместо/вместе с файлами: [{url, note}]",
    },
    desired_duration: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    brief: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    comments: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    timecodes: {
      type: DataTypes.JSONB,
      defaultValue: [],
      allowNull: false,
      comment: "[{moment, note}] — порядок массива = порядок показа",
    },
    desired_deadline: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    contact_telegram: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    contact_phone: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    contact_email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    contact_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    agreed_price: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Согласованная цена в рублях",
    },
    agreed_deadline: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    is_archived: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
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
    submitted_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    tableName: "orders",
    timestamps: false,
    underscored: true,
  },
);

module.exports = Order;
