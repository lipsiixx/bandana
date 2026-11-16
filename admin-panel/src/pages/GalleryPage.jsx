import { useMemo, useRef, useState, useEffect } from "react";
import { galleryApi, uploadApi } from "../api/adminApi";
import styles from "./GalleryPage.module.css";

const MAX_SIZE = 15 * 1024 * 1024;
const MAX_DIMENSION = 2560;

function monthLabel(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

function monthKey(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

// Пережимает фото в JPEG и уменьшает до MAX_DIMENSION по длинной стороне —
// то же самое предлагает сделать сам макет для файлов тяжелее 15 МБ.
function downscaleImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Не удалось обработать изображение"));
          resolve(new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.85,
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function GalleryPage() {
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [uploadCategory, setUploadCategory] = useState("Выступления");
  const [queue, setQueue] = useState([]); // {id, file, name, progress, status, error}
  const [selected, setSelected] = useState(() => new Set());
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  async function load() {
    try {
      const res = await galleryApi.list();
      setPhotos(res.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Не удалось загрузить галерею");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const categories = useMemo(() => {
    const counts = new Map();
    for (const p of photos) counts.set(p.filter, (counts.get(p.filter) || 0) + 1);
    return Array.from(counts.entries());
  }, [photos]);

  const filtered = useMemo(() => {
    return photos.filter((p) => {
      if (activeCategory !== "all" && p.filter !== activeCategory) return false;
      if (search.trim() && !p.footer?.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [photos, activeCategory, search]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const p of filtered) {
      const key = monthKey(p.createdAt);
      if (!map.has(key)) map.set(key, { label: monthLabel(p.createdAt), items: [] });
      map.get(key).items.push(p);
    }
    return Array.from(map.values());
  }, [filtered]);

  function updateQueueItem(id, patch) {
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }

  async function uploadOne(id, file) {
    try {
      updateQueueItem(id, { status: "uploading", progress: 0 });
      const result = await uploadApi.photo(file, (progress) => updateQueueItem(id, { progress }));
      await galleryApi.create({
        fileName: result.fileName,
        fileUrl: result.fileUrl,
        filter: uploadCategory,
        footer: file.name.replace(/\.\w+$/, ""),
      });
      updateQueueItem(id, { status: "done", progress: 100 });
      await load();
      setTimeout(() => setQueue((prev) => prev.filter((q) => q.id !== id)), 2000);
    } catch (err) {
      updateQueueItem(id, { status: "error", error: err.response?.data?.message || "Ошибка загрузки" });
    }
  }

  function enqueueFiles(fileList) {
    const files = Array.from(fileList);
    for (const file of files) {
      const id = `${Date.now()}-${Math.random()}`;
      if (file.size > MAX_SIZE) {
        setQueue((prev) => [
          ...prev,
          { id, file, name: file.name, progress: 0, status: "oversized", error: null },
        ]);
        continue;
      }
      setQueue((prev) => [...prev, { id, file, name: file.name, progress: 0, status: "queued", error: null }]);
      uploadOne(id, file);
    }
  }

  async function handleShrinkAndUpload(item) {
    updateQueueItem(item.id, { status: "uploading", progress: 0 });
    try {
      const smaller = await downscaleImage(item.file);
      await uploadOne(item.id, smaller);
    } catch {
      updateQueueItem(item.id, { status: "error", error: "Не удалось уменьшить файл" });
    }
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkDelete() {
    if (!window.confirm(`Удалить ${selected.size} фото?`)) return;
    for (const id of selected) {
      await galleryApi.remove(id);
    }
    setSelected(new Set());
    await load();
  }

  async function handleBulkCategory(newCategory) {
    for (const id of selected) {
      const photo = photos.find((p) => p.id === id);
      if (photo) await galleryApi.update(id, { filter: newCategory });
    }
    setSelected(new Set());
    await load();
  }

  async function handleDelete(id) {
    if (!window.confirm("Удалить фото?")) return;
    await galleryApi.remove(id);
    await load();
  }

  async function handleRenameCaption(photo) {
    const next = window.prompt("Подпись", photo.footer);
    if (next === null || next === photo.footer) return;
    await galleryApi.update(photo.id, { footer: next });
    await load();
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className="h" style={{ margin: 0, fontSize: 28, fontWeight: 600 }}>
            Галерея
          </h1>
          <div className="muted" style={{ fontSize: 14, marginTop: 8 }}>
            {photos.length} фото · на сайте группируются по месяцу загрузки
          </div>
        </div>
        <button className="btn pri" onClick={() => fileInputRef.current?.click()}>
          Загрузить фото
        </button>
      </header>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <section
        className="card"
        style={{ overflow: "hidden" }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          enqueueFiles(e.dataTransfer.files);
        }}
      >
        <div className={styles.dropzone} style={dragOver ? { borderColor: "var(--accent)" } : undefined}>
          <span className={styles.dropIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
            </svg>
          </span>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Перетащите фото сюда — можно сразу пачкой</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              JPG, PNG, WEBP до 15 МБ
            </div>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#c8c8d6" }}>
            Категория для новых
            <select className="inp" style={{ minHeight: 40 }} value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}>
              {["Выступления", "Мастер-классы", "Баттлы", "Команда", ...categories.map(([c]) => c)]
                .filter((v, i, arr) => arr.indexOf(v) === i)
                .map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
            </select>
          </label>
          <button type="button" className="btn" onClick={() => fileInputRef.current?.click()}>
            Выбрать файлы
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files?.length) enqueueFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {queue.map((item) => (
          <div className="up" key={item.id}>
            <span className={styles.upThumb} />
            <div style={{ flex: 1, minWidth: 0 }}>
              {item.status === "oversized" ? (
                <>
                  <div>
                    {item.name} · {(item.file.size / 1024 / 1024).toFixed(1)} МБ
                  </div>
                  <div style={{ fontSize: 13, color: "var(--danger)", marginTop: 2 }}>
                    Больше 15 МБ — уменьшим до 2560 px по длинной стороне?
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{item.name}</span>
                    <span style={item.status === "done" ? { color: "var(--success)", fontWeight: 600 } : item.status === "error" ? { color: "var(--danger)" } : {}} className={item.status === "queued" || item.status === "uploading" ? "muted" : undefined}>
                      {item.status === "done" ? "готово" : item.status === "error" ? item.error : `${item.progress}%`}
                    </span>
                  </div>
                  <div className="bar" style={{ marginTop: 6 }}>
                    <div
                      style={{
                        width: `${item.progress}%`,
                        height: "100%",
                        background: item.status === "error" ? "var(--danger-solid)" : "#3fbf7f",
                      }}
                    />
                  </div>
                </>
              )}
            </div>
            {item.status === "oversized" && (
              <button className="btn" style={{ minHeight: 34 }} onClick={() => handleShrinkAndUpload(item)}>
                Уменьшить и загрузить
              </button>
            )}
          </div>
        ))}
      </section>

      <div className={styles.filterRow}>
        <button className={`chip ${activeCategory === "all" ? "on" : ""}`} onClick={() => setActiveCategory("all")}>
          Все · {photos.length}
        </button>
        {categories.map(([cat, count]) => (
          <button key={cat} className={`chip ${activeCategory === cat ? "on" : ""}`} onClick={() => setActiveCategory(cat)}>
            {cat} · {count}
          </button>
        ))}
        <div style={{ marginLeft: "auto" }}>
          <input className="inp" style={{ width: "min(220px,100%)" }} placeholder="Поиск по подписи" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {groups.length > 0 && (
        <div className={styles.devNote}>
          <span className="badge neutral sm">для разработки</span>
          Ручной порядок фото требует нового поля <code>sort_order</code> в таблице gallery и
          эндпоинта для сохранения порядка — сейчас фото сортируются только по дате загрузки.
        </div>
      )}

      {groups.length === 0 ? (
        <div className="empty">
          <div style={{ fontWeight: 700 }}>Здесь пока пусто</div>
          <div className="muted" style={{ fontSize: 13 }}>
            Загрузите фото — они появятся в этой категории.
          </div>
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.label} aria-labelledby={group.label} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <h2 className="h" style={{ margin: 0, fontSize: 16, fontWeight: 600, textTransform: "capitalize" }}>
                {group.label}
              </h2>
              <span className="muted" style={{ fontSize: 13 }}>
                {group.items.length} фото
              </span>
            </div>
            <div className={styles.grid}>
              {group.items.map((p) => (
                <figure className={styles.tile} key={p.id}>
                  <div className={styles.tileBox}>
                    {p.fileUrl ? (
                      <img src={p.fileUrl} alt="" />
                    ) : (
                      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: "#ffffff40" }}>
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="9" cy="9" r="2" />
                        <path d="m21 15-5-5L5 21" />
                      </svg>
                    )}
                    <input
                      type="checkbox"
                      aria-label="Выбрать фото"
                      className={styles.tileCheck}
                      checked={selected.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                    />
                    <span className={`badge ${styles.tileBadge}`}>{p.filter}</span>
                    <div className={styles.tileActions}>
                      <button className="btn icon" style={{ background: "#0a0a0fd9" }} aria-label="Изменить подпись" onClick={() => handleRenameCaption(p)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M4 20h4L19 9l-4-4L4 16z" />
                        </svg>
                      </button>
                      <button className="btn icon" style={{ background: "#0a0a0fd9", color: "var(--danger)" }} aria-label="Удалить" onClick={() => handleDelete(p.id)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <figcaption style={{ fontSize: 14, fontWeight: 600 }}>{p.footer}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        ))
      )}

      {selected.size > 0 && (
        <div className={styles.bulkBar} role="region" aria-label="Действия с выбранными">
          <span style={{ fontWeight: 700, fontSize: 14 }}>Выбрано {selected.size}</span>
          <select
            className="inp"
            style={{ minHeight: 36, width: "auto" }}
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) handleBulkCategory(e.target.value);
              e.target.value = "";
            }}
          >
            <option value="" disabled>
              Сменить категорию
            </option>
            {categories.map(([c]) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button className="btn dng" style={{ minHeight: 36 }} onClick={handleBulkDelete}>
            Удалить
          </button>
          <button className="btn ghost icon" style={{ minHeight: 36 }} aria-label="Снять выделение" onClick={() => setSelected(new Set())}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
