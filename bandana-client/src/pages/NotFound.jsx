import React from "react";
import { Link } from "react-router-dom";
import Header from "../widget/Header/ui/Header.jsx";
import style from "./NotFound.module.css";

const NotFound = () => {
  return (
    <div>
      <Header />
      <main className={style.wrapper}>
        <div className={style.content}>
          <p className="bd-overline">Ошибка 404</p>
          <h1 className={style.code}>Страница не найдена</h1>
          <p className={style.subtitle}>
            Похоже, этой страницы нет или она переехала. Вернёмся на сцену.
          </p>
          <Link to="/" className={style.homeLink}>
            На главную
          </Link>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
