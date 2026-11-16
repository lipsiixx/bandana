import React, { useState, useEffect } from "react";
import style from "./Events.module.css";
import EventCard from "../../features/ExpandableText/ui/EventCard";
import EmptyEvent from "../../features/ExpandableText/ui/EmptyEvent";
import Title from "../../shared/ui/Title/Title";
import LoadError from "../../shared/ui/LoadError/LoadError";
import ApiService from "../../shared/api/api";

const EventsSection = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        setLoadError(false);
        const res = await ApiService.getEvents();

        if (res?.error) setLoadError(true);

        if (res?.success && Array.isArray(res.data)) {
          setEvents(res.data);
        } else {
          setEvents([]);
        }
      } catch (err) {
        console.error("Ошибка загрузки событий:", err);
        setEvents([]);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Правило «реальное значение или элемент скрыт»: при ошибке/пустоте
  // секция не рендерит заголовок во весь экран, а показывает компактную плашку.
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
  } else if (events.length === 0) {
    content = <EmptyEvent />;
  } else {
    content = (
      <div className={style.container}>
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    );
  }

  return (
    <div className={style.events}>
      <div className={style.inner}>
        <Title text="События" overline="Ближайшее" />
        {content}
      </div>
    </div>
  );
};

export default EventsSection;
