const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const OrderMessage = sequelize.define(
  "OrderMessage",
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
    sender: {
      type: DataTypes.ENUM("customer", "admin"),
      allowNull: false,
    },
    admin_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    is_read_by_customer: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    is_read_by_admin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    tableName: "order_messages",
    timestamps: false,
    underscored: true,
  },
);

module.exports = OrderMessage;
