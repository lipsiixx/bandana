import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { aboutApi, uploadApi } from "../api/adminApi";
import styles from "./AboutPage.module.css";

const HIGHLIGHT_COLORS = [
  { name: "Розовый", value: "#ff3d8b" },
  { name: "Фиолетовый", value: "#7c5cff" },
  { name: "Светлый", value: "#ececf3" },
];

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

// Лёгкая разметка вместо полноценного WYSIWYG: **жирный**, __подчёркнутый__,
// *курсив*, ==выделение==. Тулбар оборачивает выделение в textarea этими
// маркерами — ниже превью просто рендерит их в HTML.
function renderLite(text, highlightColor) {
  const dark = highlightColor === "#ececf3";
  return escapeHtml(text || "")
    .replace(/\n/g, "<br/>")
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/__(.+?)__/g, "<u>$1</u>")
    .replace(/\*(.+?)\*/g, "<i>$1</i>")
    .replace(
      /==(.+?)==/g,
      `<mark style="background:${highlightColor};color:${dark ? "#0a0a0f" : "#fff"};padding:0 .18em;border-radius:6px">$1</mark>`,
    );
}

function wrapSelection(ref, before, after, setValue) {
  const el = ref.current;
  if (!el) return;
  const { selectionStart: start, selectionEnd: end, value } = el;
  const next = value.slice(0, start) + before + value.slice(start, end) + after + value.slice(end);
  setValue(next);
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(start + before.length, end + before.length);
  });
}

export default function AboutPage() {
  const [about, setAbout] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [device, setDevice] = useState("desk");
  const bodyRef = useRef(null);

  useEffect(() => {
    aboutApi
      .get()
      .then((res) => setAbout(res.data))
      .catch((err) => setError(err.response?.data?.message || "Не удалось загрузить"));
  }, []);

  function set(patch) {
    setAbout((prev) => ({ ...prev, ...patch }));
  }

  async function save(publishOverride) {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        heading: about.heading,
        body: about.body,
        font: about.font,
        highlight_color: about.highlight_color,
        fileName: about.file_name,
        fileUrl: about.file_url,
        brightness: about.brightness,
        contrast: about.contrast,
        warmth: about.warmth,
        zoom: about.zoom,
        focus_x: about.focus_x,
        published: publishOverride ?? about.published,
      };
      const res = await aboutApi.update(payload);
      setAbout(res.data);
      setSavedAt(new Date());
    } catch (err) {
      setError(err.response?.data?.message || "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await uploadApi.photo(file);
      set({ file_name: result.fileName, file_url: result.fileUrl });
    } catch (err) {
      setError(err.response?.data?.message || "Не удалось загрузить фото");
    }
  }

  if (!about) return null;

  const filter = `brightness(${about.brightness}%) contrast(${about.contrast}%) sepia(${about.warmth}%) saturate(${100 + about.warmth}%)`;
  const transform = `scale(${about.zoom / 100})`;
  const transformOrigin = `${about.focus_x}% 50%`;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/" className="btn icon" aria-label="Назад к дашборду">
          ‹
        </Link>
        <h1 className="h" style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>
          О себе
        </h1>
        <span className={`badge ${about.published ? "success" : "warning"}`}>
          {about.published ? "опубликовано" : "черновик · не опубликовано"}
        </span>
        <div className={styles.headerActions}>
          {savedAt && <span className="muted" style={{ fontSize: 13 }}>Сохранено {savedAt.toLocaleTimeString("ru-RU")}</span>}
          <button className="btn" disabled={saving} onClick={() => save(false)}>
            Сохранить черновик
          </button>
          <button className="btn pri" disabled={saving} onClick={() => save(true)}>
            Опубликовать на сайте
          </button>
        </div>
      </header>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.body}>
        <section aria-label="Редактор" className={styles.editor}>
          <div className="card" style={{ overflow: "hidden" }}>
            <div role="toolbar" aria-label="Форматирование" className={styles.toolbar}>
              <select className={styles.toolSelect} aria-label="Шрифт заголовка" value={about.font} onChange={(e) => set({ font: e.target.value })}>
                <option value="Unbounded">Unbounded</option>
                <option value="Manrope">Manrope</option>
              </select>
              <span className={styles.sep} />
              <button type="button" className={styles.tool} style={{ fontWeight: 800 }} aria-label="Жирный" onClick={() => wrapSelection(bodyRef, "**", "**", (v) => set({ body: v }))}>
                B
              </button>
              <button type="button" className={styles.tool} style={{ fontStyle: "italic" }} aria-label="Курсив" onClick={() => wrapSelection(bodyRef, "*", "*", (v) => set({ body: v }))}>
                I
              </button>
              <button type="button" className={styles.tool} style={{ textDecoration: "underline" }} aria-label="Подчёркнутый" onClick={() => wrapSelection(bodyRef, "__", "__", (v) => set({ body: v }))}>
                U
              </button>
              <span className={styles.sep} />
              <button type="button" className={styles.tool} aria-label="Выделить" onClick={() => wrapSelection(bodyRef, "==", "==", (v) => set({ body: v }))}>
                Выделить
              </button>
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={styles.sw}
                  aria-label={`Цвет выделения: ${c.name}`}
                  style={{ background: c.value, border: `2px solid ${about.highlight_color === c.value ? "#fff" : "var(--surface)"}` }}
                  onClick={() => set({ highlight_color: c.value })}
                />
              ))}
            </div>
            <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14, minHeight: 200 }}>
              <input
                className="inp"
                style={{ fontFamily: `'${about.font}', sans-serif`, fontSize: 22, fontWeight: 600, border: "none", background: "transparent", padding: 0, color: "#fff" }}
                value={about.heading}
                placeholder="Заголовок — поддерживает ==выделение=="
                onChange={(e) => set({ heading: e.target.value })}
              />
              <textarea
                ref={bodyRef}
                className="inp"
                style={{ border: "none", background: "transparent", padding: 0, fontSize: 15, lineHeight: 1.65, color: "#d6d6e2" }}
                rows={6}
                value={about.body}
                placeholder="Текст — выделите слово и нажмите B/I/U/Выделить"
                onChange={(e) => set({ body: e.target.value })}
              />
            </div>
            <div className="muted" style={{ padding: "10px 22px", borderTop: "1px solid var(--border)", fontSize: 12, display: "flex", justifyContent: "space-between" }}>
              <span>Выделите текст, чтобы оформить его</span>
              <span>{about.body.length} / 800</span>
            </div>
          </div>

          <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h2 className="h" style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
                Фото
              </h2>
              <label className="btn" style={{ marginLeft: "auto", minHeight: 34, cursor: "pointer" }}>
                Заменить
                <input type="file" accept="image/*" hidden onChange={handlePhotoChange} />
              </label>
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div className={styles.photoBox}>
                {about.file_url ? (
                  <img src={about.file_url} alt="" style={{ filter, transform, transformOrigin }} />
                ) : (
                  <div className="muted" style={{ fontSize: 12, textAlign: "center", padding: 8 }}>
                    нет фото
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 12 }}>
                <Slider label="Яркость" unit="%" value={about.brightness} min={50} max={150} onChange={(v) => set({ brightness: v })} />
                <Slider label="Контраст" unit="%" value={about.contrast} min={50} max={150} onChange={(v) => set({ contrast: v })} />
                <Slider label="Тепло" unit="" value={about.warmth} min={0} max={60} onChange={(v) => set({ warmth: v })} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>
              <Slider label="Масштаб" unit="%" value={about.zoom} min={100} max={200} onChange={(v) => set({ zoom: v })} />
              <Slider label="Фокус по горизонтали" unit="%" value={about.focus_x} min={0} max={100} onChange={(v) => set({ focus_x: v })} />
            </div>
          </div>
        </section>

        <section aria-label="Предпросмотр" className={styles.preview}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span className="lbl">Как увидят на сайте</span>
            <span className="badge success">обновляется сразу</span>
            <div className="seg" role="group" aria-label="Устройство" style={{ marginLeft: "auto" }}>
              <button type="button" className={device === "desk" ? "on" : ""} aria-pressed={device === "desk"} onClick={() => setDevice("desk")}>
                Компьютер
              </button>
              <button type="button" className={device === "phone" ? "on" : ""} aria-pressed={device === "phone"} onClick={() => setDevice("phone")}>
                Телефон
              </button>
            </div>
          </div>
          <div className={styles.previewStage}>
            <div className={styles.previewFrame} style={{ width: device === "phone" ? 360 : "100%" }}>
              <div className={styles.previewTopbar}>
                <span className="h" style={{ fontSize: 14, fontWeight: 700 }}>
                  bandana
                </span>
                <span className="muted" style={{ marginLeft: "auto", fontSize: 12 }}>
                  Афиша · Галерея · О нас
                </span>
              </div>
              <div className={styles.previewBody} style={{ flexDirection: device === "phone" ? "column" : "row" }}>
                <div className={styles.previewPhotoBox} style={{ width: device === "phone" ? "100%" : 260, height: device === "phone" ? 240 : 320 }}>
                  {about.file_url && <img src={about.file_url} alt="" style={{ filter, transform, transformOrigin }} />}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, minWidth: 0 }}>
                  <span className="badge pink" style={{ alignSelf: "flex-start" }}>
                    о студии
                  </span>
                  <div
                    style={{
                      fontFamily: `'${about.font}', sans-serif`,
                      fontSize: device === "phone" ? 22 : 30,
                      fontWeight: 600,
                      lineHeight: 1.25,
                      color: "#fff",
                    }}
                    dangerouslySetInnerHTML={{ __html: renderLite(about.heading, about.highlight_color) }}
                  />
                  <p
                    style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: "#c8c8d6" }}
                    dangerouslySetInnerHTML={{ __html: renderLite(about.body, about.highlight_color) }}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="muted" style={{ fontSize: 13 }}>
            Шрифты и цвета — только из стиля сайта, чтобы страница не развалилась.
          </div>
        </section>
      </div>
    </div>
  );
}

function Slider({ label, unit, value, min, max, onChange }) {
  return (
    <label className={styles.sliderLabel}>
      <div>
        <span>{label}</span>
        <span>
          {value}
          {unit}
        </span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}
