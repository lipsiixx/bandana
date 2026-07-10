import React, { useEffect, useState } from "react";
import style from "./MasterCasses.module.css";
import Title from "../../shared/ui/Title/Title";
import api from "../../shared/api/api";

const MasterCasses = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getDataMasterCasses = async () => {
      try {
        setLoading(true);
        const response = await api.getMasterClasses();

        let masterClasses = [];
        if (response?.success && Array.isArray(response.data)) {
          masterClasses = response.data;
        } else if (Array.isArray(response)) {
          masterClasses = response;
        }

        const filteredData = masterClasses.filter(
          (item) => item.is_archived !== true,
        );

        setData(filteredData);
      } catch (err) {
        console.error("Ошибка:", err);
      } finally {
        setLoading(false);
      }
    };

    getDataMasterCasses();
  }, []);

  if (loading) {
    return (
      <div className={style.masterClasses}>
        <Title text="ПРОШЕДШИЕ МАСТЕР-КЛАССЫ" />
        <div className={style.container}>
          {[1, 2, 3].map((i) => (
            <div key={i} className={style.skeletonCard} />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={style.masterClasses}>
        <Title text="ПРОШЕДШИЕ МАСТЕР-КЛАССЫ" />
        <div className={style.container}>
          <div className={style.emptyMessage}>
            <span className={style.emptyIcon}>🎓</span>
            <p>Скоро здесь появятся мастер-классы</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={style.masterClasses}>
      <Title text="ПРОШЕДШИЕ МАСТЕР-КЛАССЫ" />
      <div className={style.container}>
        {data.map((item, index) => (
          <div key={item.id} className={style.masterClassCard}>
            <div className={style.cardBadge}>✨ Мастер-класс</div>
            <div className={style.cardContent}>
              <h3 className={style.cardTitle}>{item.name}</h3>

              {item.event_date && (
                <div className={style.cardDate}>
                  <span className={style.dateIcon}>📅</span>
                  <span>
                    {new Date(item.event_date).toLocaleDateString("ru-RU")}
                  </span>
                </div>
              )}

              <p className={style.cardDescription}>
                {item.description ||
                  "Уникальная возможность освоить новые техники и приёмы от профессионалов"}
              </p>

              {item.link && (
                <a
                  href={item.link}
                  className={style.cardLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>Фото с мастер-класса</span>
                  <span className={style.linkArrow}>→</span>
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MasterCasses;
