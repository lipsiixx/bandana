import { useEffect, useMemo, useState } from "react";
import { eventsApi } from "../api/adminApi";
import UploadField from "../components/UploadField";
import styles from "./EventsPage.module.css";

const WEEKDAYS_FULL = [
  "воскресенье",
  "понедельник",
  "вторник",
  "среда",
  "четверг",
  "пятница",
  "суббота",
];
const WEEKDAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS_FULL = [
  "январь", "февраль", "март", "апрель", "май", "июнь",
  "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
];

function parseIsoDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateMessage(value) {
  const date = parseIsoDate(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!date) return { bad: true, text: "Укажите дату — без неё событие не попадёт в афишу" };
  const diffDays = Math.round((date - today) / 86400000);
  if (diffDays < 0) {
    return { bad: true, text: "Дата уже прошла — выберите будущую дату" };
  }
  const weekday = WEEKDAYS_FULL[date.getDay()];
  const weekdayCap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const when = diffDays === 0 ? "сегодня" : diffDays === 1 ? "завтра" : `через ${diffDays} дн.`;
  return { bad: false, text: `${weekdayCap} · ${when}` };
}

function emptyForm() {
  return { description: "", event_date: "", place: "", type: "", fileName: "", fileUrl: "" };
}

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState("calendar");
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await eventsApi.list();
      setEvents(res.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Не удалось загрузить события");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const eventsByDay = useMemo(() => {
    const map = {};
    for (const ev of events) {
      const date = parseIsoDate(ev.event_date);
      if (!date || date.getFullYear() !== cursor.getFullYear() || date.getMonth() !== cursor.getMonth()) continue;
      const day = date.getDate();
      (map[day] = map[day] || []).push(ev);
    }
    return map;
  }, [events, cursor]);

  const cells = useMemo(() => {
    const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startOffset = (firstDay.getDay() + 6) % 7; // понедельник первым
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const daysInPrevMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 0).getDate();
    const out = [];
    for (let i = 0; i < startOffset; i++) {
      out.push({ n: daysInPrevMonth - startOffset + i + 1, current: false, items: [] });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      out.push({ n: d, current: true, items: eventsByDay[d] || [] });
    }
    while (out.length % 7 !== 0 || out.length < 35) {
      out.push({ n: out.length - startOffset - daysInMonth + 1, current: false, items: [] });
    }
    return out;
  }, [cursor, eventsByDay]);

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === cursor.getFullYear() && today.getMonth() === cursor.getMonth();

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm());
  }

  function startEdit(ev) {
    setEditingId(ev.id);
    setForm({
      description: ev.description || "",
      event_date: ev.event_date && /^\d{4}-\d{2}-\d{2}/.test(ev.event_date) ? ev.event_date.slice(0, 10) : "",
      place: ev.place || "",
      type: ev.type || "",
      fileName: ev.fileName || "",
      fileUrl: ev.fileUrl || "",
    });
  }

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingId) await eventsApi.update(editingId, form);
      else await eventsApi.create(form);
      setEditingId(null);
      setForm(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Не удалось сохранить событие");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingId || !window.confirm("Удалить событие?")) return;
    try {
      await eventsApi.remove(editingId);
      setEditingId(null);
      setForm(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Не удалось удалить событие");
    }
  }

  const dm = form ? dateMessage(form.event_date) : null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className="h" style={{ margin: 0, fontSize: 28, fontWeight: 600 }}>
          События
        </h1>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <div className="seg" role="group" aria-label="Вид">
            <button type="button" className={view === "calendar" ? "on" : ""} aria-pressed={view === "calendar"} onClick={() => setView("calendar")}>
              Календарь
            </button>
            <button type="button" className={view === "list" ? "on" : ""} aria-pressed={view === "list"} onClick={() => setView("list")}>
              Список
            </button>
          </div>
          <button className="btn pri" onClick={startCreate}>
            + Событие
          </button>
        </div>
      </header>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.body}>
        {view === "calendar" ? (
          <section className="card" aria-label="Календарь" style={{ flex: "999 1 520px", minWidth: 0, padding: 20, overflowX: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <h2 className="h" style={{ margin: 0, fontSize: 18, fontWeight: 600, textTransform: "capitalize" }}>
                {MONTHS_FULL[cursor.getMonth()]} {cursor.getFullYear()}
              </h2>
              <button className="btn icon" style={{ marginLeft: "auto" }} aria-label="Предыдущий месяц" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
                ‹
              </button>
              <button className="btn" onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}>
                Сегодня
              </button>
              <button className="btn icon" aria-label="Следующий месяц" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
                ›
              </button>
            </div>
            <div className={styles.grid}>
              {WEEKDAYS_SHORT.map((d) => (
                <div key={d} className={`lbl ${styles.weekday}`}>
                  {d}
                </div>
              ))}
              {cells.map((cell, idx) => (
                <div
                  key={idx}
                  className={styles.cell}
                  style={{ background: cell.current ? "var(--surface)" : "#0e0e14" }}
                >
                  <span
                    className={styles.cellNum}
                    style={{
                      background: cell.current && isCurrentMonth && cell.n === today.getDate() ? "var(--accent)" : "transparent",
                      color: cell.current && isCurrentMonth && cell.n === today.getDate() ? "#fff" : cell.current ? "#c8c8d6" : "#4f4f63",
                    }}
                  >
                    {cell.n}
                  </span>
                  {cell.items.map((ev) => (
                    <button
                      type="button"
                      key={ev.id}
                      className={styles.pill}
                      onClick={() => startEdit(ev)}
                      title={ev.description}
                    >
                      {ev.description || "Без названия"}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="card" style={{ flex: "999 1 520px", minWidth: 0, overflow: "hidden" }}>
            {loading ? (
              <div className="row muted">Загрузка...</div>
            ) : events.length === 0 ? (
              <div className="row muted">Событий пока нет</div>
            ) : (
              events.map((ev) => (
                <div className="trow" key={ev.id}>
                  {ev.fileUrl ? (
                    <img className="thumb" src={ev.fileUrl} alt="" />
                  ) : (
                    <span className="thumb" />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700 }}>{ev.description || "Без описания"}</div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {ev.place}
                      {ev.event_date
                        ? ` · ${/^\d{4}-\d{2}-\d{2}/.test(ev.event_date) ? ev.event_date.slice(0, 10) : ev.event_date}`
                        : ""}
                    </div>
                  </div>
                  <button className="btn" onClick={() => startEdit(ev)}>
                    Изменить
                  </button>
                </div>
              ))
            )}
          </section>
        )}

        {form && (
          <aside className="card" aria-label="Редактирование события" style={{ flex: "1 1 380px", minWidth: 0, padding: 22, display: "flex", flexDirection: "column", gap: 18, borderColor: "#2b2546" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h2 className="h" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                Событие
              </h2>
              <button
                className="btn ghost icon"
                style={{ marginLeft: "auto" }}
                aria-label="Закрыть"
                onClick={() => {
                  setForm(null);
                  setEditingId(null);
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div className="f">
                <label>Фото</label>
                <UploadField
                  kind="photo"
                  fileUrl={form.fileUrl}
                  onUploaded={({ fileName, fileUrl }) => setForm((p) => ({ ...p, fileName, fileUrl }))}
                />
              </div>

              <div className="f">
                <label htmlFor="ev-desc">
                  Описание <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <textarea
                  id="ev-desc"
                  className="inp"
                  rows={3}
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                <div className="f">
                  <label htmlFor="ev-date">
                    Дата <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <input
                    id="ev-date"
                    type="date"
                    className="inp"
                    required
                    value={form.event_date}
                    onChange={(e) => updateField("event_date", e.target.value)}
                    style={dm?.bad ? { borderColor: "#ff6b8a", boxShadow: "0 0 0 1px #ff6b8a" } : undefined}
                  />
                </div>
                {dm && (
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: -8, color: dm.bad ? "var(--danger)" : "var(--success)" }}>
                    {dm.text}
                  </div>
                )}
              </div>

              <div className="f">
                <label htmlFor="ev-place">Место</label>
                <input id="ev-place" className="inp" value={form.place} onChange={(e) => updateField("place", e.target.value)} />
              </div>

              <div className="f">
                <label htmlFor="ev-type">Тип</label>
                <input id="ev-type" className="inp" value={form.type} onChange={(e) => updateField("type", e.target.value)} />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, borderTop: "1px solid var(--border)", paddingTop: 16, flexWrap: "wrap" }}>
                {editingId && (
                  <button type="button" className="btn dng" onClick={handleDelete}>
                    Удалить
                  </button>
                )}
                <button type="submit" className="btn pri" style={{ marginLeft: "auto" }} disabled={saving}>
                  {saving ? "Сохраняем..." : "Сохранить"}
                </button>
              </div>
            </form>
          </aside>
        )}
      </div>
    </div>
  );
}
