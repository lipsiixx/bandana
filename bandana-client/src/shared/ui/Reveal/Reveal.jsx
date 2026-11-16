import React, { useEffect, useRef, useState } from "react";
import styles from "./Reveal.module.css";

/**
 * Плавное появление блока при попадании во вьюпорт — один раз.
 * Анимируются только transform и opacity. reduced-motion отключает эффект (CSS).
 */
const Reveal = ({ children, as: Tag = "div", className = "", ...rest }) => {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    // Фолбэк: если по какой-то причине секция так и не «засветилась»
    // (баг наблюдателя, нестандартный скролл) — показать принудительно.
    const failsafe = setTimeout(() => setShown(true), 2500);
    return () => {
      io.disconnect();
      clearTimeout(failsafe);
    };
  }, []);

  return (
    <Tag
      ref={ref}
      className={`${styles.reveal} ${shown ? styles.shown : ""} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
};

export default Reveal;
