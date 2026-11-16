import React from "react";
import style from "./LoadError.module.css";

const LoadError = ({ text = "Не удалось загрузить. Попробуйте обновить страницу." }) => {
  return (
    <div className={style.loadError}>
      <span className={style.icon}>⚠️</span>
      <p className={style.text}>{text}</p>
      <button
        type="button"
        className={style.button}
        onClick={() => window.location.reload()}
      >
        Обновить
      </button>
    </div>
  );
};

export default LoadError;
