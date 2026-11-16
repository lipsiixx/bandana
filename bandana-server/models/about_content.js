const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// Singleton (всегда id=1) — блок «О себе» на сайте, редактируется из
// конструктора веб-админки. published разделяет черновик и то, что видно
// на публичном сайте (GET /api/about отдаёт только опубликованную версию).
const AboutContent = sequelize.define(
  "AboutContent",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      defaultValue: 1,
    },
    heading: { type: DataTypes.TEXT, allowNull: false, defaultValue: "" },
    body: { type: DataTypes.TEXT, allowNull: false, defaultValue: "" },
    font: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "Unbounded" },
    highlight_color: { type: DataTypes.STRING(10), allowNull: false, defaultValue: "#ff3d8b" },
    file_name: { type: DataTypes.STRING(255), allowNull: true },
    file_url: { type: DataTypes.STRING(255), allowNull: true },
    brightness: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100 },
    contrast: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100 },
    warmth: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    zoom: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 120 },
    focus_x: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 45 },
    published: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  {
    tableName: "about_content",
    underscored: true,
    createdAt: false,
  },
);

module.exports = AboutContent;
