import React, { useEffect, useState } from "react";
import style from "./ReviewsSection.module.css";
import Title from "../../shared/ui/Title/Title";
import LoadError from "../../shared/ui/LoadError/LoadError";
import api from "../../shared/api/api";

const CATEGORY_TABS = [
  { value: "masterclass", label: "Мастер-классы" },
  { value: "dance_class", label: "Занятия" },
  { value: "service", label: "Услуги" },
];

// Мастер-классы и занятия устроены одинаково (список сущностей для фильтра +
// форма + отзывы с пагинацией) — только разные эндпоинты. Услуги — отдельная
// ветка: отзыв оставляется на странице заказа, здесь только список.
const ENTITY_CONFIG = {
  masterclass: {
    filterLabel: "Фильтр по мастер-классу:",
    allLabel: "Все мастер-классы",
    pickLabel: "Выберите мастер-класс",
    getEntities: () => api.getMasterClasses(),
    getReviews: (id, page, limit) => api.getMasterClassReviews(id, page, limit),
    sendReview: (id, data) => api.sendMasterClassReview(id, data),
    entityDateField: "event_date",
  },
  dance_class: {
    filterLabel: "Фильтр по занятию:",
    allLabel: "Все занятия",
    pickLabel: "Выберите занятие",
    getEntities: () => api.getDanceClasses(),
    getReviews: (id, page, limit) => api.getDanceClassReviews(id, page, limit),
    sendReview: (id, data) => api.sendDanceClassReview(id, data),
    entityDateField: null,
  },
};

const ReviewsSection = () => {
  const [category, setCategory] = useState("masterclass");
  const [entities, setEntities] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState("all");
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 10 });

  const [formData, setFormData] = useState({ author_name: "", rating: 5, content: "" });
  const [formMessage, setFormMessage] = useState({ type: "", text: "" });
  const [showForm, setShowForm] = useState(false);

  const config = ENTITY_CONFIG[category];

  useEffect(() => {
    if (config) fetchEntities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, selectedEntity, pagination.page]);

  async function fetchEntities() {
    try {
      const response = await config.getEntities();
      const list = Array.isArray(response?.data) ? response.data : [];
      setEntities(list.filter((item) => item.is_archived !== true));
    } catch (err) {
      console.error("Ошибка загрузки списка:", err);
    }
  }

  async function fetchReviews() {
    setLoading(true);
    setLoadError(false);
    try {
      let response;
      if (category === "service") {
        response = await api.getServiceReviews("all", pagination.page, pagination.limit);
      } else {
        response = await config.getReviews(selectedEntity, pagination.page, pagination.limit);
      }

      if (response?.error) setLoadError(true);

      if (response?.success && Array.isArray(response.data)) {
        setReviews(response.data);
        if (response.pagination) {
          setPagination((prev) => ({ ...prev, ...response.pagination }));
        }
      } else {
        setReviews([]);
      }
    } catch (err) {
      console.error("Ошибка загрузки отзывов:", err);
      setReviews([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  function switchCategory(value) {
    setCategory(value);
    setSelectedEntity("all");
    setShowForm(false);
    setFormMessage({ type: "", text: "" });
    setPagination((prev) => ({ ...prev, page: 1 }));
  }

  const handleFilterChange = (e) => {
    setSelectedEntity(e.target.value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRatingClick = (rating) => {
    setFormData((prev) => ({ ...prev, rating }));
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormMessage({ type: "", text: "" });

    if (selectedEntity === "all") {
      setFormMessage({ type: "error", text: "Пожалуйста, выберите из списка" });
      setSubmitting(false);
      return;
    }
    if (!formData.author_name.trim()) {
      setFormMessage({ type: "error", text: "Введите ваше имя" });
      setSubmitting(false);
      return;
    }
    if (formData.author_name.length < 2 || formData.author_name.length > 50) {
      setFormMessage({ type: "error", text: "Имя должно быть от 2 до 50 символов" });
      setSubmitting(false);
      return;
    }
    if (!formData.content.trim()) {
      setFormMessage({ type: "error", text: "Введите текст отзыва" });
      setSubmitting(false);
      return;
    }
    if (formData.content.length < 1 || formData.content.length > 2000) {
      setFormMessage({ type: "error", text: "Текст отзыва должен быть от 1 до 2000 символов" });
      setSubmitting(false);
      return;
    }

    try {
      const response = await config.sendReview(selectedEntity, {
        author_name: formData.author_name,
        rating: formData.rating,
        content: formData.content,
      });

      if (response?.success) {
        setFormMessage({ type: "success", text: "Спасибо! Отзыв появится после проверки" });
        setFormData({ author_name: "", rating: 5, content: "" });
        setShowForm(false);
        setTimeout(() => fetchReviews(), 2000);
      } else {
        setFormMessage({ type: "error", text: response?.message || "Ошибка при отправке" });
      }
    } catch (err) {
      console.error("Ошибка:", err);
      setFormMessage({ type: "error", text: "Ошибка при отправке отзыва" });
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating) => (
    <div className={style.stars}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={star <= rating ? style.starFilled : style.starEmpty}>★</span>
      ))}
    </div>
  );

  const renderRatingInput = () => (
    <div className={style.ratingInput}>
      <label>Оценка</label>
      <div className={style.starsInput}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={star <= formData.rating ? style.starFilled : style.starEmpty}
            onClick={() => handleRatingClick(star)}
            style={{ cursor: "pointer" }}
          >
            ★
          </span>
        ))}
      </div>
    </div>
  );

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

  /* Сводка «4,9 · N отзывов» — считается по загруженным отзывам,
     показывается от 3 отзывов (правило «реальное значение или скрыто») */
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toLocaleString(
          "ru-RU",
          { minimumFractionDigits: 1, maximumFractionDigits: 1 },
        )
      : null;
  const showSummary = !loading && !loadError && pagination.total >= 3 && avgRating;

  function subjectLabel(review) {
    if (review.review_type === "service") return review.service_title;
    if (review.review_type === "dance_class") return review.dance_class_name;
    return review.master_class_name;
  }

  return (
    <div className={style.reviewsPage}>
      <Title text="Отзывы" overline="Говорят ученики и родители" />

      <div className={style.segment} role="tablist" aria-label="Категория отзывов">
        {CATEGORY_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={category === t.value}
            className={category === t.value ? style.segmentOn : style.segmentOff}
            onClick={() => switchCategory(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {showSummary && (
        <div className={style.summary}>
          <span className={style.summaryRating}>{avgRating}</span>
          <span className={style.summaryCount}>
            {pagination.total}{" "}
            {pagination.total % 10 === 1 && pagination.total % 100 !== 11
              ? "отзыв"
              : [2, 3, 4].includes(pagination.total % 10) && ![12, 13, 14].includes(pagination.total % 100)
                ? "отзыва"
                : "отзывов"}
          </span>
        </div>
      )}

      <div className={style.content}>
        {category === "service" ? (
          <p className={style.serviceHint}>
            Оставить отзыв об услуге можно на странице вашего заказа после завершения работы.
          </p>
        ) : (
          <div className={style.filterSection}>
            <div className={style.filterGroup}>
              <label>{config.filterLabel}</label>
              <select value={selectedEntity} onChange={handleFilterChange} className={style.filterSelect}>
                <option value="all">{config.allLabel}</option>
                {entities.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {config.entityDateField && item[config.entityDateField]
                      ? ` (${new Date(item[config.entityDateField]).toLocaleDateString("ru-RU")})`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            <button onClick={() => setShowForm(!showForm)} className={style.addReviewBtn}>
              {showForm ? "Отменить" : "Оставить отзыв"}
            </button>
          </div>
        )}

        {showForm && category !== "service" && (
          <div className={style.formContainer}>
            <h3>Оставить отзыв</h3>
            <form onSubmit={handleSubmitReview} className={style.reviewForm}>
              <div className={style.formGroup}>
                <label>Ваше имя *</label>
                <input
                  type="text"
                  name="author_name"
                  value={formData.author_name}
                  onChange={handleInputChange}
                  placeholder="Введите ваше имя"
                  className={style.formInput}
                  maxLength="50"
                />
              </div>

              <div className={style.formGroup}>
                <label>{config.pickLabel} *</label>
                <select
                  value={selectedEntity === "all" ? "" : selectedEntity}
                  onChange={(e) => setSelectedEntity(e.target.value)}
                  className={style.formInput}
                  required
                >
                  <option value="" disabled>
                    {config.pickLabel}
                  </option>
                  {entities.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              {renderRatingInput()}

              <div className={style.formGroup}>
                <label>Ваш отзыв *</label>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  placeholder="Поделитесь впечатлениями..."
                  className={style.formTextarea}
                  rows="5"
                  maxLength="2000"
                />
              </div>

              {formMessage.text && (
                <div className={`${style.formMessage} ${style[formMessage.type]}`}>{formMessage.text}</div>
              )}

              <button type="submit" disabled={submitting} className={style.submitBtn}>
                {submitting ? "Отправка..." : "Отправить отзыв"}
              </button>
            </form>
          </div>
        )}

        <div className={style.reviewsList}>
          {loading ? (
            <div className={style.skeletonContainer}>
              {[1, 2, 3].map((i) => (
                <div key={i} className={style.skeletonCard}>
                  <div className={style.skeletonHeader}></div>
                  <div className={style.skeletonStars}></div>
                  <div className={style.skeletonText}></div>
                </div>
              ))}
            </div>
          ) : loadError ? (
            <LoadError />
          ) : reviews.length === 0 ? (
            <div className={style.emptyReviews}>
              <span className={style.emptyIcon}>💬</span>
              <p>Пока нет отзывов</p>
              {category !== "service" && (
                <p className={style.emptySubtext}>Будьте первым, кто оставит отзыв!</p>
              )}
            </div>
          ) : (
            <>
              {reviews.map((review) => (
                <div key={review.id} className={style.reviewCard}>
                  <div className={style.reviewHeader}>
                    <div className={style.reviewerInfo}>
                      <span className={style.reviewerName}>{review.author_name}</span>
                      {subjectLabel(review) && (
                        <span className={style.reviewMasterClass}>{subjectLabel(review)}</span>
                      )}
                      <span className={style.reviewDate}>{formatDate(review.submitted_at)}</span>
                    </div>
                    {renderStars(review.rating)}
                  </div>
                  <p className={style.reviewContent}>{review.content}</p>
                </div>
              ))}

              {pagination.pages > 1 && (
                <div className={style.pagination}>
                  <button
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className={style.paginationBtn}
                  >
                    ← Назад
                  </button>
                  <span className={style.paginationInfo}>
                    Страница {pagination.page} из {pagination.pages}
                  </span>
                  <button
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.pages}
                    className={style.paginationBtn}
                  >
                    Вперед →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewsSection;
