const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// Регулярные групповые занятия/направления (хип-хоп, брейкданс и т.п.) —
// отдельная от MasterClasses сущность: разовые платные мастер-классы и
// обычные занятия — разные вещи, с разными отзывами.
const DanceClass = sequelize.define(
  "DanceClass",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 200],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_archived: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: "Архивные направления не показываются на сайте",
    },
    reviews_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      comment: "Включены ли отзывы для этого направления",
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
    tableName: "dance_classes",
    timestamps: false,
    underscored: true,
  },
);

module.exports = DanceClass;
