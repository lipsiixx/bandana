// Публичная сторона каталога услуг и заказов (routes/router.js, без adminAuth).
// Стиль — как controller/userController.js: каждый метод в try/catch,
// понятные сообщения об ошибках, доступ к заказу после создания — только
// по владению токеном (см. services/orderTokenService.js), не по сессии.
const fs = require("fs");
const path = require("path");

const Service = require("../models/service");
const Order = require("../models/order");
const OrderFile = require("../models/order_file");
const OrderMessage = require("../models/order_message");

const { generateOrderToken, hashOrderToken, findOrderByToken } = require("../services/orderTokenService");
const { generateUniqueOrderNumber } = require("../services/orderNumberService");
const { notifyAdminsNewOrder, notifyAdminsNewCustomerMessage } = require("../services/orderNotificationService");
const { UPLOADS_DIR } = require("../middleware/upload");

const ALLOWED_FORMATS = ["dance_cut", "mix_edit", "performance_edit", "custom_edit"];

const ORDER_PATCH_FIELDS = [
  "format",
  "source_links",
  "desired_duration",
  "brief",
  "comments",
  "timecodes",
  "desired_deadline",
  "contact_telegram",
  "contact_phone",
  "contact_email",
  "contact_name",
];

function publicService(service) {
  return {
    slug: service.slug,
    title: service.title,
    shortDescription: service.short_description,
    description: service.description,
    coverImageUrl: service.cover_image_url,
    status: service.status,
    detail: service.detail_json,
  };
}

function publicOrder(order) {
  return {
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    format: order.format,
    sourceLinks: order.source_links,
    desiredDuration: order.desired_duration,
    brief: order.brief,
    comments: order.comments,
    timecodes: order.timecodes,
    desiredDeadline: order.desired_deadline,
    contactTelegram: order.contact_telegram,
    contactPhone: order.contact_phone,
    contactEmail: order.contact_email,
    contactName: order.contact_name,
    agreedPrice: order.agreed_price,
    agreedDeadline: order.agreed_deadline,
    submittedAt: order.submitted_at,
  };
}

function publicFile(file) {
  return {
    id: file.id,
    kind: file.kind,
    fileName: file.file_name,
    fileUrl: file.file_url,
    mimeType: file.mime_type,
    sizeBytes: file.size_bytes,
    createdAt: file.created_at,
  };
}

function publicMessage(message) {
  return {
    id: message.id,
    sender: message.sender,
    body: message.body,
    createdAt: message.created_at,
  };
}

// Multer уже сохранил файл(ы) на диск к моменту, когда контроллер успевает
// проверить токен — если токен не совпал, подчищаем за собой.
function cleanupUploadedFiles(files) {
  if (!files) return;
  for (const file of files) {
    fs.unlink(path.join(UPLOADS_DIR, path.basename(file.filename)), () => {});
  }
}

class OrderPublicController {
  async getServices(req, res) {
    try {
      const services = await Service.findAll({ order: [["sort_order", "ASC"]] });
      res.json({ success: true, data: services.map(publicService) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Ошибка получения услуг" });
    }
  }

  async getServiceBySlug(req, res) {
    try {
      const service = await Service.findOne({ where: { slug: req.params.slug } });
      if (!service) {
        return res.status(404).json({ success: false, message: "Услуга не найдена" });
      }
      res.json({ success: true, data: publicService(service) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Ошибка получения услуги" });
    }
  }

  async createOrder(req, res) {
    try {
      const { serviceSlug, format } = req.body;
      if (!serviceSlug) {
        return res.status(400).json({ success: false, message: "Нужен serviceSlug" });
      }

      const service = await Service.findOne({ where: { slug: serviceSlug } });
      if (!service) {
        return res.status(404).json({ success: false, message: "Услуга не найдена" });
      }
      if (service.status !== "active") {
        return res
          .status(403)
          .json({ success: false, message: "Эта услуга пока недоступна для заказа" });
      }
      if (format && !ALLOWED_FORMATS.includes(format)) {
        return res.status(400).json({ success: false, message: "Недопустимый формат" });
      }

      const orderNumber = await generateUniqueOrderNumber();
      const token = generateOrderToken();

      const order = await Order.create({
        order_number: orderNumber,
        access_token_hash: hashOrderToken(token),
        service_id: service.id,
        format: format || null,
        cookie_id: req.cookieId,
        ip_address: req.ipAddress,
        user_agent: req.userAgent,
      });

      notifyAdminsNewOrder(order, service).catch((err) =>
        console.error("notifyAdminsNewOrder:", err),
      );

      res.status(201).json({
        success: true,
        data: { orderId: order.id, token, orderNumber: order.order_number },
      });
    } catch (err) {
      console.error("Create order error:", err);
      res.status(500).json({ success: false, message: "Ошибка при создании заказа" });
    }
  }

  // Каждый шаг визарда сохраняет прогресс сюда — требует владения токеном,
  // доступно только пока анкета ещё редактируется (status === "new").
  async patchOrder(req, res) {
    try {
      const { token, finalize, ...fields } = req.body;
      const order = await findOrderByToken(token);
      if (!order || order.id !== req.params.orderId) {
        return res.status(403).json({ success: false, message: "Недействительная ссылка на заказ" });
      }
      if (order.status !== "new") {
        return res
          .status(400)
          .json({ success: false, message: "Заказ уже обрабатывается, изменить анкету нельзя" });
      }

      const updates = {};
      for (const key of ORDER_PATCH_FIELDS) {
        if (fields[key] !== undefined) updates[key] = fields[key];
      }

      if (finalize) {
        const nextContactName = updates.contact_name ?? order.contact_name;
        if (!nextContactName || !String(nextContactName).trim()) {
          return res.status(400).json({ success: false, message: "Укажите имя для связи" });
        }
      }

      updates.updated_at = new Date();
      await order.update(updates);

      res.json({ success: true, data: publicOrder(order) });
    } catch (err) {
      console.error("Patch order error:", err);
      res.status(500).json({ success: false, message: "Ошибка при сохранении заказа" });
    }
  }

  async uploadOrderSourceFiles(req, res) {
    try {
      const { token } = req.body;
      const order = await findOrderByToken(token);
      if (!order || order.id !== req.params.orderId) {
        cleanupUploadedFiles(req.files);
        return res.status(403).json({ success: false, message: "Недействительная ссылка на заказ" });
      }
      if (order.status !== "new") {
        cleanupUploadedFiles(req.files);
        return res
          .status(400)
          .json({ success: false, message: "Заказ уже обрабатывается, загрузка файлов недоступна" });
      }
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: "Файлы не получены" });
      }

      const created = await Promise.all(
        req.files.map((file) =>
          OrderFile.create({
            order_id: order.id,
            kind: "source",
            file_name: file.originalname,
            file_url: `/uploads/${file.filename}`,
            mime_type: file.mimetype,
            size_bytes: file.size,
            uploaded_by: "customer",
          }),
        ),
      );

      res.status(201).json({ success: true, data: created.map(publicFile) });
    } catch (err) {
      console.error("Upload order source files error:", err);
      cleanupUploadedFiles(req.files);
      res.status(500).json({ success: false, message: "Ошибка при загрузке файлов" });
    }
  }

  async addOrderLink(req, res) {
    try {
      const { token, url, note } = req.body;
      if (!url) {
        return res.status(400).json({ success: false, message: "Нужна ссылка" });
      }
      const order = await findOrderByToken(token);
      if (!order || order.id !== req.params.orderId) {
        return res.status(403).json({ success: false, message: "Недействительная ссылка на заказ" });
      }
      if (order.status !== "new") {
        return res.status(400).json({ success: false, message: "Заказ уже обрабатывается" });
      }

      const links = Array.isArray(order.source_links) ? [...order.source_links] : [];
      links.push({ url, note: note || "" });
      await order.update({ source_links: links, updated_at: new Date() });

      res.status(201).json({ success: true, data: order.source_links });
    } catch (err) {
      console.error("Add order link error:", err);
      res.status(500).json({ success: false, message: "Ошибка при добавлении ссылки" });
    }
  }

  async getOrderByToken(req, res) {
    try {
      const order = await findOrderByToken(req.params.token);
      if (!order) {
        return res.status(404).json({ success: false, message: "Заказ не найден или ссылка устарела" });
      }

      const [service, files, messages] = await Promise.all([
        Service.findByPk(order.service_id),
        OrderFile.findAll({ where: { order_id: order.id }, order: [["created_at", "ASC"]] }),
        OrderMessage.findAll({ where: { order_id: order.id }, order: [["created_at", "ASC"]] }),
      ]);

      await OrderMessage.update(
        { is_read_by_customer: true },
        { where: { order_id: order.id, sender: "admin", is_read_by_customer: false } },
      );

      res.json({
        success: true,
        data: {
          order: publicOrder(order),
          service: service ? { slug: service.slug, title: service.title } : null,
          files: files.map(publicFile),
          messages: messages.map(publicMessage),
        },
      });
    } catch (err) {
      console.error("Get order by token error:", err);
      res.status(500).json({ success: false, message: "Ошибка получения заказа" });
    }
  }

  async postCustomerMessage(req, res) {
    try {
      const order = await findOrderByToken(req.params.token);
      if (!order) {
        return res.status(404).json({ success: false, message: "Заказ не найден или ссылка устарела" });
      }

      const { body } = req.body;
      if (!body || !body.trim()) {
        return res.status(400).json({ success: false, message: "Нужен текст сообщения" });
      }

      const message = await OrderMessage.create({
        order_id: order.id,
        sender: "customer",
        body: body.trim(),
        is_read_by_customer: true,
        is_read_by_admin: false,
      });

      notifyAdminsNewCustomerMessage(order, message).catch((err) =>
        console.error("notifyAdminsNewCustomerMessage:", err),
      );

      res.status(201).json({ success: true, data: publicMessage(message) });
    } catch (err) {
      console.error("Post customer message error:", err);
      res.status(500).json({ success: false, message: "Ошибка при отправке сообщения" });
    }
  }
}

module.exports = new OrderPublicController();
