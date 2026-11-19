import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { dashboardApi } from "../api/adminApi";
import styles from "./DashboardPage.module.css";

function daysUntil(date) {
  const diff = Math.round((new Date(date) - new Date()) / 86400000);
  if (diff === 0) return "сегодня";
  if (diff === 1) return "завтра";
  return `через ${diff} дн.`;
}

function formatActivityTime(iso) {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const time = date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `сегодня ${time}`;
  if (isYesterday) return `вчера ${time}`;
  return date.toLocaleDateString("ru-RU");
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    dashboardApi
      .get()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || "Не удалось загрузить дашборд"));
  }, []);

  const today = new Date().toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  if (error) return <div className={styles.errorBanner}>{error}</div>;
  if (!data) return null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className="muted" style={{ fontSize: 14, textTransform: "capitalize" }}>
            {today}
          </div>
          <h1 className="h" style={{ margin: "6px 0 0", fontSize: 28, fontWeight: 600 }}>
            Дашборд
          </h1>
        </div>
      </header>

      <section aria-label="Сводка" className={styles.summary}>
        <Link to="/reviews" className={`card ${styles.summaryCard}`}>
          <div className={styles.summaryTop}>
            <span className="lbl">На модерации</span>
            {data.pendingReviewsCount > 0 && <span className="badge pink">новые</span>}
          </div>
          <div className="h" style={{ fontSize: 36, fontWeight: 600 }}>
            {data.pendingReviewsCount}
          </div>
          <div className="muted" style={{ fontSize: 14 }}>
            отзыв(ов) ждут решения ·{" "}
            <span style={{ color: "var(--accent-soft-text)" }}>разобрать →</span>
          </div>
        </Link>

        <Link to="/orders" className={`card ${styles.summaryCard}`}>
          <div className={styles.summaryTop}>
            <span className="lbl">Новые заказы</span>
            {data.newOrdersCount > 0 && <span className="badge pink">новые</span>}
          </div>
          <div className="h" style={{ fontSize: 36, fontWeight: 600 }}>
            {data.newOrdersCount}
          </div>
          <div className="muted" style={{ fontSize: 14 }}>
            заказ(ов) ждут рассмотрения ·{" "}
            <span style={{ color: "var(--accent-soft-text)" }}>разобрать →</span>
          </div>
        </Link>

        <div className={`card ${styles.summaryCard}`}>
          <span className="lbl">Ближайшее событие</span>
          {data.upcomingEvents[0] ? (
            <>
              <div className="h" style={{ fontSize: 36, fontWeight: 600 }}>
                {daysUntil(data.upcomingEvents[0].date)}
              </div>
              <div className="muted" style={{ fontSize: 14 }}>
                {new Date(data.upcomingEvents[0].date).toLocaleDateString("ru-RU")} ·{" "}
                {data.upcomingEvents[0].place}
              </div>
            </>
          ) : (
            <div className="muted" style={{ fontSize: 14 }}>нет запланированных</div>
          )}
        </div>

        <div className={`card ${styles.summaryCard}`}>
          <span className="lbl">Галерея</span>
          <div className="h" style={{ fontSize: 36, fontWeight: 600 }}>
            {data.galleryCount} фото
          </div>
          <div className="muted" style={{ fontSize: 14 }}>
            {data.galleryCategoriesCount} категори(й)
          </div>
        </div>

        <div className={`card ${styles.summaryCard}`}>
          <span className="lbl">Команды</span>
          <div className="h" style={{ fontSize: 36, fontWeight: 600 }}>
            {data.teamsCount}
          </div>
          <div className="muted" style={{ fontSize: 14 }}>
            набор открыт в {data.teamsRecruitingCount} из {data.teamsCount}
          </div>
        </div>
      </section>

      <div className={styles.twoCol}>
        <section className="card" style={{ overflow: "hidden" }}>
          <div className={styles.sectionHead}>
            <h2 className="h" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
              Ближайшие события
            </h2>
            <Link to="/events" style={{ fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
              Календарь →
            </Link>
          </div>
          {data.upcomingEvents.length === 0 ? (
            <div className="row muted">Запланированных событий нет</div>
          ) : (
            data.upcomingEvents.map((ev) => (
              <div className="row" key={ev.id}>
                <div style={{ width: 52, textAlign: "center", flex: "none" }}>
                  <div className="h" style={{ fontSize: 22, fontWeight: 600 }}>
                    {new Date(ev.date).getDate()}
                  </div>
                  <div className="lbl" style={{ fontSize: 11 }}>
                    {new Date(ev.date).toLocaleDateString("ru-RU", { month: "short" })}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{ev.description || "Без описания"}</div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                    {ev.place}
                  </div>
                </div>
                <span className="badge purple">{daysUntil(ev.date)}</span>
              </div>
            ))
          )}
        </section>

        <section className="card" style={{ overflow: "hidden" }}>
          <div className={styles.sectionHead}>
            <h2 className="h" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
              Требует внимания
            </h2>
            {data.attention.length > 0 && <span className="badge warning">{data.attention.length}</span>}
          </div>
          {data.attention.length === 0 ? (
            <div className="row muted">Всё в порядке</div>
          ) : (
            data.attention.map((item) => (
              <div className="row" style={{ alignItems: "flex-start" }} key={item.type}>
                <span className={styles.attentionDot} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{item.message}</div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                    {item.detail}
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      </div>

      <section className="card" style={{ overflow: "hidden" }}>
        <div className={styles.sectionHead}>
          <h2 className="h" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
            Последние действия
          </h2>
          <span className="badge neutral">полный журнал — скоро</span>
        </div>
        {data.recentActivity.length === 0 ? (
          <div className="row muted">Пока ничего не происходило</div>
        ) : (
          data.recentActivity.map((a) => (
            <div className="row" key={a.id}>
              <span className="muted" style={{ width: 110, fontSize: 13, flex: "none" }}>
                {formatActivityTime(a.createdAt)}
              </span>
              <span className="badge neutral" style={{ flex: "none" }}>
                {a.section}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>{a.summary}</span>
              <span className="muted" style={{ fontSize: 13 }}>
                {a.adminName}
              </span>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
