const fs = require("fs");
const path = require("path");
const { Op } = require("sequelize");
const bcrypt = require("bcryptjs");

const { createSessionToken, SESSION_TTL_MS } = require("../services/adminAuthService");
const {
  verifyCredentials,
  createInvite,
  findInviteByToken,
  logActivity,
  getRecentActivity,
} = require("../services/adminAccountService");

const Events = require("../models/events");
const Gallery = require("../models/gallery");
const Video = require("../models/video");
const Teams = require("../models/teams");
const Review = require("../models/review");
const MasterClasses = require("../models/master_classes");
const Notification = require("../models/notification");
const AdminUser = require("../models/admin_user");
const AdminInvite = require("../models/admin_invite");
const AboutContent = require("../models/about_content");

const SESSION_COOKIE = "admin_session";
const UPLOADS_DIR = path.join(__dirname, "../uploads");

function publicAdminUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    lastLoginAt: user.last_login_at,
  };
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_MS,
  };
}

// Удаляет файл из uploads/ при замене/удалении записи. Best-effort —
// если файла нет или удалить не вышло, запись в БД это не должно блокировать.
function removeUploadedFile(fileName) {
  if (!fileName) return;
  const filePath = path.join(UPLOADS_DIR, path.basename(fileName));
  fs.unlink(filePath, () => {});
}

function formatRating(rating) {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

class AdminController {
  // ==================== АВТОРИЗАЦИЯ ====================

  async login(req, res) {
    try {
      const { email, password } = req.body;
      const user = await verifyCredentials(email, password);

      if (!user) {
        return res.status(401).json({ success: false, message: "Неверный email или пароль" });
      }

      await user.update({ last_login_at: new Date() });

      const token = createSessionToken({
        sub: user.id,
        email: user.email,
        name: user.name,
      });
      res.cookie(SESSION_COOKIE, token, cookieOptions());
      res.json({ success: true, admin: publicAdminUser(user) });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ success: false, message: "Ошибка авторизации" });
    }
  }

  async logout(req, res) {
    res.clearCookie(SESSION_COOKIE, cookieOptions());
    res.json({ success: true });
  }

  async me(req, res) {
    res.json({
      success: true,
      admin: {
        id: req.admin.sub,
        email: req.admin.email,
        name: req.admin.name,
      },
    });
  }

  // ==================== ПРИГЛАШЕНИЯ И АККАУНТЫ ====================

  async listAccounts(req, res) {
    const [users, invites] = await Promise.all([
      AdminUser.findAll({ order: [["created_at", "ASC"]] }),
      AdminInvite.findAll({
        where: { accepted_at: null, revoked_at: null },
        order: [["created_at", "DESC"]],
      }),
    ]);
    res.json({
      success: true,
      data: {
        users: users.map(publicAdminUser),
        pendingInvites: invites.map((inv) => ({
          id: inv.id,
          email: inv.email,
          expiresAt: inv.expires_at,
          invitedByName: inv.invited_by_name,
        })),
      },
    });
  }

  async createInviteHandler(req, res) {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Нужен email" });
    }
    const existing = await AdminUser.findOne({ where: { email: String(email).trim().toLowerCase() } });
    if (existing) {
      return res.status(409).json({ success: false, message: "Такой аккаунт уже существует" });
    }
    const { invite, token } = await createInvite({
      email,
      invitedBy: { id: req.admin.sub, name: req.admin.name },
    });
    await logActivity({
      admin: req.admin,
      action: "invite.create",
      section: "access",
      summary: `Отправлено приглашение «${email}»`,
    });
    const base = process.env.ADMIN_PANEL_URL || "";
    res.status(201).json({
      success: true,
      data: {
        id: invite.id,
        email: invite.email,
        expiresAt: invite.expires_at,
        inviteUrl: `${base}/accept-invite/${token}`,
      },
    });
  }

  async revokeInvite(req, res) {
    const invite = await AdminInvite.findByPk(req.params.id);
    if (!invite || invite.accepted_at) {
      return res.status(404).json({ success: false, message: "Приглашение не найдено" });
    }
    await invite.update({ revoked_at: new Date() });
    res.json({ success: true });
  }

  async removeAccount(req, res) {
    if (req.params.id === req.admin.sub) {
      return res.status(400).json({ success: false, message: "Нельзя удалить свой аккаунт" });
    }
    const user = await AdminUser.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Аккаунт не найден" });
    }
    await user.destroy();
    await logActivity({
      admin: req.admin,
      action: "account.remove",
      section: "access",
      summary: `Закрыт доступ для «${user.name}»`,
    });
    res.json({ success: true });
  }

  // Публичные (без adminAuth) — приглашённый ещё не аккаунт.

  async getInvite(req, res) {
    const invite = await findInviteByToken(req.params.token);
    if (!invite) {
      return res.status(404).json({ success: false, message: "Ссылка недействительна или истекла" });
    }
    res.json({
      success: true,
      data: {
        email: invite.email,
        invitedByName: invite.invited_by_name,
        expiresAt: invite.expires_at,
      },
    });
  }

  async acceptInvite(req, res) {
    const invite = await findInviteByToken(req.params.token);
    if (!invite) {
      return res.status(404).json({ success: false, message: "Ссылка недействительна или истекла" });
    }
    const { name, password } = req.body;
    if (!name || !password || password.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Нужны имя и пароль не короче 10 символов",
      });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await AdminUser.create({
      email: invite.email,
      password_hash: passwordHash,
      name,
      last_login_at: new Date(),
    });
    await invite.update({ accepted_at: new Date() });

    const token = createSessionToken({
      sub: user.id,
      email: user.email,
      name: user.name,
    });
    res.cookie(SESSION_COOKIE, token, cookieOptions());
    await logActivity({
      admin: { sub: user.id, name: user.name },
      action: "account.join",
      section: "access",
      summary: `«${user.name}» принял приглашение`,
    });
    res.json({ success: true, admin: publicAdminUser(user) });
  }

  // ==================== ЗАГРУЗКА ФАЙЛОВ ====================

  async uploadPhoto(req, res) {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Файл не получен" });
    }
    res.json({
      success: true,
      fileName: req.file.filename,
      fileUrl: `/uploads/${req.file.filename}`,
    });
  }

  async uploadVideo(req, res) {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Файл не получен" });
    }
    res.json({
      success: true,
      fileName: req.file.filename,
      fileUrl: `/uploads/${req.file.filename}`,
    });
  }

  // ==================== СОБЫТИЯ ====================

  async listEvents(req, res) {
    const events = await Events.findAll({ order: [["createdAt", "DESC"]] });
    res.json({ success: true, data: events });
  }

  async createEvent(req, res) {
    const { description, event_date, place, type, fileName, fileUrl } = req.body;
    const event = await Events.create({
      description,
      event_date,
      place,
      type,
      fileName: fileName || null,
      fileUrl: fileUrl || null,
    });
    await logActivity({
      admin: req.admin,
      action: "event.create",
      section: "events",
      summary: `Создано событие «${description?.slice(0, 60) || "без описания"}»`,
    });
    res.status(201).json({ success: true, data: event });
  }

  async updateEvent(req, res) {
    const event = await Events.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: "Событие не найдено" });
    }
    const { description, event_date, place, type, fileName, fileUrl } = req.body;
    if (fileName && event.fileName && fileName !== event.fileName) {
      removeUploadedFile(event.fileName);
    }
    await event.update({
      description: description ?? event.description,
      event_date: event_date ?? event.event_date,
      place: place ?? event.place,
      type: type ?? event.type,
      fileName: fileName ?? event.fileName,
      fileUrl: fileUrl ?? event.fileUrl,
    });
    res.json({ success: true, data: event });
  }

  async deleteEvent(req, res) {
    const event = await Events.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: "Событие не найдено" });
    }
    removeUploadedFile(event.fileName);
    await event.destroy();
    await logActivity({
      admin: req.admin,
      action: "event.delete",
      section: "events",
      summary: `Удалено событие «${event.description?.slice(0, 60) || "без описания"}»`,
    });
    res.json({ success: true });
  }

  // ==================== ГАЛЕРЕЯ ====================

  async listGallery(req, res) {
    const photos = await Gallery.findAll({ order: [["createdAt", "DESC"]] });
    res.json({ success: true, data: photos });
  }

  async createGalleryPhoto(req, res) {
    const { fileName, fileUrl, filter, footer } = req.body;
    if (!fileName || !fileUrl || !filter || !footer) {
      return res.status(400).json({
        success: false,
        message: "Нужны fileName, fileUrl, filter и footer",
      });
    }
    const photo = await Gallery.create({ fileName, fileUrl, filter, footer });
    await logActivity({
      admin: req.admin,
      action: "gallery.create",
      section: "gallery",
      summary: `Загружено фото «${footer}» в категорию «${filter}»`,
    });
    res.status(201).json({ success: true, data: photo });
  }

  async updateGalleryPhoto(req, res) {
    const photo = await Gallery.findByPk(req.params.id);
    if (!photo) {
      return res.status(404).json({ success: false, message: "Фото не найдено" });
    }
    const { fileName, fileUrl, filter, footer } = req.body;
    if (fileName && photo.fileName && fileName !== photo.fileName) {
      removeUploadedFile(photo.fileName);
    }
    await photo.update({
      fileName: fileName ?? photo.fileName,
      fileUrl: fileUrl ?? photo.fileUrl,
      filter: filter ?? photo.filter,
      footer: footer ?? photo.footer,
    });
    res.json({ success: true, data: photo });
  }

  async deleteGalleryPhoto(req, res) {
    const photo = await Gallery.findByPk(req.params.id);
    if (!photo) {
      return res.status(404).json({ success: false, message: "Фото не найдено" });
    }
    removeUploadedFile(photo.fileName);
    await photo.destroy();
    await logActivity({
      admin: req.admin,
      action: "gallery.delete",
      section: "gallery",
      summary: `Удалено фото «${photo.footer}»`,
    });
    res.json({ success: true });
  }

  // ==================== ВИДЕО ====================

  async listVideos(req, res) {
    const videos = await Video.findAll({ order: [["createdAt", "DESC"]] });
    res.json({ success: true, data: videos });
  }

  async createVideo(req, res) {
    const { fileName, fileUrl, name } = req.body;
    if (!fileName || !fileUrl || !name) {
      return res.status(400).json({
        success: false,
        message: "Нужны fileName, fileUrl и name",
      });
    }
    const video = await Video.create({ fileName, fileUrl, name });
    await logActivity({
      admin: req.admin,
      action: "video.create",
      section: "video",
      summary: `Загружено видео «${name}»`,
    });
    res.status(201).json({ success: true, data: video });
  }

  async updateVideo(req, res) {
    const video = await Video.findByPk(req.params.id);
    if (!video) {
      return res.status(404).json({ success: false, message: "Видео не найдено" });
    }
    const { fileName, fileUrl, name } = req.body;
    if (fileName && video.fileName && fileName !== video.fileName) {
      removeUploadedFile(video.fileName);
    }
    await video.update({
      fileName: fileName ?? video.fileName,
      fileUrl: fileUrl ?? video.fileUrl,
      name: name ?? video.name,
    });
    res.json({ success: true, data: video });
  }

  async deleteVideo(req, res) {
    const video = await Video.findByPk(req.params.id);
    if (!video) {
      return res.status(404).json({ success: false, message: "Видео не найдено" });
    }
    removeUploadedFile(video.fileName);
    await video.destroy();
    await logActivity({
      admin: req.admin,
      action: "video.delete",
      section: "video",
      summary: `Удалено видео «${video.name}»`,
    });
    res.json({ success: true });
  }

  // ==================== КОМАНДЫ ====================

  async listTeams(req, res) {
    const teams = await Teams.findAll({ order: [["createdAt", "DESC"]] });
    res.json({ success: true, data: teams });
  }

  async createTeam(req, res) {
    const {
      name,
      city,
      ageRange,
      instructors,
      choreographer,
      achievements,
      fileName,
      fileUrl,
      description,
      isRecruiting,
    } = req.body;
    if (!name || !city) {
      return res.status(400).json({ success: false, message: "Нужны name и city" });
    }
    const team = await Teams.create({
      name,
      city,
      ageRange,
      instructors,
      choreographer,
      achievements: Array.isArray(achievements) ? achievements : [],
      fileName: fileName || null,
      fileUrl: fileUrl || null,
      description,
      isRecruiting: Boolean(isRecruiting),
    });
    await logActivity({
      admin: req.admin,
      action: "team.create",
      section: "teams",
      summary: `Создана команда «${name}»`,
    });
    res.status(201).json({ success: true, data: team });
  }

  async updateTeam(req, res) {
    const team = await Teams.findByPk(req.params.id);
    if (!team) {
      return res.status(404).json({ success: false, message: "Команда не найдена" });
    }
    const {
      name,
      city,
      ageRange,
      instructors,
      choreographer,
      achievements,
      fileName,
      fileUrl,
      description,
      isRecruiting,
    } = req.body;
    if (fileName && team.fileName && fileName !== team.fileName) {
      removeUploadedFile(team.fileName);
    }
    const wasRecruiting = team.isRecruiting;
    await team.update({
      name: name ?? team.name,
      city: city ?? team.city,
      ageRange: ageRange ?? team.ageRange,
      instructors: instructors ?? team.instructors,
      choreographer: choreographer ?? team.choreographer,
      achievements: Array.isArray(achievements) ? achievements : team.achievements,
      fileName: fileName ?? team.fileName,
      fileUrl: fileUrl ?? team.fileUrl,
      description: description ?? team.description,
      isRecruiting: isRecruiting === undefined ? team.isRecruiting : Boolean(isRecruiting),
    });
    if (isRecruiting !== undefined && Boolean(isRecruiting) !== wasRecruiting) {
      await logActivity({
        admin: req.admin,
        action: "team.update",
        section: "teams",
        summary: `«${team.name}»: набор → ${team.isRecruiting ? "Открыт" : "Закрыт"}`,
      });
    }
    res.json({ success: true, data: team });
  }

  async deleteTeam(req, res) {
    const team = await Teams.findByPk(req.params.id);
    if (!team) {
      return res.status(404).json({ success: false, message: "Команда не найдена" });
    }
    removeUploadedFile(team.fileName);
    await team.destroy();
    await logActivity({
      admin: req.admin,
      action: "team.delete",
      section: "teams",
      summary: `Удалена команда «${team.name}»`,
    });
    res.json({ success: true });
  }

  // ==================== МАСТЕР-КЛАССЫ ====================

  async listMasterClasses(req, res) {
    const items = await MasterClasses.findAll({ order: [["created_at", "DESC"]] });
    res.json({ success: true, data: items });
  }

  async createMasterClass(req, res) {
    const { name, description, event_date, link, is_archived, reviews_enabled } = req.body;
    if (!name || !link) {
      return res.status(400).json({ success: false, message: "Нужны name и link" });
    }
    const item = await MasterClasses.create({
      name,
      description,
      event_date,
      link,
      is_archived: Boolean(is_archived),
      reviews_enabled: reviews_enabled === undefined ? true : Boolean(reviews_enabled),
    });
    await logActivity({
      admin: req.admin,
      action: "masterclass.create",
      section: "masterclasses",
      summary: `Создан мастер-класс «${name}»`,
    });
    res.status(201).json({ success: true, data: item });
  }

  async updateMasterClass(req, res) {
    const item = await MasterClasses.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Мастер-класс не найден" });
    }
    const { name, description, event_date, link, is_archived, reviews_enabled } = req.body;
    await item.update({
      name: name ?? item.name,
      description: description ?? item.description,
      event_date: event_date ?? item.event_date,
      link: link ?? item.link,
      is_archived: is_archived === undefined ? item.is_archived : Boolean(is_archived),
      reviews_enabled:
        reviews_enabled === undefined ? item.reviews_enabled : Boolean(reviews_enabled),
      updated_at: new Date(),
    });
    res.json({ success: true, data: item });
  }

  async deleteMasterClass(req, res) {
    const item = await MasterClasses.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Мастер-класс не найден" });
    }
    await item.destroy();
    await logActivity({
      admin: req.admin,
      action: "masterclass.delete",
      section: "masterclasses",
      summary: `Удалён мастер-класс «${item.name}»`,
    });
    res.json({ success: true });
  }

  // ==================== МОДЕРАЦИЯ ОТЗЫВОВ ====================
  // Логика одобрения/отклонения/блокировки повторяет
  // bot/scenes/moderations/masterClassReviewModerationScene.js, но вместо
  // HTTP-вызова notify-user уведомление создаётся прямо в БД (один процесс).

  async listReviews(req, res) {
    const status = req.query.status || "pending";
    const where = status === "all" ? {} : { status };
    const reviews = await Review.findAll({
      where,
      order: [["submitted_at", "ASC"]],
    });
    res.json({ success: true, data: reviews });
  }

  async approveReview(req, res) {
    const review = await Review.findByPk(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: "Отзыв не найден" });
    }

    await review.update({ status: "approved", reviewed_at: new Date() });
    await logActivity({
      admin: req.admin,
      action: "review.approve",
      section: "reviews",
      summary: `Одобрен отзыв «${review.author_name}» к «${review.master_class_name}»`,
    });

    if (review.cookie_id) {
      await Notification.create({
        cookie_id: review.cookie_id,
        type: "approved",
        message:
          `✅ Ваш отзыв одобрен!\n\n🎓 Мастер-класс: ${review.master_class_name}\n` +
          `⭐ Оценка: ${review.rating}/5\n📝 Текст: ${review.content.substring(0, 100)}` +
          `${review.content.length > 100 ? "..." : ""}\n\nСпасибо за ваш отзыв!`,
      });
    }

    res.json({ success: true, data: review });
  }

  async rejectReview(req, res) {
    const review = await Review.findByPk(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: "Отзыв не найден" });
    }

    const reason = (req.body.reason || "Не указана").trim();
    await review.update({
      status: "rejected",
      rejection_reason: reason,
      reviewed_at: new Date(),
    });
    await logActivity({
      admin: req.admin,
      action: "review.reject",
      section: "reviews",
      summary: `Отклонён отзыв к «${review.master_class_name}»`,
    });

    if (review.cookie_id) {
      await Notification.create({
        cookie_id: review.cookie_id,
        type: "rejected",
        message:
          `❌ Ваш отзыв отклонён\n\n🎓 Мастер-класс: ${review.master_class_name}\n` +
          `📝 Причина: ${reason}\n\nВы можете оставить новый отзыв с учётом замечаний.`,
      });
    }

    res.json({ success: true, data: review });
  }

  async blockReview(req, res) {
    const review = await Review.findByPk(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: "Отзыв не найден" });
    }

    const reason = (req.body.reason || "Нарушение правил сообщества").trim();

    const identityWhere = [
      ...(review.cookie_id ? [{ cookie_id: review.cookie_id }] : []),
      ...(review.ip_address ? [{ ip_address: review.ip_address }] : []),
    ];

    const [blockedCount] = await Review.update(
      {
        is_blocked: true,
        blocked_at: new Date(),
        blocked_reason: reason,
        status: "blocked",
      },
      { where: { [Op.or]: identityWhere } },
    );
    await logActivity({
      admin: req.admin,
      action: "review.block",
      section: "reviews",
      summary: `Заблокирован посетитель «${review.author_name}» — причина: ${reason}`,
    });

    if (review.cookie_id) {
      await Notification.create({
        cookie_id: review.cookie_id,
        type: "blocked",
        message:
          `🔨 Вы заблокированы!\n\n📝 Причина: ${reason}\n⏰ Срок: 60 дней\n\n` +
          `Если вы считаете это ошибкой, свяжитесь с администратором.`,
      });
    }

    res.json({ success: true, blockedCount });
  }

  async unblockReviewUser(req, res) {
    const { cookieId } = req.params;
    await Review.update(
      { is_blocked: false, blocked_at: null, blocked_reason: null },
      { where: { cookie_id: cookieId } },
    );
    await logActivity({
      admin: req.admin,
      action: "review.unblock",
      section: "reviews",
      summary: `Разблокирован посетитель v·${cookieId.slice(0, 8)}…`,
    });
    res.json({ success: true });
  }

  // История отзывов конкретного посетителя (для детальной панели модерации) —
  // по cookie_id, как и блокировка (см. blockReview).
  async reviewsByVisitor(req, res) {
    const reviews = await Review.findAll({
      where: { cookie_id: req.params.cookieId },
      order: [["submitted_at", "DESC"]],
    });
    res.json({ success: true, data: reviews });
  }

  // ==================== ДАШБОРД ====================
  // Единый эндпоинт вместо нескольких списков — агрегирует то, что уже
  // используется на других экранах, плюс эвристики "требует внимания".

  async dashboard(req, res) {
    const now = new Date();

    const [pendingReviewsCount, events, galleryCount, galleryCategories, teams, activity] =
      await Promise.all([
        Review.count({ where: { status: "pending" } }),
        Events.findAll({ order: [["createdAt", "DESC"]] }),
        Gallery.count(),
        Gallery.aggregate("filter", "DISTINCT", { plain: false }),
        Teams.findAll(),
        getRecentActivity(4),
      ]);

    const upcoming = events
      .map((e) => ({ event: e, date: new Date(e.event_date) }))
      .filter((e) => !Number.isNaN(e.date.getTime()) && e.date >= now)
      .sort((a, b) => a.date - b.date);

    const recruitingCount = teams.filter((t) => t.isRecruiting).length;

    // "Требует внимания": мастер-классы, чья дата прошла, но они не в архиве.
    const pastDueMasterClasses = await MasterClasses.findAll({
      where: { is_archived: false, event_date: { [Op.lt]: now } },
    });

    const attention = [];
    if (pastDueMasterClasses.length > 0) {
      attention.push({
        type: "masterclass_archive",
        message: `${pastDueMasterClasses.length} мастер-класс(ов) прошли, но не в архиве`,
        detail: pastDueMasterClasses.map((m) => m.name).join(", "),
      });
    }

    res.json({
      success: true,
      data: {
        pendingReviewsCount,
        upcomingEvents: upcoming.slice(0, 3).map((u) => ({
          id: u.event.id,
          description: u.event.description,
          place: u.event.place,
          date: u.date,
        })),
        eventsCount: events.length,
        galleryCount,
        galleryCategoriesCount: galleryCategories.length,
        teamsCount: teams.length,
        teamsRecruitingCount: recruitingCount,
        attention,
        recentActivity: activity.map((a) => ({
          id: a.id,
          action: a.action,
          section: a.section,
          summary: a.summary,
          adminName: a.admin_name,
          createdAt: a.createdAt,
        })),
      },
    });
  }

  // ==================== О СЕБЕ ====================

  async getAbout(req, res) {
    const about = await AboutContent.findByPk(1);
    res.json({ success: true, data: about });
  }

  async updateAbout(req, res) {
    const about = await AboutContent.findByPk(1);
    const {
      heading,
      body,
      font,
      highlight_color,
      fileName,
      fileUrl,
      brightness,
      contrast,
      warmth,
      zoom,
      focus_x,
      published,
    } = req.body;

    if (fileName && about.file_name && fileName !== about.file_name) {
      removeUploadedFile(about.file_name);
    }

    await about.update({
      heading: heading ?? about.heading,
      body: body ?? about.body,
      font: font ?? about.font,
      highlight_color: highlight_color ?? about.highlight_color,
      file_name: fileName ?? about.file_name,
      file_url: fileUrl ?? about.file_url,
      brightness: brightness ?? about.brightness,
      contrast: contrast ?? about.contrast,
      warmth: warmth ?? about.warmth,
      zoom: zoom ?? about.zoom,
      focus_x: focus_x ?? about.focus_x,
      published: published === undefined ? about.published : Boolean(published),
      updated_at: new Date(),
    });

    await logActivity({
      admin: req.admin,
      action: "about.update",
      section: "about",
      summary: about.published ? "Опубликован блок «О себе»" : "Сохранён черновик блока «О себе»",
    });

    res.json({ success: true, data: about });
  }
}

module.exports = new AdminController();
