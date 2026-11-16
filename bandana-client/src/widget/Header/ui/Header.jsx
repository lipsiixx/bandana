import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import style from "./Header.module.css";
import logo from "../../../shared/img/logo.png";

/** Пункты меню. type: "anchor" — секция на главной, "route" — отдельная страница. */
const NAV = [
  { label: "Выступления", target: "performances", type: "anchor" },
  { label: "Мастер-классы", target: "masterclasses", type: "anchor" },
  { label: "Команды", target: "/teams", type: "route" },
  { label: "Галерея", target: "/gallery", type: "route" },
  { label: "Отзывы", target: "/reviews", type: "route" },
];

function Logo({ onClick }) {
  return (
    <button className={style.logo} onClick={onClick} aria-label="BANDANA — на главную">
      <img className={style.mark} src={logo} alt="" aria-hidden="true" />
      <span className={style.wordmark}>BANDANA</span>
    </button>
  );
}

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Блокируем прокрутку под открытым мобильным меню
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const goAnchor = (id) => {
    const scroll = () => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    if (location.pathname !== "/") {
      navigate("/");
      // ждём перерисовку главной
      setTimeout(scroll, 60);
    } else {
      scroll();
    }
  };

  const handleNav = (item) => {
    setOpen(false);
    if (item.type === "route") navigate(item.target);
    else goAnchor(item.target);
  };

  const goForm = () => {
    setOpen(false);
    goAnchor("form");
  };

  return (
    <>
      <header className={`${style.header} ${scrolled ? style.scrolled : ""}`}>
        <div className={`bd-container ${style.inner}`}>
          <Logo onClick={() => { setOpen(false); navigate("/"); }} />

          <nav className={style.nav} aria-label="Основная навигация">
            {NAV.map((item) => (
              <button key={item.label} className={style.link} onClick={() => handleNav(item)}>
                {item.label}
              </button>
            ))}
          </nav>

          <div className={style.actions}>
            <button className={style.cta} onClick={goForm}>Записаться</button>
            <button
              className={`${style.burger} ${open ? style.burgerOpen : ""}`}
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Закрыть меню" : "Открыть меню"}
              aria-expanded={open}
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>

      {/* Мобильное меню */}
      <div className={`${style.sheet} ${open ? style.sheetOpen : ""}`} onClick={() => setOpen(false)}>
        <nav className={style.sheetNav} onClick={(e) => e.stopPropagation()}>
          {NAV.map((item) => (
            <button key={item.label} className={style.sheetLink} onClick={() => handleNav(item)}>
              {item.label}
            </button>
          ))}
          <button className={style.sheetCta} onClick={goForm}>Записаться на занятие</button>
        </nav>
      </div>
    </>
  );
};

export default Header;
