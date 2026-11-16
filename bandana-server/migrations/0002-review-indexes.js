"use strict";

/**
 * Индексы под реальные запросы к MasterClassReviews
 * (controller/userController.js, middleware/reviewRateLimiter.js):
 *   - getPublishedReviews: WHERE status = 'approved' [AND master_class_id = ?]
 *     ORDER BY submitted_at DESC                      -> master_class_id+status+submitted_at
 *   - reviewRateLimiter (блокировка): WHERE cookie_id/ip_address IN (...)
 *     AND is_blocked = true AND blocked_at > ...       -> cookie_id+is_blocked+blocked_at
 *   - reviewRateLimiter (лимит 3/час): WHERE cookie_id/ip_address IN (...)
 *     AND submitted_at >= ... AND status IN (...)      -> cookie_id+submitted_at
 *   - дубликат отзыва: WHERE master_class_id = ? AND cookie_id = ? AND status IN (...)
 *
 * Все CREATE/DROP через IF [NOT] EXISTS — идемпотентно и безопасно
 * на уже заполненной проде (ничего не блокирует надолго, не трогает данные).
 */

const INDEXES = [
  {
    name: "idx_master_class_reviews_cookie_id",
    columns: ["cookie_id"],
  },
  {
    name: "idx_master_class_reviews_ip_address",
    columns: ["ip_address"],
  },
  {
    name: "idx_master_class_reviews_status",
    columns: ["status"],
  },
  {
    name: "idx_master_class_reviews_submitted_at",
    columns: ["submitted_at"],
  },
  {
    name: "idx_master_class_reviews_mc_status_submitted",
    columns: ["master_class_id", "status", "submitted_at"],
  },
  {
    name: "idx_master_class_reviews_cookie_submitted",
    columns: ["cookie_id", "submitted_at"],
  },
  {
    name: "idx_master_class_reviews_cookie_blocked",
    columns: ["cookie_id", "is_blocked", "blocked_at"],
  },
];

async function up({ context: sequelize }) {
  for (const { name, columns } of INDEXES) {
    const cols = columns.map((c) => `"${c}"`).join(", ");
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "${name}"
      ON "MasterClassReviews" (${cols});
    `);
  }
}

async function down({ context: sequelize }) {
  for (const { name } of INDEXES) {
    await sequelize.query(`DROP INDEX IF EXISTS "${name}";`);
  }
}

module.exports = { up, down };
