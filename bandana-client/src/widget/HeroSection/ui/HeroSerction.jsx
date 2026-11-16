import React from "react";
import styles from "./HeroSerction.module.css";

const scrollToSection = (id) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
};

/* Факты — самодостаточные формулировки, читаются без подписи.
   Голые годы («2023», «2024») запрещены дизайн-ревью. */
const STATS = [
  {
    value: "3 чемпионата России",
    label: "Project 818, Moving Star, «Город танцует в парках»",
  },
  { value: "Ученики — призёры", label: "чемпионатов России" },
  {
    value: "В танце с 8 лет",
    label: "педагог и хореограф команды «ВотТакМогу»",
  },
];

/* Лента чемпионатов. Пока — список достижений из биографии;
   позже — из данных (события/команды). */
const TICKER = [
  "PROJECT 818",
  "MOVING STAR",
  "ГОРОД ТАНЦУЕТ В ПАРКАХ",
  "FUNKY STYLE DANCE SCHOOL",
  "ВОТТАКМОГУ",
];

const HeroSerction = () => {
  return (
    <section className={styles.hero}>
      <div className={styles.spotlight} aria-hidden="true">
        <span className={styles.beam} />
        <span className={styles.dust} />
      </div>

      <div className={`bd-container ${styles.content}`}>
        <p className={`bd-overline ${styles.over}`}>
          Марк Шекунов · танцор · хореограф
        </p>

        <h1 className={styles.title}>Двигайся так, чтобы на тебя смотрели</h1>

        <p className={styles.lead}>
          Мастер-классы и танцевальные команды для детей и взрослых — от
          первого занятия до сцены чемпионата.
        </p>

        <div className={styles.actions}>
          <button
            className={styles.primary}
            onClick={() => scrollToSection("form")}
          >
            Записаться на занятие
          </button>
          <button
            className={styles.secondary}
            onClick={() => scrollToSection("performances")}
          >
            <span className={styles.playIcon} aria-hidden="true">▸</span>
            Смотреть выступления
          </button>
        </div>

        <dl className={styles.stats}>
          {STATS.map((s) => (
            <div key={s.value} className={styles.stat}>
              <dt className={styles.statValue}>{s.value}</dt>
              <dd className={styles.statLabel}>{s.label}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className={styles.ticker} aria-hidden="true">
        <div className={styles.tickerTrack}>
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className={styles.tickerItem}>
              {t}
              <span className={styles.tickerDot}>✦</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSerction;
