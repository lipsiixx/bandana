const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const OrderFile = sequelize.define(
  "OrderFile",
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
    kind: {
      type: DataTypes.ENUM("source", "delivered"),
      allowNull: false,
    },
    file_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    file_url: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    size_bytes: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    uploaded_by: {
      type: DataTypes.ENUM("customer", "admin"),
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    tableName: "order_files",
    timestamps: false,
    underscored: true,
  },
);

module.exports = OrderFile;
