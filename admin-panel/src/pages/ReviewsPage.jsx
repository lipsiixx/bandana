import { useCallback, useEffect, useMemo, useState } from "react";
import { reviewsApi } from "../api/adminApi";
import styles from "./ReviewsPage.module.css";

const TABS = [
  { value: "pending", label: "На модерации" },
  { value: "approved", label: "Одобренные" },
  { value: "rejected", label: "Отклонённые" },
  { value: "blocked", label: "Заблокированные" },
  { value: "all", label: "Все" },
];

const TYPE_TABS = [
  { value: "all", label: "Все" },
  { value: "masterclass", label: "Мастер-классы" },
  { value: "service", label: "Услуги" },
  { value: "dance_class", label: "Занятия" },
];

const SPAM_PATTERNS = [/https?:\/\//i, /www\./i, /скидк/i, /перейд.*ссылк/i, /!!!+/];

function isSpamLike(content) {
  return SPAM_PATTERNS.some((re) => re.test(content || ""));
}

function stars(rating) {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

// Три категории отзывов денормализуют название предмета в разные колонки.
function subjectName(review) {
  if (review.review_type === "service") return review.service_title || "услуге";
  if (review.review_type === "dance_class") return review.dance_class_name || "занятию";
  return review.master_class_name || "мастер-классу";
}

export default function ReviewsPage() {
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("pending");
  const [reviewType, setReviewType] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [checked, setChecked] = useState(() => new Set());
  const [history, setHistory] = useState([]);

  async function load() {
    setLoading(true);
    try {
      const res = await reviewsApi.list("all", "all");
      setAll(res.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Не удалось загрузить отзывы");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const byType = useMemo(
    () => (reviewType === "all" ? all : all.filter((r) => r.review_type === reviewType)),
    [all, reviewType],
  );

  const byTab = useMemo(() => {
    const groups = { pending: [], approved: [], rejected: [], blocked: [], all: byType };
    for (const r of byType) {
      if (r.is_blocked) groups.blocked.push(r);
      if (groups[r.status]) groups[r.status].push(r);
    }
    return groups;
  }, [byType]);

  const visible = useMemo(() => {
    const list = byTab[tab] || [];
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(
      (r) =>
        r.content?.toLowerCase().includes(q) ||
        r.author_name?.toLowerCase().includes(q) ||
        subjectName(r).toLowerCase().includes(q),
    );
  }, [byTab, tab, search]);

  const selected = visible.find((r) => r.id === selectedId) || visible[0] || null;

  useEffect(() => {
    if (!selected?.cookie_id) {
      setHistory([]);
      return;
    }
    reviewsApi
      .byVisitor(selected.cookie_id)
      .then((res) => setHistory(res.data || []))
      .catch(() => setHistory([]));
  }, [selected?.cookie_id]);

  const visitorReviewCount = history.length;
  const wasBlockedBefore = history.some((h) => h.blocked_reason);

  function toggleChecked(id) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const moveSelection = useCallback(
    (dir) => {
      const idx = visible.findIndex((r) => r.id === selected?.id);
      const next = visible[idx + dir];
      if (next) setSelectedId(next.id);
    },
    [visible, selected],
  );

  async function handleApprove(id) {
    await reviewsApi.approve(id);
    await load();
  }

  async function handleReject(id) {
    const reason = window.prompt("Причина отклонения:", "Не указана");
    if (reason === null) return;
    await reviewsApi.reject(id, reason);
    await load();
  }

  async function handleBlock(id) {
    const reason = window.prompt("Причина блокировки:", "Нарушение правил сообщества");
    if (reason === null) return;
    await reviewsApi.block(id, reason);
    await load();
  }

  async function handleBulkApprove() {
    for (const id of checked) await reviewsApi.approve(id);
    setChecked(new Set());
    await load();
  }

  async function handleBulkReject() {
    const reason = window.prompt("Причина отклонения для всех выбранных:", "Не указана");
    if (reason === null) return;
    for (const id of checked) await reviewsApi.reject(id, reason);
    setChecked(new Set());
    await load();
  }

  useEffect(() => {
    function onKeyDown(e) {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || !selected) return;
      if (e.key.toLowerCase() === "a" && tab === "pending") handleApprove(selected.id);
      else if (e.key.toLowerCase() === "r" && tab === "pending") handleReject(selected.id);
      else if (e.key.toLowerCase() === "b") handleBlock(selected.id);
      else if (e.key.toLowerCase() === "j") moveSelection(1);
      else if (e.key.toLowerCase() === "k") moveSelection(-1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, tab, moveSelection]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className="h" style={{ margin: 0, fontSize: 28, fontWeight: 600 }}>
            Отзывы
          </h1>
          <div className={`muted ${styles.shortcuts}`}>
            С клавиатуры: <kbd>A</kbd> одобрить · <kbd>R</kbd> отклонить · <kbd>B</kbd> заблокировать ·{" "}
            <kbd>J</kbd>/<kbd>K</kbd> следующий
          </div>
        </div>
        <input
          className="inp"
          style={{ width: "min(240px,100%)" }}
          placeholder="Текст, имя или предмет отзыва"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </header>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className="seg" role="tablist" aria-label="Категория отзыва">
        {TYPE_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={reviewType === t.value}
            className={reviewType === t.value ? "on" : ""}
            onClick={() => {
              setReviewType(t.value);
              setChecked(new Set());
              setSelectedId(null);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tablist" aria-label="Статус" className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.value}
            className={`tab ${tab === t.value ? "on" : ""}`}
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => {
              setTab(t.value);
              setChecked(new Set());
              setSelectedId(null);
            }}
          >
            {t.label} <span className="cnt">{byTab[t.value]?.length ?? 0}</span>
          </button>
        ))}
      </div>

      <div className={styles.body}>
        <section aria-label="Очередь" className={styles.queue}>
          {checked.size > 0 && (
            <div className={styles.bulkBar}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Выбрано {checked.size}</span>
              {tab === "pending" && (
                <>
                  <button className="btn pri" style={{ minHeight: 34, padding: "0 12px" }} onClick={handleBulkApprove}>
                    Одобрить
                  </button>
                  <button className="btn" style={{ minHeight: 34, padding: "0 12px" }} onClick={handleBulkReject}>
                    Отклонить
                  </button>
                </>
              )}
              <button className="btn ghost icon" style={{ marginLeft: "auto", minHeight: 34 }} aria-label="Снять выделение" onClick={() => setChecked(new Set())}>
                ✕
              </button>
            </div>
          )}

          {loading ? (
            <div className="muted">Загрузка...</div>
          ) : visible.length === 0 ? (
            <div className="empty">
              <div style={{ fontWeight: 700 }}>Здесь пусто</div>
              <div className="muted" style={{ fontSize: 13 }}>
                В этой вкладке пока нет отзывов.
              </div>
            </div>
          ) : (
            visible.map((r) => {
              const spam = isSpamLike(r.content);
              return (
                <div
                  key={r.id}
                  className={`${styles.rv} ${selected?.id === r.id ? styles.rvSelected : ""}`}
                  onClick={() => setSelectedId(r.id)}
                >
                  <input
                    type="checkbox"
                    className={styles.cb}
                    aria-label="Выбрать отзыв"
                    checked={checked.has(r.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleChecked(r.id)}
                  />
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700 }}>{r.author_name}</span>
                      {spam && <span className="badge warning sm">похоже на спам</span>}
                      <span className="muted" style={{ marginLeft: "auto", fontSize: 12 }}>
                        {new Date(r.submitted_at).toLocaleDateString("ru-RU")}
                      </span>
                    </div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      к «{subjectName(r)}» · {stars(r.rating)}
                    </div>
                    <div className={styles.clamp}>{r.content}</div>
                  </div>
                </div>
              );
            })
          )}
        </section>

        {selected && (
          <section className={`card ${styles.detail}`} aria-label="Выбранный отзыв">
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
              <span className={styles.avatar}>{selected.author_name?.charAt(0).toUpperCase()}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span className="h" style={{ fontSize: 18, fontWeight: 600 }}>
                    {selected.author_name}
                  </span>
                  {isSpamLike(selected.content) && <span className="badge warning">похоже на спам</span>}
                  {wasBlockedBefore && <span className="badge danger">ранее блокировался</span>}
                </div>
                <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                  {new Date(selected.submitted_at).toLocaleString("ru-RU")}
                  {selected.cookie_id && (
                    <>
                      {" "}
                      · посетитель <code style={{ color: "var(--accent-soft-text)" }}>v·{selected.cookie_id.slice(0, 8)}…</code>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent-soft-text)" }}>
              {subjectName(selected)} · {stars(selected.rating)}
            </div>

            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6 }}>{selected.content}</p>

            {selected.rejection_reason && (
              <div className="muted" style={{ fontSize: 13 }}>
                Причина отклонения: {selected.rejection_reason}
              </div>
            )}
            {selected.blocked_reason && (
              <div className="muted" style={{ fontSize: 13 }}>
                Причина блокировки: {selected.blocked_reason}
              </div>
            )}

            {tab === "pending" && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <button className="btn dng" style={{ minHeight: 44 }} onClick={() => handleBlock(selected.id)}>
                  Заблокировать посетителя <kbd>B</kbd>
                </button>
                <button className="btn" style={{ minHeight: 44 }} onClick={() => handleReject(selected.id)}>
                  Отклонить <kbd>R</kbd>
                </button>
                <button className="btn pri" style={{ minHeight: 44 }} onClick={() => handleApprove(selected.id)}>
                  Одобрить <kbd>A</kbd>
                </button>
              </div>
            )}

            {history.length > 0 && (
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <h2 className="h" style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
                    История посетителя
                  </h2>
                  <span className="muted" style={{ fontSize: 13 }}>
                    {visitorReviewCount} отзыв(ов)
                  </span>
                </div>
                {history.map((h) => (
                  <div className={styles.timeline} key={h.id}>
                    <span className="muted" style={{ width: 96, flex: "none" }}>
                      {new Date(h.submitted_at).toLocaleDateString("ru-RU")}
                    </span>
                    <span style={{ flex: 1 }}>
                      {h.blocked_reason ? `Заблокирован · причина: ${h.blocked_reason}` : `Отзыв к «${subjectName(h)}»`}
                    </span>
                    <span className={`badge ${h.status === "approved" ? "success" : h.status === "rejected" ? "neutral" : h.is_blocked ? "danger" : "purple"} sm`}>
                      {h.is_blocked ? "блок" : h.status === "pending" ? "на модерации" : h.status === "approved" ? "одобрен" : "отклонён"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
