import React, { useState } from "react";
import style from "./EventCard.module.css";

const formatDate = (d) => {
  if (!d) return null;
  const date = new Date(d);
  if (isNaN(date)) return d; // строка как есть, если не парсится
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
};

const EventCard = ({ event }) => {
  const date = formatDate(event.event_date);
  const [broken, setBroken] = useState(false);
  const hasImage = !!event.fileUrl && !broken;

  return (
    <article className={style.card}>
      {hasImage ? (
        <div className={style.media}>
          <img
            src={event.fileUrl}
            alt={event.description || "Событие"}
            className={style.image}
            loading="lazy"
            onError={() => setBroken(true)}
          />
          <div className={style.scrim} />
          {date && <span className={style.dateChip}>{date}</span>}
        </div>
      ) : (
        /* Без обложки — типографская карточка с крупной датой */
        <div className={style.mediaTypo}>
          {date && <span className={style.bigDate}>{date}</span>}
        </div>
      )}

      <div className={style.body}>
        {event.description && (
          <p className={style.description}>{event.description}</p>
        )}
        {event.place && (
          <p className={style.place}>
            <span className={style.pin} aria-hidden="true">●</span>
            {event.place}
          </p>
        )}
      </div>
    </article>
  );
};

export default EventCard;
