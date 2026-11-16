const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const AdminInvite = sequelize.define(
  "AdminInvite",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    token_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
    invited_by_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    invited_by_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    accepted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    revoked_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "admin_invites",
    underscored: true,
  },
);

module.exports = AdminInvite;
