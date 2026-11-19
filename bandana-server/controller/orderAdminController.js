// Админская сторона каталога услуг и заказов (за adminAuth, см. routes/adminRouter.js).
// Стиль — как controller/adminController.js: logActivity после каждой мутации,
// nullish-coalescing merge на update, 404 на отсутствующую запись.
const fs = require("fs");
const path = require("path");
const { Op } = require("sequelize");

const { logActivity } = require("../services/adminAccountService");

const Service = require("../models/service");
const Order = require("../models/order");
const OrderFile = require("../models/order_file");
const OrderMessage = require("../models/order_message");
const OrderStatusHistory = require("../models/order_status_history");

const UPLOADS_DIR = path.join(__dirname, "../uploads");

function removeUploadedFile(fileName) {
  if (!fileName) return;
  const filePath = path.join(UPLOADS_DIR, path.basename(fileName));
  fs.unlink(filePath, () => {});
}

// Разрешённые переходы статуса (см. CLAUDE.md/ТЗ): в основном вперёд по
// цепочке, "Отменён" — почти из любого активного статуса, "Доработка" и
// "Готов" — единственная петля назад (клиент просит доработку уже после
// того как результат показан).
const ALLOWED_TRANSITIONS = {
  new: ["in_review", "cancelled"],
  in_review: ["clarifying_details", "pricing_agreement", "cancelled"],
  clarifying_details: ["pricing_agreement", "cancelled"],
  pricing_agreement: ["confirmed", "cancelled"],
  confirmed: ["in_progress", "cancelled"],
  in_progress: ["revision", "ready", "cancelled"],
  revision: ["in_progress", "cancelled"],
  ready: ["revision", "completed", "cancelled"],
  completed: [],
  cancelled: [],
};

class OrderAdminController {
  // ==================== КАТАЛОГ УСЛУГ ====================

  async listServices(req, res) {
    const services = await Service.findAll({ order: [["sort_order", "ASC"]] });
    res.json({ success: true, data: services });
  }

  async createService(req, res) {
    const { slug, title, short_description, description, cover_image_url, status, sort_order, detail_json } =
      req.body;
    if (!slug || !title || !short_description) {
      return res
        .status(400)
        .json({ success: false, message: "Нужны slug, title и short_description" });
    }
    const service = await Service.create({
      slug,
      title,
      short_description,
      description: description || null,
      cover_image_url: cover_image_url || null,
      status: status || "coming_soon",
      sort_order: sort_order ?? 0,
      detail_json: detail_json || {},
    });
    await logActivity({
      admin: req.admin,
      action: "service.create",
      section: "services",
      summary: `Создана услуга «${title}»`,
    });
    res.status(201).json({ success: true, data: service });
  }

  async updateService(req, res) {
    const service = await Service.findByPk(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: "Услуга не найдена" });
    }
    const { slug, title, short_description, description, cover_image_url, status, sort_order, detail_json } =
      req.body;
    if (cover_image_url && service.cover_image_url && cover_image_url !== service.cover_image_url) {
      removeUploadedFile(service.cover_image_url);
    }
    await service.update({
      slug: slug ?? service.slug,
      title: title ?? service.title,
      short_description: short_description ?? service.short_description,
      description: description ?? service.description,
      cover_image_url: cover_image_url ?? service.cover_image_url,
      status: status ?? service.status,
      sort_order: sort_order ?? service.sort_order,
      detail_json: detail_json ?? service.detail_json,
      updated_at: new Date(),
    });
    await logActivity({
      admin: req.admin,
      action: "service.update",
      section: "services",
      summary: `Обновлена услуга «${service.title}»`,
    });
    res.json({ success: true, data: service });
  }

  async deleteService(req, res) {
    const service = await Service.findByPk(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: "Услуга не найдена" });
    }
    removeUploadedFile(service.cover_image_url);
    await service.destroy();
    await logActivity({
      admin: req.admin,
      action: "service.delete",
      section: "services",
      summary: `Удалена услуга «${service.title}»`,
    });
    res.json({ success: true });
  }

  // ==================== ЗАКАЗЫ ====================

  async listOrders(req, res) {
    const { status, archived, q } = req.query;
    const where = {};

    if (status && status !== "all") where.status = status;

    if (archived === "true") where.is_archived = true;
    else if (archived !== "all") where.is_archived = false;

    if (q) {
      where[Op.or] = [
        { order_number: { [Op.iLike]: `%${q}%` } },
        { contact_name: { [Op.iLike]: `%${q}%` } },
        { contact_email: { [Op.iLike]: `%${q}%` } },
        { contact_telegram: { [Op.iLike]: `%${q}%` } },
      ];
    }

    const orders = await Order.findAll({
      where,
      include: [{ model: Service, as: "service" }],
      order: [["submitted_at", "DESC"]],
    });
    res.json({ success: true, data: orders });
  }

  async getOrderDetail(req, res) {
    const order = await Order.findByPk(req.params.id, {
      include: [{ model: Service, as: "service" }],
    });
    if (!order) {
      return res.status(404).json({ success: false, message: "Заказ не найден" });
    }

    const [files, messages, statusHistory] = await Promise.all([
      OrderFile.findAll({ where: { order_id: order.id }, order: [["created_at", "ASC"]] }),
      OrderMessage.findAll({ where: { order_id: order.id }, order: [["created_at", "ASC"]] }),
      OrderStatusHistory.findAll({ where: { order_id: order.id }, order: [["created_at", "ASC"]] }),
    ]);

    // Открыв заказ, админ тем самым прочитал сообщения клиента —
    // отмечаем их прочитанными, как getNotifications отмечает уведомления посетителя.
    await OrderMessage.update(
      { is_read_by_admin: true },
      { where: { order_id: order.id, sender: "customer", is_read_by_admin: false } },
    );

    res.json({ success: true, data: { order, files, messages, statusHistory } });
  }

  async changeStatus(req, res) {
    const order = await Order.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Заказ не найден" });
    }

    const { status, note } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: "Нужен status" });
    }

    const allowed = ALLOWED_TRANSITIONS[order.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Переход из статуса «${order.status}» в «${status}» не разрешён`,
      });
    }

    const fromStatus = order.status;
    await OrderStatusHistory.create({
      order_id: order.id,
      from_status: fromStatus,
      to_status: status,
      admin_id: req.admin.sub,
      note: note || null,
    });
    await order.update({ status, updated_at: new Date() });

    await logActivity({
      admin: req.admin,
      action: "order.status",
      section: "orders",
      summary: `Заказ ${order.order_number}: «${fromStatus}» → «${status}»`,
    });

    res.json({ success: true, data: order });
  }

  async setPricing(req, res) {
    const order = await Order.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Заказ не найден" });
    }

    const { agreed_price, agreed_deadline } = req.body;
    await order.update({
      agreed_price: agreed_price ?? order.agreed_price,
      agreed_deadline: agreed_deadline ?? order.agreed_deadline,
      updated_at: new Date(),
    });

    await logActivity({
      admin: req.admin,
      action: "order.pricing",
      section: "orders",
      summary: `Заказ ${order.order_number}: цена/срок согласованы`,
    });

    res.json({ success: true, data: order });
  }

  async uploadDeliveredFiles(req, res) {
    const order = await Order.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Заказ не найден" });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "Файлы не получены" });
    }

    const created = await Promise.all(
      req.files.map((file) =>
        OrderFile.create({
          order_id: order.id,
          kind: "delivered",
          file_name: file.filename,
          file_url: `/uploads/${file.filename}`,
          mime_type: file.mimetype,
          size_bytes: file.size,
          uploaded_by: "admin",
        }),
      ),
    );

    await logActivity({
      admin: req.admin,
      action: "order.deliver_file",
      section: "orders",
      summary: `Заказ ${order.order_number}: загружен(ы) готовый файл(ы) (${created.length})`,
    });

    res.status(201).json({ success: true, data: created });
  }

  async postAdminMessage(req, res) {
    const order = await Order.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Заказ не найден" });
    }
    const { body } = req.body;
    if (!body || !body.trim()) {
      return res.status(400).json({ success: false, message: "Нужен текст сообщения" });
    }

    const message = await OrderMessage.create({
      order_id: order.id,
      sender: "admin",
      admin_id: req.admin.sub,
      body: body.trim(),
      is_read_by_customer: false,
      is_read_by_admin: true,
    });

    res.status(201).json({ success: true, data: message });
  }

  async archiveOrder(req, res) {
    const order = await Order.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Заказ не найден" });
    }
    await order.update({ is_archived: !order.is_archived, updated_at: new Date() });

    await logActivity({
      admin: req.admin,
      action: "order.archive",
      section: "orders",
      summary: `Заказ ${order.order_number}: ${order.is_archived ? "отправлен в архив" : "возвращён из архива"}`,
    });

    res.json({ success: true, data: order });
  }

  async unreadOrdersCount(req, res) {
    const count = await Order.count({ where: { status: "new", is_archived: false } });
    res.json({ success: true, data: { count } });
  }
}

module.exports = new OrderAdminController();
