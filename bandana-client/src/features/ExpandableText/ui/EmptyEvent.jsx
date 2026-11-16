import React from "react";
import style from "./EmptyEvent.module.css";

const TG_LINK = "https://t.me/dancerinbandana";

const EmptyEvent = ({
  title = "Пока нет ближайших событий",
  text = "Первыми о новых датах и наборах рассказываем в Telegram-канале.",
  tgLink = TG_LINK,
}) => {
  return (
    <div className={style.plashka}>
      <div className={style.icon} aria-hidden="true">📣</div>
      <div className={style.copy}>
        <p className={style.title}>{title}</p>
        <p className={style.text}>{text}</p>
      </div>
      <a
        href={tgLink}
        className={style.btn}
        target="_blank"
        rel="noopener noreferrer"
      >
        Подписаться на канал
      </a>
    </div>
  );
};

export default EmptyEvent;
