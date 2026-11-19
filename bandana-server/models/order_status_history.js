const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const OrderStatusHistory = sequelize.define(
  "OrderStatusHistory",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    order_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    from_status: {
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
      allowNull: true,
    },
    to_status: {
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
      allowNull: false,
    },
    admin_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    tableName: "order_status_history",
    timestamps: false,
    underscored: true,
  },
);

module.exports = OrderStatusHistory;
