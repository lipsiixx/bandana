import React, { useEffect, useState } from "react";
import styles from "./Biography.module.css";
import Title from "../../../shared/ui/Title/Title";
import RollerogramButton from "../../../shared/ui/Button/RollerogramButton";
import LoadError from "../../../shared/ui/LoadError/LoadError";
import ApiService from "../../../shared/api/api";

function escapeHtml(s) {
  return s.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
}

// Та же лёгкая разметка, что и в редакторе админки (admin-panel/src/pages/AboutPage.jsx):
// **жирный**, __подчёркнутый__, *курсив*, ==выделение==.
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

const Biography = () => {
  const [about, setAbout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setLoadError(false);
        const res = await ApiService.getAbout();
        if (cancelled) return;
        if (res?.error) setLoadError(true);
        setAbout(res?.success ? res.data : null);
      } catch (err) {
        if (!cancelled) {
          console.error("Ошибка загрузки блока «о себе»:", err);
          setLoadError(true);
          setAbout(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className={styles.biographySection}>
        <div className={styles.inner}>
          <Title text="О Марке" overline="Биография" />
          <div className={styles.grid}>
            <div className={styles.skeleton} />
            <div className={styles.skeleton} />
          </div>
        </div>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className={styles.biographySection}>
        <div className={styles.inner}>
          <Title text="О Марке" overline="Биография" />
          <LoadError />
        </div>
      </section>
    );
  }

  // Правило «реальное значение или элемент скрыт»: нет опубликованного
  // контента — раздел не показываем вовсе.
  if (!about) return null;

  const filter = `brightness(${about.brightness}%) contrast(${about.contrast}%) sepia(${about.warmth}%) saturate(${100 + about.warmth}%)`;
  const transform = `scale(${about.zoom / 100})`;
  const transformOrigin = `${about.focusX}% 50%`;

  return (
    <section className={styles.biographySection}>
      <div className={styles.inner}>
        <Title text="О Марке" overline="Биография" />

        <div className={styles.grid}>
          <div className={styles.imageBlock}>
            {about.fileUrl && (
              <img
                className={styles.photo}
                src={about.fileUrl}
                alt={about.heading || ""}
                style={{ filter, transform, transformOrigin }}
              />
            )}
            <div className={styles.imageCaption}>
              <span className={styles.imageName}>BANDANA</span>
              <span className={styles.imageRole}>Professional Dancer</span>
            </div>
          </div>

          <div className={styles.textBlock}>
            <h3
              className={styles.name}
              style={{ fontFamily: `'${about.font}', var(--font-display)` }}
              dangerouslySetInnerHTML={{
                __html: renderLite(about.heading, about.highlightColor),
              }}
            />
            <p className={styles.aka}>aka BANDANA</p>

            <p
              className={`${styles.shortBio} ${!isExpanded ? styles.bodyClamped : ""}`}
              dangerouslySetInnerHTML={{
                __html: renderLite(about.body, about.highlightColor),
              }}
            />

            <RollerogramButton
              onClick={() => setIsExpanded((prev) => !prev)}
              text={isExpanded ? "Свернуть" : "Читать полностью"}
              className={isExpanded ? "collapseButton" : "expandButton"}
            />

            <footer className={styles.footer}>
              <span className={styles.footerLine} />
              <p>Professional dancer &amp; choreographer</p>
            </footer>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Biography;
