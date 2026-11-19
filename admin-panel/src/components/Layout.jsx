import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "./Layout.module.css";

const NAV_SECTIONS = [
  {
    items: [{ to: "/", label: "Дашборд", end: true, icon: "grid" }],
  },
  {
    title: "Контент",
    items: [
      { to: "/events", label: "События", icon: "calendar" },
      { to: "/masterclasses", label: "Мастер-классы", icon: "star" },
      { to: "/gallery", label: "Галерея", icon: "image" },
      { to: "/video", label: "Видео", icon: "video" },
      { to: "/teams", label: "Команды", icon: "users" },
      { to: "/about", label: "О себе", icon: "user" },
    ],
  },
  {
    title: "Услуги",
    items: [
      { to: "/services", label: "Каталог услуг", icon: "layers" },
      { to: "/orders", label: "Заказы", icon: "inbox" },
    ],
  },
  {
    title: "Сообщество",
    items: [{ to: "/reviews", label: "Отзывы", icon: "chat" }],
  },
];

const ICONS = {
  grid: <rect x="3" y="3" width="7" height="9" rx="1.5" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  star: <path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6l-5.4 2.9 1.2-6-4.5-4.2 6.1-.7z" />,
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-5-5L5 21" />
    </>
  ),
  video: (
    <>
      <rect x="2" y="5" width="15" height="14" rx="2" />
      <path d="m17 10 5-3v10l-5-3" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.8c1.6.8 2.6 2.5 3 5.2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1-4.4 4-6.5 8-6.5s7 2.1 8 6.5" />
    </>
  ),
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  layers: <path d="M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5" />,
  inbox: (
    <>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
    </>
  ),
  access: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
};

function Icon({ name, stroke }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke || "currentColor"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

export default function Layout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [jumpOpen, setJumpOpen] = useState(false);
  const [query, setQuery] = useState("");

  const allItems = NAV_SECTIONS.flatMap((s) => s.items);
  const matches =
    query.trim().length === 0
      ? []
      : allItems.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase()));

  function handleJumpSubmit(e) {
    e.preventDefault();
    if (matches[0]) {
      navigate(matches[0].to);
      setQuery("");
      setJumpOpen(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className="h" style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>
            bandana
          </span>
          <span className="badge pink sm">admin</span>
        </div>

        <nav aria-label="Разделы" className={styles.nav}>
          {NAV_SECTIONS.map((section) => (
            <div key={section.title || "root"} className={styles.navGroup}>
              {section.title && <div className="lbl" style={{ padding: "0 12px 6px" }}>{section.title}</div>}
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `nav ${isActive ? "on" : ""}`}
                >
                  <Icon name={item.icon} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
          <div className={styles.navGroup}>
            <div className="lbl" style={{ padding: "0 12px 6px" }}>
              Система
            </div>
            <span className="nav" style={{ opacity: 0.6, cursor: "default" }} aria-disabled="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2" />
              </svg>
              Журнал действий
              <span className="badge neutral sm" style={{ marginLeft: "auto" }}>
                скоро
              </span>
            </span>
            <NavLink to="/access" className={({ isActive }) => `nav ${isActive ? "on" : ""}`}>
              <Icon name="access" />
              Доступы
            </NavLink>
          </div>
        </nav>

        <div className={styles.footer}>
          <a className="nav" href="https://bandana-dance.ru" target="_blank" rel="noreferrer">
            Открыть сайт ↗
          </a>
          <div className={styles.account}>
            <span className={styles.avatar}>{(admin?.name || "?").charAt(0).toUpperCase()}</span>
            <div className={styles.accountInfo}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{admin?.name}</span>
              <span className="muted" style={{ fontSize: 12 }}>
                {admin?.email}
              </span>
            </div>
            <button className="btn icon ghost" style={{ marginLeft: "auto" }} aria-label="Выйти" onClick={handleLogout}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <main className={styles.content}>
        <form className={styles.jump} onSubmit={handleJumpSubmit}>
          <input
            className="inp"
            placeholder="Быстрый переход по разделам"
            aria-label="Быстрый переход по разделам"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setJumpOpen(true);
            }}
            onFocus={() => setJumpOpen(true)}
            onBlur={() => setTimeout(() => setJumpOpen(false), 150)}
          />
          {jumpOpen && matches.length > 0 && (
            <div className={styles.jumpResults}>
              {matches.map((m) => (
                <button
                  type="button"
                  key={m.to}
                  className="menuItem"
                  onClick={() => {
                    navigate(m.to);
                    setQuery("");
                    setJumpOpen(false);
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </form>
        <Outlet />
      </main>
    </div>
  );
}
