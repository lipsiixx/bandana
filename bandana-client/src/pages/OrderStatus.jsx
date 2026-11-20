import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "../widget/Header/ui/Header.jsx";
import ApiService from "../shared/api/api";
import pageStyles from "../shared/styles/page.module.css";
import style from "./OrderStatus.module.css";

const STATUS_LABELS = {
  new: "Новый",
  in_review: "На рассмотрении",
  clarifying_details: "Уточнение деталей",
  pricing_agreement: "Согласование цены/сроков",
  confirmed: "Заказ подтверждён",
  in_progress: "В работе",
  revision: "Доработка",
  ready: "Готов",
  completed: "Завершён",
  cancelled: "Отменён",
};

function formatDate(value) {
  if (!value) return null;
  return new Date(value).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
}

function formatDateOnly(value) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("ru-RU");
}

const OrderStatus = () => {
  const { token } = useParams();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [payload, setPayload] = useState(null);

  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState("");
  const [reviewAuthorName, setReviewAuthorName] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState(null);

  async function load() {
    const res = await ApiService.getOrderStatus(token);
    if (res?.success && res.data) {
      setPayload(res.data);
      setNotFound(false);
      setLoadError(false);
    } else if (res?.error) {
      setLoadError(true);
    } else {
      setNotFound(true);
    }
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    document.title = payload ? `Заказ ${payload.order.orderNumber} — BANDANA` : "Заказ — BANDANA";
    if (payload?.order?.contactName) setReviewAuthorName((prev) => prev || payload.order.contactName);
  }, [payload]);

  async function handleSubmitReview() {
    setReviewError(null);
    if (!reviewAuthorName.trim()) {
      setReviewError("Укажите имя");
      return;
    }
    if (!reviewContent.trim()) {
      setReviewError("Напишите текст отзыва");
      return;
    }
    setReviewSubmitting(true);
    const res = await ApiService.submitOrderReview(token, {
      rating: reviewRating,
      content: reviewContent.trim(),
      author_name: reviewAuthorName.trim(),
    });
    setReviewSubmitting(false);
    if (res?.success) {
      await load();
    } else {
      setReviewError(res?.message || "Не удалось отправить отзыв");
    }
  }

  async function handleSendMessage() {
    if (!messageInput.trim()) return;
    setSending(true);
    setSendError(null);
    const res = await ApiService.postOrderMessage(token, messageInput.trim());
    setSending(false);
    if (res?.success) {
      setMessageInput("");
      await load();
    } else {
      setSendError(res?.message || "Не удалось отправить сообщение");
    }
  }

  // Enter — отправить, Shift+Enter — новая строка (как в привычных чатах)
  function handleMessageKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  return (
    <div>
      <Header />
      <main className={pageStyles.page}>
        <div className={pageStyles.inner}>
          {loading ? (
            <div className={style.skeleton} />
          ) : loadError ? (
            <div className={style.notFound}>
              <h2 className={style.notFoundTitle}>Сервер временно недоступен</h2>
              <p className={style.notFoundText}>Попробуйте обновить страницу чуть позже.</p>
              <button type="button" className={style.retryBtn} onClick={() => window.location.reload()}>
                Обновить
              </button>
            </div>
          ) : notFound ? (
            <div className={style.notFound}>
              <h2 className={style.notFoundTitle}>Заказ не найден</h2>
              <p className={style.notFoundText}>
                Ссылка недействительна или устарела. Проверьте, что скопировали её полностью.
              </p>
            </div>
          ) : (
            <>
              <p className="bd-overline">{payload.service?.title}</p>
              <h1 className={style.title}>Заказ {payload.order.orderNumber}</h1>

              <div className={style.statusCard}>
                <span className={style.statusBadge}>{STATUS_LABELS[payload.order.status] || payload.order.status}</span>
                {(payload.order.agreedPrice || payload.order.agreedDeadline) && (
                  <div className={style.agreedRow}>
                    {payload.order.agreedPrice && (
                      <span>
                        Стоимость: <strong>{payload.order.agreedPrice.toLocaleString("ru-RU")} ₽</strong>
                      </span>
                    )}
                    {payload.order.agreedDeadline && (
                      <span>
                        Срок: <strong>{formatDateOnly(payload.order.agreedDeadline)}</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {payload.files.some((f) => f.kind === "delivered") && (
                <section className={style.section}>
                  <h3 className={style.sectionTitle}>Готовые файлы</h3>
                  <ul className={style.fileList}>
                    {payload.files
                      .filter((f) => f.kind === "delivered")
                      .map((f) => (
                        <li key={f.id}>
                          <a href={f.fileUrl} target="_blank" rel="noreferrer">
                            ✅ {f.fileName}
                          </a>
                        </li>
                      ))}
                  </ul>
                </section>
              )}

              {payload.review && (
                <section className={style.section}>
                  <h3 className={style.sectionTitle}>Ваш отзыв</h3>
                  <div className={style.reviewCard}>
                    <div className={style.stars}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span key={s} className={s <= payload.review.rating ? style.starOn : style.starOff}>★</span>
                      ))}
                    </div>
                    <p>{payload.review.content}</p>
                    <span className="muted" style={{ fontSize: "0.85rem" }}>
                      {payload.review.status === "approved"
                        ? "Опубликован"
                        : payload.review.status === "rejected"
                          ? "Отклонён модератором"
                          : "На модерации"}
                    </span>
                  </div>
                </section>
              )}

              {payload.canReview && (
                <section className={style.section}>
                  <h3 className={style.sectionTitle}>Оставить отзыв</h3>
                  <div className={style.stars}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span
                        key={s}
                        className={s <= reviewRating ? style.starOn : style.starOff}
                        style={{ cursor: "pointer" }}
                        onClick={() => setReviewRating(s)}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <input
                    className={style.input}
                    style={{ marginTop: "var(--sp-3)" }}
                    placeholder="Ваше имя"
                    value={reviewAuthorName}
                    onChange={(e) => setReviewAuthorName(e.target.value)}
                  />
                  <textarea
                    className={style.input}
                    style={{ marginTop: "var(--sp-3)" }}
                    rows={3}
                    placeholder="Как вам результат?"
                    value={reviewContent}
                    onChange={(e) => setReviewContent(e.target.value)}
                  />
                  <button
                    type="button"
                    className={style.sendBtn}
                    style={{ marginTop: "var(--sp-3)" }}
                    onClick={handleSubmitReview}
                    disabled={reviewSubmitting}
                  >
                    Отправить отзыв
                  </button>
                  {reviewError && <p className={style.error}>{reviewError}</p>}
                </section>
              )}

              <section className={style.section}>
                <h3 className={style.sectionTitle}>Переписка</h3>
                {payload.messages.length === 0 ? (
                  <p className={style.hint}>Сообщений пока нет</p>
                ) : (
                  <div className={style.messages}>
                    {payload.messages.map((m) => (
                      <div
                        key={m.id}
                        className={`${style.msg} ${m.sender === "customer" ? style.msgMine : ""}`}
                      >
                        <div className={style.msgMeta}>
                          {m.sender === "admin" ? "BANDANA" : "Вы"} · {formatDate(m.createdAt)}
                        </div>
                        <div>{m.body}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div className={style.sendRow}>
                  <textarea
                    className={style.input}
                    rows={2}
                    placeholder="Написать сообщение"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={handleMessageKeyDown}
                  />
                  <button type="button" className={style.sendBtn} onClick={handleSendMessage} disabled={sending}>
                    Отправить
                  </button>
                </div>
                <p className={style.hint}>Enter — отправить, Shift+Enter — новая строка</p>
                {sendError && <p className={style.error}>{sendError}</p>}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default OrderStatus;
