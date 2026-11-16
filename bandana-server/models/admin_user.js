const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const AdminUser = sequelize.define(
  "AdminUser",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "admin_users",
    underscored: true,
  },
);

module.exports = AdminUser;
