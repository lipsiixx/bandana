import React, { useEffect, useState } from "react";
import style from "./ReviewsSection.module.css";
import Title from "../../shared/ui/Title/Title";
import LoadError from "../../shared/ui/LoadError/LoadError";
import api from "../../shared/api/api";

const ReviewsSection = () => {
  const [reviews, setReviews] = useState([]);
  const [masterClasses, setMasterClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedMasterClass, setSelectedMasterClass] = useState("all");
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    limit: 10,
  });

  const [formData, setFormData] = useState({
    author_name: "",
    rating: 5,
    content: "",
  });
  const [formMessage, setFormMessage] = useState({ type: "", text: "" });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchMasterClasses();
    fetchReviews();
    // Перезагружаем при смене выбранного МК и страницы; fetch-функции
    // стабильны по поведению и намеренно не включены в зависимости.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMasterClass, pagination.page]);

  const fetchMasterClasses = async () => {
    try {
      const response = await api.getMasterClasses();
      let classes = [];
      if (response?.success && Array.isArray(response.data)) {
        classes = response.data.filter((item) => item.is_archived !== true);
      } else if (Array.isArray(response)) {
        classes = response.filter((item) => item.is_archived !== true);
      }
      setMasterClasses(classes);
    } catch (err) {
      console.error("Ошибка загрузки мастер-классов:", err);
    }
  };

  const fetchReviews = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const masterClassId =
        selectedMasterClass === "all" ? null : selectedMasterClass;

      let response;
      if (masterClassId) {
        response = await api.getMasterClassReviews(
          masterClassId,
          pagination.page,
          pagination.limit,
        );
      } else {
        response = await api.getPublishedReviews(
          null,
          pagination.page,
          pagination.limit,
        );
      }

      if (response?.error) {
        setLoadError(true);
      }

      if (response?.success && Array.isArray(response.data)) {
        setReviews(response.data);
        if (response.pagination) {
          setPagination({
            page: response.pagination.page,
            pages: response.pagination.pages,
            total: response.pagination.total,
            limit: response.pagination.limit,
          });
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
  };

  const handleFilterChange = (e) => {
    setSelectedMasterClass(e.target.value);
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

    if (selectedMasterClass === "all") {
      setFormMessage({
        type: "error",
        text: "Пожалуйста, выберите мастер-класс",
      });
      setSubmitting(false);
      return;
    }

    if (!formData.author_name.trim()) {
      setFormMessage({ type: "error", text: "Введите ваше имя" });
      setSubmitting(false);
      return;
    }
    if (formData.author_name.length < 2 || formData.author_name.length > 50) {
      setFormMessage({
        type: "error",
        text: "Имя должно быть от 2 до 50 символов",
      });
      setSubmitting(false);
      return;
    }
    if (!formData.content.trim()) {
      setFormMessage({ type: "error", text: "Введите текст отзыва" });
      setSubmitting(false);
      return;
    }
    if (formData.content.length < 1 || formData.content.length > 2000) {
      setFormMessage({
        type: "error",
        text: "Текст отзыва должен быть от 1 до 2000 символов",
      });
      setSubmitting(false);
      return;
    }

    try {
      const response = await api.sendMasterClassReview(selectedMasterClass, {
        author_name: formData.author_name,
        rating: formData.rating,
        content: formData.content,
      });

      if (response?.success) {
        setFormMessage({
          type: "success",
          text: "Спасибо! Отзыв появится после проверки",
        });
        setFormData({ author_name: "", rating: 5, content: "" });
        setShowForm(false);
        setTimeout(() => {
          fetchReviews();
        }, 2000);
      } else {
        let errorText = response?.message || "Ошибка при отправке";
        if (errorText.includes("Слишком много")) {
          errorText = "⚠️ " + errorText;
        } else if (errorText.includes("заблокированы")) {
          errorText = "🔨 " + errorText;
        } else if (errorText.includes("уже оставляли")) {
          errorText = "📝 " + errorText;
        }
        setFormMessage({ type: "error", text: errorText });
      }
    } catch (err) {
      console.error("Ошибка:", err);
      let errorText = "❌ Ошибка при отправке отзыва";
      if (err.response?.status === 429) {
        errorText =
          "⚠️ Слишком много отзывов. Вы можете оставить не более 3 отзывов в час.";
      } else if (err.response?.status === 403) {
        errorText = "🔨 " + (err.response?.data?.message || "Вы заблокированы");
      } else if (err.response?.status === 400) {
        errorText =
          "📝 " + (err.response?.data?.message || "Вы уже оставляли отзыв");
      } else if (err.response?.data?.message) {
        errorText = err.response.data.message;
      }
      setFormMessage({ type: "error", text: errorText });
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating) => {
    return (
      <div className={style.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={star <= rating ? style.starFilled : style.starEmpty}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  const renderRatingInput = () => {
    return (
      <div className={style.ratingInput}>
        <label>Оценка</label>
        <div className={style.starsInput}>
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={
                star <= formData.rating ? style.starFilled : style.starEmpty
              }
              onClick={() => handleRatingClick(star)}
              style={{ cursor: "pointer" }}
            >
              ★
            </span>
          ))}
        </div>
      </div>
    );
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  /* Сводка «4,9 · N отзывов» — считается по загруженным отзывам,
     показывается от 3 отзывов (правило «реальное значение или скрыто») */
  const avgRating =
    reviews.length > 0
      ? (
          reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
        ).toLocaleString("ru-RU", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })
      : null;
  const showSummary =
    !loading && !loadError && pagination.total >= 3 && avgRating;

  return (
    <div className={style.reviewsPage}>
      <Title text="Отзывы" overline="Говорят ученики и родители" />

      {showSummary && (
        <div className={style.summary}>
          <span className={style.summaryRating}>{avgRating}</span>
          <span className={style.summaryCount}>
            {pagination.total}{" "}
            {pagination.total % 10 === 1 && pagination.total % 100 !== 11
              ? "отзыв"
              : [2, 3, 4].includes(pagination.total % 10) &&
                  ![12, 13, 14].includes(pagination.total % 100)
                ? "отзыва"
                : "отзывов"}
          </span>
        </div>
      )}

      <div className={style.content}>
        {/* Фильтр и кнопка */}
        <div className={style.filterSection}>
          <div className={style.filterGroup}>
            <label>Фильтр по мастер-классу:</label>
            <select
              value={selectedMasterClass}
              onChange={handleFilterChange}
              className={style.filterSelect}
            >
              <option value="all">Все мастер-классы</option>
              {masterClasses.map((mc) => (
                <option key={mc.id} value={mc.id}>
                  {mc.name}{" "}
                  {mc.event_date &&
                    `(${new Date(mc.event_date).toLocaleDateString("ru-RU")})`}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className={style.addReviewBtn}
          >
            {showForm ? "Отменить" : "Оставить отзыв"}
          </button>
        </div>

        {/* Форма добавления отзыва */}
        {showForm && (
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
                <label>Выберите мастер-класс *</label>
                <select
                  value={
                    selectedMasterClass === "all" ? "" : selectedMasterClass
                  }
                  onChange={(e) => setSelectedMasterClass(e.target.value)}
                  className={style.formInput}
                  required
                >
                  <option value="" disabled>
                    Выберите мастер-класс
                  </option>
                  {masterClasses.map((mc) => (
                    <option key={mc.id} value={mc.id}>
                      {mc.name}{" "}
                      {mc.event_date &&
                        `(${new Date(mc.event_date).toLocaleDateString("ru-RU")})`}
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
                  placeholder="Поделитесь впечатлениями о мастер-классе..."
                  className={style.formTextarea}
                  rows="5"
                  maxLength="2000"
                />
              </div>

              {formMessage.text && (
                <div
                  className={`${style.formMessage} ${style[formMessage.type]}`}
                >
                  {formMessage.text}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className={style.submitBtn}
              >
                {submitting ? "Отправка..." : "Отправить отзыв"}
              </button>
            </form>
          </div>
        )}

        {/* Список отзывов */}
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
              <p className={style.emptySubtext}>
                Будьте первым, кто оставит отзыв!
              </p>
            </div>
          ) : (
            <>
              {reviews.map((review) => (
                <div key={review.id} className={style.reviewCard}>
                  <div className={style.reviewHeader}>
                    <div className={style.reviewerInfo}>
                      <span className={style.reviewerName}>
                        {review.author_name}
                      </span>
                      {review.master_class_name && (
                        <span className={style.reviewMasterClass}>
                          {review.master_class_name}
                          {review.master_class_date && (
                            <> • {formatDate(review.master_class_date)}</>
                          )}
                        </span>
                      )}
                      <span className={style.reviewDate}>
                        {formatDate(review.submitted_at)}
                      </span>
                    </div>
                    {renderStars(review.rating)}
                  </div>
                  <p className={style.reviewContent}>{review.content}</p>
                </div>
              ))}

              {pagination.pages > 1 && (
                <div className={style.pagination}>
                  <button
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: prev.page - 1,
                      }))
                    }
                    disabled={pagination.page === 1}
                    className={style.paginationBtn}
                  >
                    ← Назад
                  </button>
                  <span className={style.paginationInfo}>
                    Страница {pagination.page} из {pagination.pages}
                  </span>
                  <button
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: prev.page + 1,
                      }))
                    }
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
