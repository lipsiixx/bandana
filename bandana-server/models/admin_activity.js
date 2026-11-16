const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const AdminActivity = sequelize.define(
  "AdminActivity",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    admin_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    admin_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    section: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: "admin_activity",
    underscored: true,
    updatedAt: false,
  },
);

module.exports = AdminActivity;
