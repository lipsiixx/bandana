import React from "react";
import style from "./AudioPortfolioItem.module.css";

const AudioPortfolioItem = ({ item }) => (
  <div className={style.item}>
    <div className={style.meta}>
      <span className={style.title}>{item.title || "Пример работы"}</span>
      {item.note && <span className={style.note}>{item.note}</span>}
    </div>
    <audio controls src={item.url} className={style.audio} preload="none" />
  </div>
);

export default AudioPortfolioItem;
