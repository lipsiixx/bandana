require("dotenv").config();
const path = require("path");
const bot = require("../bot/bot");
const { Op } = require("sequelize");

const Events = require("../models/events");
const Gallery = require("../models/gallery");
const Video = require("../models/video");
const Teams = require("../models/teams");
const Review = require("../models/review");
const MasterClasses = require("../models/master_classes");
const Notification = require("../models/notification");

const BASE_URL = process.env.PUBLIC_URL;

const cleanFile = (file) =>
  file?.startsWith("http")
    ? file
    : `${BASE_URL}/uploads/${path.basename(file || "")}`;

class UserController {
  async getEvents(req, res) {
    try {
      const events = await Events.findAll({
        where: { is_archived: false },
        order: [["event_date", "DESC"]],
      });
      res.json({
        success: true,
        data: events.map((e) => ({
          ...e.toJSON(),
          fileUrl: cleanFile(e.fileUrl),
        })),
      });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, message: "Ошибка получения событий" });
    }
  }

  async getGallery(req, res) {
    try {
      const data = await Gallery.findAll();
      res.json({
        success: true,
        data: data.map((i) => ({
          ...i.toJSON(),
          fileUrl: cleanFile(i.fileUrl),
        })),
      });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, message: "Ошибка получения галереи" });
    }
  }

  async getGalleryFilters(req, res) {
    try {
      const images = await Gallery.findAll();
      const filters = [
        "Все",
        ...new Set(images.map((i) => i.filter).filter(Boolean)),
      ];
      res.json({ success: true, data: filters });
    } catch (error) {
      console.error(error);
      res.json({ success: true, data: ["Все"] });
    }
  }

  async getVideo(req, res) {
    try {
      const videos = await Video.findAll();
      res.json({
        success: true,
        data: videos.map((v) => ({
          ...v.toJSON(),
          fileUrl: cleanFile(v.fileUrl),
        })),
      });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, message: "Ошибка получения видео" });
    }
  }

  async getTeams(req, res) {
    try {
      const teams = await Teams.findAll();
      res.json({
        success: true,
        data: teams.map((t) => ({
          ...t.toJSON(),
          fileUrl: cleanFile(t.fileUrl),
        })),
      });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, message: "Ошибка получения команд" });
    }
  }

  async postContactForm(req, res) {
    try {
      const { fullNameAdult, fullNameKid, age, phone, city, message } =
        req.body;

      const text = `
📩 *Новая заявка*

👨‍👩‍👧 Родитель: ${fullNameAdult}
👶 Ребёнок: ${fullNameKid}
🎂 Возраст: ${age}
📞 Телефон: ${phone}
🏙 Город: ${city}

💬 ${message || "Без сообщения"}
`;

      const admins = (process.env.ADMINS_ID || "")
        .split(",")
        .map(Number)
        .filter(Boolean);

      for (const id of admins) {
        await bot.telegram.sendMessage(id, text, {
          parse_mode: "Markdown",
        });
      }

      res.json({ success: true, message: "Заявка отправлена" });
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ success: false, message: "Ошибка отправки заявки" });
    }
  }

  async sendReview(req, res) {
    try {
      const { author_name, event_id, rating, content } = req.body;
      const cookieId = req.cookieId;

      // Валидация
      if (!author_name || !event_id || !rating || !content) {
        return res.status(400).json({
          success: false,
          message: "Заполните все поля!",
        });
      }

      // Проверка существования события
      const event = await Events.findByPk(event_id);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Событие не найдено",
        });
      }

      // Проверка: включены ли отзывы для этого события
      if (event.reviews_enabled === false) {
        return res.status(403).json({
          success: false,
          message: "Отзывы для этого события временно закрыты администратором",
        });
      }

      // Проверка рейтинга
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: "Рейтинг должен быть от 1 до 5",
        });
      }

      // Проверка длины имени
      if (author_name.length < 2 || author_name.length > 50) {
        return res.status(400).json({
          success: false,
          message: "Имя должно быть от 2 до 50 символов",
        });
      }

      // Проверка длины текста
      if (content.length < 1 || content.length > 2000) {
        return res.status(400).json({
          success: false,
          message: "Текст отзыва должен быть от 1 до 2000 символов",
        });
      }

      // Создание отзыва
      const review = await Review.create({
        author_name,
        master_class_id: event_id,
        rating,
        content,
        cookie_id: cookieId,
        status: "pending",
      });

      // Отправка уведомления админам
      const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
      const notificationText = `
📝 *НОВЫЙ ОТЗЫВ НА МОДЕРАЦИЮ!*

👤 *Автор:* ${author_name}
⭐ *Оценка:* ${stars} (${rating}/5)
🎭 *Событие:* ${event.name}
📅 *Дата события:* ${event.event_date || "не указана"}
💬 *Текст:* 
${content.substring(0, 200)}${content.length > 200 ? "..." : ""}

🆔 *ID отзыва:* ${review.id}

⏰ *Получен:* ${new Date().toLocaleString("ru-RU")}
`;

      const admins = (process.env.ADMINS_ID || "")
        .split(",")
        .map(Number)
        .filter(Boolean);

      for (const adminId of admins) {
        try {
          await bot.telegram.sendMessage(adminId, notificationText, {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "🔍 Перейти к модерации",
                    callback_data: "moderate_reviews",
                  },
                  {
                    text: "🔒 Закрыть отзывы для этого события",
                    callback_data: `toggle_reviews_${event.id}`,
                  },
                ],
              ],
            },
          });
        } catch (err) {
          console.error(
            `Не удалось отправить уведомление админу ${adminId}:`,
            err,
          );
        }
      }

      return res.status(201).json({
        success: true,
        message: "Спасибо, отзыв появится после проверки",
      });
    } catch (err) {
      console.error("Send review error:", err);
      return res.status(500).json({
        success: false,
        message: "Ошибка при сохранении отзыва",
      });
    }
  }

  async getPublishedReviews(req, res) {
    try {
      const { event_id, page = 1, limit = 10 } = req.query;

      const where = { status: "approved" };
      if (event_id && event_id !== "all") {
        where.master_class_id = event_id;
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const { count, rows } = await Review.findAndCountAll({
        where,
        order: [["submitted_at", "DESC"]],
        limit: parseInt(limit),
        offset: offset,
      });

      // Данные уже есть в rows (master_class_name, master_class_date)
      res.json({
        success: true,
        data: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / parseInt(limit)),
          limit: parseInt(limit),
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: "Ошибка получения отзывов",
      });
    }
  }

  async getMasterClasses(req, res) {
    try {
      const masterClasses = await MasterClasses.findAll({
        where: { is_archived: false }, // ← Важно! Показываем только неархивные
        order: [["event_date", "DESC"]],
      });

      console.log("Found master classes:", masterClasses.length); // Для отладки

      res.json({
        success: true,
        data: masterClasses,
      });
    } catch (error) {
      console.error("Error in getMasterClasses:", error);
      res.status(500).json({
        success: false,
        message: "Ошибка получения мастер-классов",
        data: [],
      });
    }
  }

  async getMasterClassById(req, res) {
    try {
      const { id } = req.params;
      const masterClass = await MasterClasses.findByPk(id);

      if (!masterClass) {
        return res.status(404).json({
          success: false,
          message: "Мастер-класс не найден",
        });
      }

      res.json({
        success: true,
        data: masterClass,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: "Ошибка получения мастер-класса",
      });
    }
  }

  async getMasterClassReviews(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10 } = req.query;

      // НЕ проверяем существование мастер-класса!
      // Просто возвращаем отзывы с master_class_id = id
      // или если id = "all" - все отзывы

      const where = { status: "approved" };
      if (id && id !== "all") {
        where.master_class_id = id;
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const { count, rows } = await Review.findAndCountAll({
        where,
        order: [["submitted_at", "DESC"]],
        limit: parseInt(limit),
        offset: offset,
      });

      res.json({
        success: true,
        data: rows, // В rows уже есть master_class_name и master_class_date
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / parseInt(limit)),
          limit: parseInt(limit),
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: "Ошибка получения отзывов",
      });
    }
  }

  async sendMasterClassReview(req, res) {
    try {
      const { id } = req.params;
      const { author_name, rating, content } = req.body;
      const cookieId = req.cookieId;
      const ipAddress = req.ipAddress;
      const userAgent = req.userAgent;

      // Валидация
      if (!author_name || !rating || !content) {
        return res.status(400).json({
          success: false,
          message: "Заполните все поля!",
        });
      }

      // Проверка существования мастер-класса
      const masterClass = await MasterClasses.findByPk(id);
      if (!masterClass) {
        return res.status(404).json({
          success: false,
          message: "Мастер-класс не найден",
        });
      }

      // Проверка рейтинга
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: "Рейтинг должен быть от 1 до 5",
        });
      }

      // Проверка длины имени
      if (author_name.length < 2 || author_name.length > 50) {
        return res.status(400).json({
          success: false,
          message: "Имя должно быть от 2 до 50 символов",
        });
      }

      // Проверка длины текста
      if (content.length < 1 || content.length > 2000) {
        return res.status(400).json({
          success: false,
          message: "Текст отзыва должен быть от 1 до 2000 символов",
        });
      }

      // ========== СОЗДАНИЕ ОТЗЫВА С КОПИЕЙ ДАННЫХ МК ==========
      const review = await Review.create({
        author_name,
        master_class_id: id,
        master_class_name: masterClass.name,
        master_class_date: masterClass.event_date,
        rating,
        content,
        cookie_id: cookieId,
        ip_address: ipAddress,
        user_agent: userAgent,
        status: "pending",
      });

      // Отправка уведомления админам
      const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
      const notificationText = `
📝 *НОВЫЙ ОТЗЫВ НА МОДЕРАЦИЮ!*

👤 *Автор:* ${author_name}
⭐ *Оценка:* ${stars} (${rating}/5)
🎓 *Мастер-класс:* ${masterClass.name}
📅 *Дата:* ${masterClass.event_date || "не указана"}

⏰ *Получен:* ${new Date().toLocaleString("ru-RU")}`;

      const admins = (process.env.ADMINS_ID || "")
        .split(",")
        .map(Number)
        .filter(Boolean);

      for (const adminId of admins) {
        try {
          await bot.telegram.sendMessage(adminId, notificationText, {
            parse_mode: "Markdown",
          });
        } catch (err) {
          console.error(
            `Не удалось отправить уведомление админу ${adminId}:`,
            err,
          );
        }
      }

      return res.status(201).json({
        success: true,
        message: "Спасибо, отзыв появится после проверки",
      });
    } catch (err) {
      console.error("Send masterclass review error:", err);
      return res.status(500).json({
        success: false,
        message: "Ошибка при сохранении отзыва",
      });
    }
  }

  // Блокировка пользователя
  async blockUser(req, res) {
    try {
      const { reviewId } = req.params;
      const { reason } = req.body;

      const review = await Review.findByPk(reviewId);
      if (!review) {
        return res.status(404).json({
          success: false,
          message: "Отзыв не найден",
        });
      }

      // Блокируем пользователя
      await Review.update(
        {
          is_blocked: true,
          blocked_at: new Date(),
          blocked_reason: reason || "Нарушение правил",
          status: "blocked",
        },
        {
          where: {
            [Op.or]: [
              { cookie_id: review.cookie_id },
              { ip_address: review.ip_address },
            ],
          },
        },
      );

      // Отклоняем все его отзывы
      await Review.update(
        {
          status: "rejected",
          rejection_reason: `Пользователь заблокирован: ${reason || "Нарушение правил"}`,
        },
        {
          where: {
            [Op.or]: [
              { cookie_id: review.cookie_id },
              { ip_address: review.ip_address },
            ],
            status: "pending",
          },
        },
      );

      res.json({
        success: true,
        message: "Пользователь заблокирован",
      });
    } catch (error) {
      console.error("Block user error:", error);
      res.status(500).json({
        success: false,
        message: "Ошибка при блокировке пользователя",
      });
    }
  }

  // Разблокировка пользователя
  async unblockUser(req, res) {
    try {
      const { cookieId } = req.params;

      await Review.update(
        {
          is_blocked: false,
          blocked_at: null,
          blocked_reason: null,
        },
        {
          where: { cookie_id: cookieId },
        },
      );

      res.json({
        success: true,
        message: "Пользователь разблокирован",
      });
    } catch (error) {
      console.error("Unblock user error:", error);
      res.status(500).json({
        success: false,
        message: "Ошибка при разблокировке пользователя",
      });
    }
  }

  async getApprovedMasterClassReviews(req, res) {
    try {
      const { id } = req.params;
      const { limit = 20 } = req.query;

      const reviews = await Review.findAll({
        where: {
          master_class_id: id,
          status: "approved",
        },
        order: [["submitted_at", "DESC"]],
        limit: parseInt(limit),
      });

      res.json({
        success: true,
        data: reviews,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: "Ошибка получения отзывов",
      });
    }
  }

  // Добавь в конец класса UserController, перед module.exports
  // userController.js - обновленный метод refreshCookie
  async refreshCookie(req, res) {
    try {
      const crypto = require("crypto");
      const COOKIE_SECRET =
        process.env.COOKIE_SECRET || "my-super-secret-key-change-it";

      function signCookie(value) {
        const signature = crypto
          .createHmac("sha256", COOKIE_SECRET)
          .update(value)
          .digest("hex");
        return `${value}.${signature}`;
      }

      let cookieId = req.cookies?.visitor_id;
      let rawId = null;

      if (cookieId) {
        // Проверяем подпись существующей куки
        const lastDotIndex = cookieId.lastIndexOf(".");
        if (lastDotIndex !== -1) {
          const value = cookieId.substring(0, lastDotIndex);
          const signature = cookieId.substring(lastDotIndex + 1);
          const expectedSignature = crypto
            .createHmac("sha256", COOKIE_SECRET)
            .update(value)
            .digest("hex");
          if (signature === expectedSignature) {
            rawId = value;
          }
        }
      }

      if (!rawId) {
        rawId = crypto.randomUUID();
      }

      const signedCookie = signCookie(rawId);

      res.cookie("visitor_id", signedCookie, {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });

      res.cookie("visitor_id_age", Date.now(), {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "lax",
      });

      res.json({ success: true, message: "Кука обновлена", cookieId: rawId });
    } catch (error) {
      console.error("Refresh cookie error:", error);
      res
        .status(500)
        .json({ success: false, message: "Ошибка обновления куки" });
    }
  }

  // Уведомление посетителя (вызывается ботом при модерации отзыва)
  async notifyUser(req, res) {
    try {
      const { cookie_id, message, type } = req.body;

      if (!cookie_id || !message) {
        return res.status(400).json({
          success: false,
          message: "Не указан cookie_id или message",
        });
      }

      await Notification.create({ cookie_id, message, type: type || null });

      res.json({ success: true, message: "Уведомление сохранено" });
    } catch (error) {
      console.error("Notify user error:", error);
      res
        .status(500)
        .json({ success: false, message: "Ошибка сохранения уведомления" });
    }
  }

  // Получить непрочитанные уведомления текущего посетителя (по подписанной куке)
  async getNotifications(req, res) {
    try {
      const crypto = require("crypto");
      const COOKIE_SECRET =
        process.env.COOKIE_SECRET || "my-super-secret-key-change-it";

      const signedCookie = req.cookies?.visitor_id;
      if (!signedCookie) {
        return res.json({ success: true, data: [] });
      }

      const lastDotIndex = signedCookie.lastIndexOf(".");
      if (lastDotIndex === -1) {
        return res.json({ success: true, data: [] });
      }
      const cookieId = signedCookie.substring(0, lastDotIndex);
      const signature = signedCookie.substring(lastDotIndex + 1);
      const expectedSignature = crypto
        .createHmac("sha256", COOKIE_SECRET)
        .update(cookieId)
        .digest("hex");
      if (signature !== expectedSignature) {
        return res.json({ success: true, data: [] });
      }

      const notifications = await Notification.findAll({
        where: { cookie_id: cookieId, is_read: false },
        order: [["createdAt", "ASC"]],
      });

      if (notifications.length > 0) {
        await Notification.update(
          { is_read: true },
          { where: { id: notifications.map((n) => n.id) } },
        );
      }

      res.json({ success: true, data: notifications });
    } catch (error) {
      console.error("Get notifications error:", error);
      res
        .status(500)
        .json({ success: false, message: "Ошибка получения уведомлений" });
    }
  }
}

module.exports = new UserController();
