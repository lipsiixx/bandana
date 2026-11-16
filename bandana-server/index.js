require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const slowDown = require("express-slow-down");

const sequelize = require("./config/db");
const { runMigrations } = require("./migrate");

// Модели для ассоциаций ниже (остальные модели подключают сами контроллеры/сцены бота —
// схему БД эти require'ы больше не создают, см. migrations/)
const MasterClasses = require("./models/master_classes");
const Review = require("./models/review");

// Импортируем остальные зависимости
const { startMessageMonitor } = require("./bot/utils/messageMonitor");
const router = require("./routes/router");
const adminRouter = require("./routes/adminRouter");
const bot = require("./bot/bot");

const app = express();
// За приложением стоит nginx — доверяем одному хопу прокси,
// чтобы req.ip брал реальный IP клиента из X-Forwarded-For
app.set("trust proxy", 1);
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
// JSON-тело ограничено — крупные файлы идут отдельными multipart-эндпоинтами
// /api/admin/upload/* (middleware/upload.js), не через этот парсер
app.use(express.json({ limit: "200kb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Логирование запросов (только вне продакшена — в проде это лишний шум в логах)
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  }
  next();
});

/* ============================================================
ROUTES
============================================================ */
app.use("/api", router);
app.use("/api/admin", adminRouter);

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
TELEGRAM BOT LAUNCH (с ретраями — прокси до Telegram API нестабилен,
единичный сбой getMe внутри launch() не должен навсегда убивать polling)
============================================================ */
function launchBotWithRetry(bot, maxAttempts = 5, delayMs = 3000) {
  (async () => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // launch() резолвится только после bot.stop() — не await'им это в start(),
        // просто ждём, что вызов не упадёт с ошибкой на старте (getMe/getUpdates)
        await bot.launch();
        console.log("✅ Telegram bot started");
        return;
      } catch (err) {
        console.error(
          `❌ Telegram bot launch attempt ${attempt}/${maxAttempts} failed:`,
          err.message,
        );
        if (attempt === maxAttempts) {
          console.error("❌ Telegram bot failed to start after all retries");
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  })();
}

/* ============================================================
START
============================================================ */
async function start() {
  try {
    await sequelize.authenticate();
    console.log("✅ PostgreSQL connected");

    // Схема БД — через миграции (migrations/*.js, раннер Umzug в ./migrate.js),
    // а не Model.sync({ alter: true }). Таблица SequelizeMeta хранит, какие
    // миграции уже применены — повторный запуск безопасен (idempotent).
    await runMigrations();
    console.log("✅ Migrations applied");

    // Запуск бота
    if (bot && typeof bot.launch === "function") {
      launchBotWithRetry(bot);
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
