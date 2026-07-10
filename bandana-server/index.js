require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const slowDown = require("express-slow-down");

const sequelize = require("./config/db");

// Импортируем модели в правильном порядке (сначала родительские, потом дочерние)
const MasterClasses = require("./models/master_classes");
const Events = require("./models/events");
const Gallery = require("./models/gallery");
const Video = require("./models/video");
const Teams = require("./models/teams");
const Review = require("./models/review");

// Импортируем остальные зависимости
const { startMessageMonitor } = require("./bot/utils/messageMonitor");
const router = require("./routes/router");
const bot = require("./bot/bot");

const app = express();
const PORT = Number(process.env.PORT) || 5000;

/* ============================================================
АССОЦИАЦИИ МЕЖДУ МОДЕЛЯМИ
============================================================ */
// Настраиваем связи между таблицами ПОСЛЕ импорта всех моделей
Review.belongsTo(MasterClasses, {
  foreignKey: "master_class_id",
  as: "masterClass",
});

MasterClasses.hasMany(Review, {
  foreignKey: "master_class_id",
  as: "reviews",
});

/* ============================================================
SECURITY
============================================================ */
app.use(helmet({ crossOriginResourcePolicy: false }));

/* ============================================================
CORS
============================================================ */
const allowedOrigins = (
  process.env.CORS_ORIGINS || "https://bandana-dance.ru"
)
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Разрешаем запросы без Origin (curl, серверные health-check'и)
      if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ""))) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

/* ============================================================
COOKIE
============================================================ */
app.use(cookieParser());

/* ============================================================
RATE LIMITING
============================================================ */
app.use(
  "/api",
  slowDown({
    windowMs: 60 * 1000,
    delayAfter: 60,
    delayMs: () => 250,
  }),
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

/* ============================================================
MIDDLEWARE
============================================================ */
app.use(express.json({ limit: "50mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Логирование запросов
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

/* ============================================================
ROUTES
============================================================ */
app.use("/api", router);

// Обработка 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error("Server error:", err.stack);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

/* ============================================================
ФУНКЦИЯ ДЛЯ ПРОВЕРКИ И ДОБАВЛЕНИЯ КОЛОНОК
============================================================ */
async function addMissingColumns() {
  try {
    // Проверяем и добавляем колонку is_archived в таблицу Events
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Events' AND column_name = 'is_archived'
    `);

    if (results.length === 0) {
      console.log("📝 Добавляем колонку is_archived в таблицу Events...");
      await sequelize.query(`
        ALTER TABLE "Events" 
        ADD COLUMN "is_archived" BOOLEAN DEFAULT false
      `);
      console.log("✅ Колонка is_archived добавлена");
    }

    // Проверяем и добавляем колонку reviews_enabled в таблицу Events
    const [results2] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Events' AND column_name = 'reviews_enabled'
    `);

    if (results2.length === 0) {
      console.log("📝 Добавляем колонку reviews_enabled в таблицу Events...");
      await sequelize.query(`
        ALTER TABLE "Events" 
        ADD COLUMN "reviews_enabled" BOOLEAN DEFAULT true
      `);
      console.log("✅ Колонка reviews_enabled добавлена");
    }
  } catch (error) {
    console.error("Ошибка при добавлении колонок:", error);
  }
}

/* ============================================================
START
============================================================ */
async function start() {
  try {
    await sequelize.authenticate();
    console.log("✅ PostgreSQL connected");

    // Создаем таблицы в правильном порядке
    console.log("📝 Создание таблиц...");

    // Сначала создаем родительские таблицы
    await MasterClasses.sync({ alter: true });
    console.log("✅ MasterClasses table ready");

    await Events.sync({ alter: true });
    console.log("✅ Events table ready");

    await Gallery.sync({ alter: true });
    console.log("✅ Gallery table ready");

    await Video.sync({ alter: true });
    console.log("✅ Video table ready");

    await Teams.sync({ alter: true });
    console.log("✅ Teams table ready");

    // Добавляем недостающие колонки
    await addMissingColumns();

    // Создаем дочерние таблицы (без внешних ключей сначала)
    await Review.sync({ alter: true });
    console.log("✅ Reviews table ready");

    // Добавляем внешний ключ если его нет
    try {
      await sequelize.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'MasterClassReviews_master_class_id_fkey'
          ) THEN
            ALTER TABLE "MasterClassReviews" 
            ADD CONSTRAINT "MasterClassReviews_master_class_id_fkey" 
            FOREIGN KEY ("master_class_id") 
            REFERENCES "MasterClasses"("id") 
            ON DELETE CASCADE;
          END IF;
        END $$;
      `);
      console.log("✅ Foreign key constraint added");
    } catch (error) {
      console.log("Foreign key already exists or error:", error.message);
    }

    console.log("✅ Database synced successfully");

    // Запуск бота
    if (bot && typeof bot.launch === "function") {
      bot.launch();
      console.log("✅ Telegram bot started");
    }

    console.log("🔄 Запуск Telegram Message Monitor...");
    await startMessageMonitor();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Health check: http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Startup error:", err);
    process.exit(1);
  }
}

start();
