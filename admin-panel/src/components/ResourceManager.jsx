import { useEffect, useState } from "react";
import UploadField from "./UploadField";
import styles from "./ResourceManager.module.css";

function emptyFormFromFields(fields) {
  const form = {};
  for (const field of fields) {
    if (field.type === "photo" || field.type === "video") {
      form[field.nameField] = "";
      form[field.urlField] = "";
    } else if (field.type === "checkbox") {
      form[field.name] = false;
    } else if (field.type === "select") {
      form[field.name] = field.options?.[0]?.value ?? "";
    } else {
      form[field.name] = "";
    }
  }
  return form;
}

function itemToForm(item, fields) {
  const form = {};
  for (const field of fields) {
    if (field.type === "photo" || field.type === "video") {
      form[field.nameField] = item[field.nameField] ?? "";
      form[field.urlField] = item[field.urlField] ?? "";
      continue;
    }
    const value = item[field.name];
    if (field.type === "list") form[field.name] = Array.isArray(value) ? value.join("\n") : "";
    else if (field.type === "checkbox") form[field.name] = Boolean(value);
    else if (field.type === "date") form[field.name] = value ? String(value).slice(0, 10) : "";
    else form[field.name] = value ?? "";
  }
  return form;
}

function formToPayload(form, fields) {
  const payload = {};
  for (const field of fields) {
    if (field.type === "photo" || field.type === "video") {
      payload[field.nameField] = form[field.nameField];
      payload[field.urlField] = form[field.urlField];
    } else if (field.type === "list") {
      payload[field.name] = form[field.name]
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    } else {
      payload[field.name] = form[field.name];
    }
  }
  return payload;
}

// Универсальный список + форма создания/редактирования для одной сущности.
// `fields` описывает форму декларативно: [{name, label, type}].
// Поддерживаемые type: text, textarea, checkbox, date, list (строки через \n -> массив),
// photo/video (загрузка файла, пишет пару <name>FileName/<name>FileUrl-подобных полей).
export default function ResourceManager({ title, subtitle, api, fields, columns }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api.list();
      setItems(res.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startCreate() {
    setEditingId(null);
    setForm(emptyFormFromFields(fields));
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm(itemToForm(item, fields));
    setMenuOpenId(null);
  }

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = formToPayload(form, fields);
    try {
      if (editingId) await api.update(editingId, payload);
      else await api.create(payload);
      setForm(null);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Не удалось сохранить");
    }
  }

  async function handleDelete(id) {
    try {
      await api.remove(id);
      setConfirmDeleteId(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Не удалось удалить");
    }
  }

  const thumbField = fields.find((f) => f.type === "photo" || f.type === "video");

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className="h" style={{ margin: 0, fontSize: 28, fontWeight: 600 }}>
            {title}
          </h1>
          {subtitle && (
            <div className="muted" style={{ fontSize: 14, marginTop: 8 }}>
              {subtitle}
            </div>
          )}
        </div>
        <button className="btn pri" onClick={startCreate}>
          + Добавить
        </button>
      </header>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.body}>
        <section className="card" style={{ flex: "999 1 520px", minWidth: 0, overflow: "visible" }}>
          {loading ? (
            <div className="row muted">Загрузка...</div>
          ) : items.length === 0 ? (
            <div className="row muted">Пока нет записей</div>
          ) : (
            items.map((item) => (
              <div className="trow" key={item.id} style={{ position: "relative" }}>
                {thumbField &&
                  (item[thumbField.urlField] ? (
                    thumbField.type === "video" ? (
                      <video className="thumb" src={item[thumbField.urlField]} />
                    ) : (
                      <img className="thumb" src={item[thumbField.urlField]} alt="" />
                    )
                  ) : (
                    <span className="thumb" />
                  ))}
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
                  {columns.map((col) => (
                    <span key={col.key} style={col.primary ? { fontWeight: 700, width: "100%" } : { fontSize: 13 }} className={col.primary ? undefined : "muted"}>
                      {col.render ? col.render(item) : item[col.key]}
                    </span>
                  ))}
                </div>
                <button className="btn" style={{ minHeight: 36 }} onClick={() => startEdit(item)}>
                  Изменить
                </button>
                <button
                  className="btn icon"
                  aria-label="Ещё действия"
                  aria-expanded={menuOpenId === item.id}
                  style={menuOpenId === item.id ? { borderColor: "var(--accent)" } : undefined}
                  onClick={() => setMenuOpenId(menuOpenId === item.id ? null : item.id)}
                >
                  ⋯
                </button>
                {menuOpenId === item.id && (
                  <div role="menu" className={`menu ${styles.menu}`}>
                    <button className="menuItem danger" role="menuitem" onClick={() => setConfirmDeleteId(item.id)}>
                      Удалить…
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </section>

        {form && (
          <aside className="card" style={{ flex: "1 1 380px", minWidth: 0, padding: 22, display: "flex", flexDirection: "column", gap: 18, borderColor: "#2b2546" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h2 className="h" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                {editingId ? "Изменить" : "Новая запись"}
              </h2>
              <button className="btn ghost icon" style={{ marginLeft: "auto" }} aria-label="Закрыть" onClick={() => setForm(null)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {fields.map((field) => (
                <div key={field.name || field.nameField} className="f">
                  <label>{field.label}</label>
                  {field.type === "textarea" || field.type === "list" ? (
                    <textarea
                      className="inp"
                      rows={field.type === "list" ? 4 : 3}
                      value={form[field.name]}
                      onChange={(e) => updateField(field.name, e.target.value)}
                      placeholder={field.type === "list" ? "Каждое значение с новой строки" : undefined}
                    />
                  ) : field.type === "checkbox" ? (
                    <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#c8c8d6" }}>
                      <input
                        type="checkbox"
                        style={{ accentColor: "var(--accent)", width: 18, height: 18 }}
                        checked={form[field.name]}
                        onChange={(e) => updateField(field.name, e.target.checked)}
                      />
                      {field.checkboxLabel || "Да"}
                    </label>
                  ) : field.type === "photo" || field.type === "video" ? (
                    <UploadField
                      kind={field.type}
                      fileUrl={form[field.urlField]}
                      onUploaded={({ fileName, fileUrl }) =>
                        setForm((prev) => ({ ...prev, [field.nameField]: fileName, [field.urlField]: fileUrl }))
                      }
                    />
                  ) : field.type === "select" ? (
                    <select
                      className="inp"
                      value={form[field.name]}
                      onChange={(e) => updateField(field.name, e.target.value)}
                    >
                      {field.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="inp"
                      type={field.type === "date" ? "date" : "text"}
                      value={form[field.name]}
                      onChange={(e) => updateField(field.name, e.target.value)}
                      required={field.required}
                    />
                  )}
                </div>
              ))}
              <div style={{ display: "flex", gap: 10, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                <button type="button" className="btn" onClick={() => setForm(null)}>
                  Отмена
                </button>
                <button type="submit" className="btn pri" style={{ marginLeft: "auto" }}>
                  {editingId ? "Сохранить" : "Создать"}
                </button>
              </div>
            </form>
          </aside>
        )}
      </div>

      {confirmDeleteId && (
        <div className={styles.overlay} onClick={() => setConfirmDeleteId(null)}>
          <div className="dialog" style={{ width: "min(420px,100%)" }} role="dialog" aria-labelledby="del-title" onClick={(e) => e.stopPropagation()}>
            <h3 id="del-title" className="h" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
              Удалить запись?
            </h3>
            <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
              Карточка пропадёт с сайта. Это действие нельзя отменить.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
              <button className="btn" onClick={() => setConfirmDeleteId(null)}>
                Оставить
              </button>
              <button className="btn dngFill" onClick={() => handleDelete(confirmDeleteId)}>
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
