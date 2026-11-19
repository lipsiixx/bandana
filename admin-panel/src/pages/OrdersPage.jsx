import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ordersApi } from "../api/adminApi";
import styles from "./OrdersPage.module.css";

const STATUS_LABELS = {
  new: "Новый",
  in_review: "На рассмотрении",
  clarifying_details: "Уточнение деталей",
  pricing_agreement: "Согласование цены/сроков",
  confirmed: "Подтверждён",
  in_progress: "В работе",
  revision: "Доработка",
  ready: "Готов",
  completed: "Завершён",
  cancelled: "Отменён",
};

const STATUS_BADGE = {
  new: "purple",
  in_review: "purple",
  clarifying_details: "warning",
  pricing_agreement: "warning",
  confirmed: "success",
  in_progress: "success",
  revision: "warning",
  ready: "success",
  completed: "neutral",
  cancelled: "danger",
};

// Зеркало ALLOWED_TRANSITIONS из controller/orderAdminController.js на сервере —
// используется только чтобы показать правильные кнопки, финальную проверку
// всё равно делает сервер.
const STATUS_FLOW = {
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

const FORMAT_LABELS = {
  dance_cut: "Dance Cut",
  mix_edit: "Mix Edit",
  performance_edit: "Performance Edit",
  custom_edit: "Custom Edit",
};

const TABS = [
  { value: "all", label: "Все" },
  { value: "new", label: "Новые" },
  { value: "in_review", label: "На рассмотрении" },
  { value: "clarifying_details", label: "Уточнение" },
  { value: "pricing_agreement", label: "Согласование" },
  { value: "confirmed", label: "Подтверждён" },
  { value: "in_progress", label: "В работе" },
  { value: "revision", label: "Доработка" },
  { value: "ready", label: "Готов" },
  { value: "completed", label: "Завершён" },
  { value: "cancelled", label: "Отменён" },
];

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
}

function formatDateOnly(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ru-RU");
}

export default function OrdersPage() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();

  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [selectedId, setSelectedId] = useState(routeId || null);

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [priceInput, setPriceInput] = useState("");
  const [deadlineInput, setDeadlineInput] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [deliverFiles, setDeliverFiles] = useState([]);
  const [deliverProgress, setDeliverProgress] = useState(0);
  const [deliverStatus, setDeliverStatus] = useState("idle"); // idle|uploading|error
  const [deliverError, setDeliverError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await ordersApi.list({ status: "all", archived: "all" });
      setAll(res.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Не удалось загрузить заказы");
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(id) {
    if (!id) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    try {
      const res = await ordersApi.get(id);
      setDetail(res.data);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (routeId) setSelectedId(routeId);
  }, [routeId]);

  useEffect(() => {
    loadDetail(selectedId);
  }, [selectedId]);

  useEffect(() => {
    setPriceInput(detail?.order?.agreed_price ?? "");
    setDeadlineInput(detail?.order?.agreed_deadline ? detail.order.agreed_deadline.slice(0, 10) : "");
  }, [detail?.order?.id]);

  const byArchive = useMemo(
    () => all.filter((o) => Boolean(o.is_archived) === showArchived),
    [all, showArchived],
  );

  const byTab = useMemo(() => {
    const groups = { all: byArchive };
    for (const t of TABS) if (t.value !== "all") groups[t.value] = [];
    for (const o of byArchive) if (groups[o.status]) groups[o.status].push(o);
    return groups;
  }, [byArchive]);

  const visible = useMemo(() => {
    const list = byTab[tab] || [];
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(
      (o) =>
        o.order_number?.toLowerCase().includes(q) ||
        o.contact_name?.toLowerCase().includes(q) ||
        o.contact_email?.toLowerCase().includes(q) ||
        o.contact_telegram?.toLowerCase().includes(q),
    );
  }, [byTab, tab, search]);

  function selectOrder(id) {
    setSelectedId(id);
    navigate(id ? `/orders/${id}` : "/orders");
  }

  async function refresh() {
    await load();
    await loadDetail(selectedId);
  }

  async function handleChangeStatus(status) {
    const needsNote = status === "cancelled" || status === "revision";
    let note = null;
    if (needsNote) {
      note = window.prompt(
        status === "cancelled" ? "Причина отмены (необязательно):" : "Комментарий к доработке (необязательно):",
        "",
      );
      if (note === null) return;
    }
    setBusy(true);
    try {
      await ordersApi.setStatus(selectedId, status, note || null);
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || "Не удалось изменить статус");
    } finally {
      setBusy(false);
    }
  }

  async function handleSavePricing() {
    setBusy(true);
    try {
      await ordersApi.setPricing(
        selectedId,
        priceInput === "" ? null : Number(priceInput),
        deadlineInput || null,
      );
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || "Не удалось сохранить цену/срок");
    } finally {
      setBusy(false);
    }
  }

  async function handleSendMessage() {
    if (!messageInput.trim()) return;
    setBusy(true);
    try {
      await ordersApi.sendMessage(selectedId, messageInput.trim());
      setMessageInput("");
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || "Не удалось отправить сообщение");
    } finally {
      setBusy(false);
    }
  }

  async function handleUploadDeliverables() {
    if (deliverFiles.length === 0) return;
    setDeliverStatus("uploading");
    setDeliverError(null);
    setDeliverProgress(0);
    try {
      await ordersApi.uploadFiles(selectedId, deliverFiles, setDeliverProgress);
      setDeliverFiles([]);
      setDeliverStatus("idle");
      await refresh();
    } catch (err) {
      setDeliverStatus("error");
      setDeliverError(err.response?.data?.message || "Не удалось загрузить файл(ы)");
    }
  }

  async function handleArchiveToggle() {
    setBusy(true);
    try {
      await ordersApi.archive(selectedId);
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || "Не удалось изменить архив");
    } finally {
      setBusy(false);
    }
  }

  const order = detail?.order;
  const nextStatuses = order ? STATUS_FLOW[order.status] || [] : [];
  const sourceFiles = (detail?.files || []).filter((f) => f.kind === "source");
  const deliveredFiles = (detail?.files || []).filter((f) => f.kind === "delivered");

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className="h" style={{ margin: 0, fontSize: 28, fontWeight: 600 }}>
            Заказы
          </h1>
          <div className="muted" style={{ fontSize: 14, marginTop: 8 }}>
            Заявки с публичной формы заказа услуг
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#c8c8d6" }}>
            <input
              type="checkbox"
              style={{ accentColor: "var(--accent)", width: 18, height: 18 }}
              checked={showArchived}
              onChange={(e) => {
                setShowArchived(e.target.checked);
                selectOrder(null);
              }}
            />
            Показывать архив
          </label>
          <input
            className="inp"
            style={{ width: "min(240px,100%)" }}
            placeholder="Номер, имя, email, telegram"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div role="tablist" aria-label="Статус" className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.value}
            className={`tab ${tab === t.value ? "on" : ""}`}
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => {
              setTab(t.value);
              selectOrder(null);
            }}
          >
            {t.label} <span className="cnt">{byTab[t.value]?.length ?? 0}</span>
          </button>
        ))}
      </div>

      <div className={styles.body}>
        <section aria-label="Очередь заказов" className={styles.queue}>
          {loading ? (
            <div className="muted">Загрузка...</div>
          ) : visible.length === 0 ? (
            <div className="empty">
              <div style={{ fontWeight: 700 }}>Здесь пусто</div>
              <div className="muted" style={{ fontSize: 13 }}>
                В этой вкладке пока нет заказов.
              </div>
            </div>
          ) : (
            visible.map((o) => (
              <div
                key={o.id}
                className={`${styles.ord} ${selectedId === o.id ? styles.ordSelected : ""}`}
                onClick={() => selectOrder(o.id)}
              >
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700 }}>{o.order_number}</span>
                    <span className={`badge sm ${STATUS_BADGE[o.status] || "neutral"}`}>
                      {STATUS_LABELS[o.status] || o.status}
                    </span>
                    <span className="muted" style={{ marginLeft: "auto", fontSize: 12 }}>
                      {formatDate(o.submitted_at)}
                    </span>
                  </div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {o.service?.title || "—"} · {FORMAT_LABELS[o.format] || o.format || "формат не выбран"}
                  </div>
                  <div style={{ fontSize: 14 }}>{o.contact_name || "Имя не указано"}</div>
                </div>
              </div>
            ))
          )}
        </section>

        {selectedId && (
          <section className={`card ${styles.detail}`} aria-label="Выбранный заказ">
            {detailLoading || !order ? (
              <div className="muted">Загрузка...</div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span className="h" style={{ fontSize: 18, fontWeight: 600 }}>
                        {order.order_number}
                      </span>
                      <span className={`badge ${STATUS_BADGE[order.status] || "neutral"}`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                      {order.is_archived && <span className="badge neutral">в архиве</span>}
                    </div>
                    <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                      {detail.service?.title} · {FORMAT_LABELS[order.format] || order.format || "формат не выбран"} ·
                      {" "}подано {formatDate(order.submitted_at)}
                    </div>
                  </div>
                  <button className="btn" style={{ minHeight: 36 }} onClick={handleArchiveToggle} disabled={busy}>
                    {order.is_archived ? "Вернуть из архива" : "В архив"}
                  </button>
                </div>

                <div className={styles.grid2}>
                  <div className="f">
                    <label>Контакт</label>
                    <div style={{ fontSize: 14 }}>{order.contact_name || "—"}</div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {[order.contact_telegram && `TG: ${order.contact_telegram}`, order.contact_phone, order.contact_email]
                        .filter(Boolean)
                        .join(" · ") || "контакты не указаны"}
                    </div>
                  </div>
                  <div className="f">
                    <label>Желаемая длительность / срок</label>
                    <div style={{ fontSize: 14 }}>{order.desired_duration || "—"}</div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      желаемый срок: {formatDateOnly(order.desired_deadline)}
                    </div>
                  </div>
                </div>

                {order.brief && (
                  <div className="f">
                    <label>Техзадание</label>
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{order.brief}</p>
                  </div>
                )}
                {order.comments && (
                  <div className="f">
                    <label>Комментарии</label>
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{order.comments}</p>
                  </div>
                )}

                {Array.isArray(order.timecodes) && order.timecodes.length > 0 && (
                  <div className="f">
                    <label>Таймкоды</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {order.timecodes.map((t, i) => (
                        <div key={i} style={{ display: "flex", gap: 10, fontSize: 14 }}>
                          <span style={{ fontWeight: 700, flex: "none" }}>{t.moment}</span>
                          <span className="muted">{t.note}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="f">
                  <label>Исходные файлы и ссылки</label>
                  {sourceFiles.length === 0 && (!order.source_links || order.source_links.length === 0) ? (
                    <div className="muted" style={{ fontSize: 13 }}>Клиент пока ничего не загрузил</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {sourceFiles.map((f) => (
                        <a key={f.id} href={f.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: 14 }}>
                          🎵 {f.fileName}
                        </a>
                      ))}
                      {(order.source_links || []).map((l, i) => (
                        <a key={i} href={l.url} target="_blank" rel="noreferrer" style={{ fontSize: 14 }}>
                          🔗 {l.url} {l.note && `— ${l.note}`}
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
                  <h2 className="h" style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
                    Статус
                  </h2>
                  {nextStatuses.length === 0 ? (
                    <div className="muted" style={{ fontSize: 13 }}>Заказ в финальном статусе</div>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      {nextStatuses.map((s) => (
                        <button
                          key={s}
                          className={`btn ${s === "cancelled" ? "dng" : "pri"}`}
                          style={{ minHeight: 40 }}
                          disabled={busy}
                          onClick={() => handleChangeStatus(s)}
                        >
                          {STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
                  <h2 className="h" style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
                    Цена и срок
                  </h2>
                  <div className={styles.grid2}>
                    <div className="f">
                      <label>Согласованная цена, ₽</label>
                      <input
                        className="inp"
                        type="number"
                        value={priceInput}
                        onChange={(e) => setPriceInput(e.target.value)}
                      />
                    </div>
                    <div className="f">
                      <label>Согласованный срок</label>
                      <input
                        className="inp"
                        type="date"
                        value={deadlineInput}
                        onChange={(e) => setDeadlineInput(e.target.value)}
                      />
                    </div>
                  </div>
                  <button className="btn pri" style={{ alignSelf: "flex-start" }} disabled={busy} onClick={handleSavePricing}>
                    Сохранить
                  </button>
                </div>

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
                  <h2 className="h" style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
                    Готовые файлы
                  </h2>
                  {deliveredFiles.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {deliveredFiles.map((f) => (
                        <a key={f.id} href={f.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: 14 }}>
                          ✅ {f.fileName}
                        </a>
                      ))}
                    </div>
                  )}
                  <input
                    type="file"
                    multiple
                    accept="audio/*"
                    onChange={(e) => setDeliverFiles(Array.from(e.target.files || []))}
                  />
                  {deliverFiles.length > 0 && (
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <button
                        className="btn pri"
                        style={{ minHeight: 36 }}
                        disabled={deliverStatus === "uploading"}
                        onClick={handleUploadDeliverables}
                      >
                        Загрузить {deliverFiles.length} файл(ов)
                      </button>
                      {deliverStatus === "uploading" && <span className="muted">{deliverProgress}%</span>}
                    </div>
                  )}
                  {deliverStatus === "error" && <div style={{ color: "var(--danger)", fontSize: 13 }}>{deliverError}</div>}
                </div>

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
                  <h2 className="h" style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
                    Переписка
                  </h2>
                  {(detail.messages || []).length === 0 ? (
                    <div className="muted" style={{ fontSize: 13 }}>Сообщений пока нет</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {detail.messages.map((m) => (
                        <div
                          key={m.id}
                          className={styles.msg}
                          style={m.sender === "admin" ? { alignSelf: "flex-end", background: "var(--accent-soft-bg)" } : undefined}
                        >
                          <div className="muted" style={{ fontSize: 12 }}>
                            {m.sender === "admin" ? "Админ" : "Клиент"} · {formatDate(m.createdAt || m.created_at)}
                          </div>
                          <div style={{ fontSize: 14 }}>{m.body}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 10 }}>
                    <textarea
                      className="inp"
                      rows={2}
                      style={{ flex: 1 }}
                      placeholder="Ответ клиенту"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                    />
                    <button className="btn pri" style={{ alignSelf: "flex-end" }} disabled={busy} onClick={handleSendMessage}>
                      Отправить
                    </button>
                  </div>
                </div>

                {(detail.statusHistory || []).length > 0 && (
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                    <h2 className="h" style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
                      История статусов
                    </h2>
                    {detail.statusHistory.map((h) => (
                      <div className={styles.timeline} key={h.id}>
                        <span className="muted" style={{ width: 130, flex: "none" }}>
                          {formatDate(h.created_at)}
                        </span>
                        <span style={{ flex: 1 }}>
                          {h.from_status ? `${STATUS_LABELS[h.from_status]} → ` : ""}
                          {STATUS_LABELS[h.to_status]}
                          {h.note && ` · ${h.note}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
