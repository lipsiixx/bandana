import React, { useEffect, useState } from "react";
import style from "./MasterCasses.module.css";
import Title from "../../shared/ui/Title/Title";
import LoadError from "../../shared/ui/LoadError/LoadError";
import EmptyEvent from "../../features/ExpandableText/ui/EmptyEvent";
import api from "../../shared/api/api";

const formatDate = (d) => {
  if (!d) return null;
  const date = new Date(d);
  if (isNaN(date)) return d;
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const MasterCasses = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const getDataMasterCasses = async () => {
      try {
        setLoading(true);
        setLoadError(false);
        const response = await api.getMasterClasses();

        if (response?.error) setLoadError(true);

        let masterClasses = [];
        if (response?.success && Array.isArray(response.data)) {
          masterClasses = response.data;
        } else if (Array.isArray(response)) {
          masterClasses = response;
        }

        setData(masterClasses.filter((item) => item.is_archived !== true));
      } catch (err) {
        console.error("Ошибка:", err);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };

    getDataMasterCasses();
  }, []);

  let content;
  if (loading) {
    content = (
      <div className={style.container}>
        {[1, 2, 3].map((i) => (
          <div key={i} className={style.skeletonCard} />
        ))}
      </div>
    );
  } else if (loadError) {
    content = (
      <div className={style.container}>
        <LoadError />
      </div>
    );
  } else if (data.length === 0) {
    content = (
      <EmptyEvent
        title="Мастер-классов пока не было"
        text="Как только Марк проведёт первый — он появится здесь с фото и отзывами."
      />
    );
  } else {
    content = (
      <div className={style.container}>
        {data.map((item) => {
          const date = formatDate(item.event_date);
          return (
            <article key={item.id} className={style.card}>
              <span className={style.badge}>Мастер-класс</span>
              <h3 className={style.cardTitle}>{item.name}</h3>
              {date && <p className={style.date}>{date}</p>}
              {item.description && (
                <p className={style.description}>{item.description}</p>
              )}
              {item.link && (
                <a
                  href={item.link}
                  className={style.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Фото с мастер-класса
                  <span className={style.arrow} aria-hidden="true">→</span>
                </a>
              )}
            </article>
          );
        })}
      </div>
    );
  }

  return (
    <div className={style.masterClasses}>
      <div className={style.inner}>
        <Title text="Мастер-классы" overline="Прошедшие" />
        {content}
      </div>
    </div>
  );
};

export default MasterCasses;
