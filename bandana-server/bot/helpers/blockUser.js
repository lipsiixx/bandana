const Review = require("../../models/review");
const { Op } = require("sequelize");

/**
 * Блокирует пользователя по ID отзыва
 * @param {number} reviewId - ID отзыва
 * @param {string} reason - Причина блокировки
 * @returns {Object} - Информация о блокировке
 */
async function blockUserByReview(reviewId, reason = "Нарушение правил") {
  const review = await Review.findByPk(reviewId);
  if (!review) {
    throw new Error("Отзыв не найден");
  }

  // Формируем условие для поиска всех записей пользователя
  const orCondition = [];
  if (review.cookie_id) orCondition.push({ cookie_id: review.cookie_id });
  if (review.ip_address) orCondition.push({ ip_address: review.ip_address });

  if (orCondition.length === 0) {
    throw new Error("Нет данных для блокировки пользователя");
  }

  // Блокируем все записи пользователя
  const [updatedCount] = await Review.update(
    {
      is_blocked: true,
      blocked_at: new Date(),
      blocked_reason: reason,
      status: "blocked",
    },
    { where: { [Op.or]: orCondition } },
  );

  // Удаляем pending/approved отзывы
  const deletedCount = await Review.destroy({
    where: {
      [Op.or]: orCondition,
      status: { [Op.in]: ["pending", "approved"] },
    },
  });

  return {
    review,
    updatedCount,
    deletedCount,
    reason,
    cookieId: review.cookie_id,
    ipAddress: review.ip_address,
    authorName: review.author_name,
  };
}

module.exports = { blockUserByReview };
