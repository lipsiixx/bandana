import React, { useState, useEffect } from "react";
import style from "./FilteredPhotos.module.css";
import ApiService from "../../../shared/api/api";
import LoadError from "../../../shared/ui/LoadError/LoadError";

const MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

/* Группировка по месяцу загрузки (новые сверху). Фото без даты — в конец,
   одной группой без заголовка. */
const groupByMonth = (photos) => {
  const dated = [];
  const undated = [];
  photos.forEach((p) => {
    const d = p.createdAt ? new Date(p.createdAt) : null;
    if (d && !Number.isNaN(d.getTime())) dated.push({ ...p, _date: d });
    else undated.push(p);
  });
  dated.sort((a, b) => b._date - a._date);

  const groups = [];
  dated.forEach((p) => {
    const key = `${p._date.getFullYear()}-${p._date.getMonth()}`;
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) {
      g = {
        key,
        title: `${MONTHS[p._date.getMonth()]} ${p._date.getFullYear()}`,
        items: [],
      };
      groups.push(g);
    }
    g.items.push(p);
  });
  if (undated.length) groups.push({ key: "undated", title: "", items: undated });
  return groups;
};

const FilteredPhotos = () => {
  const [filter, setFilter] = useState("Все");
  const [photos, setPhotos] = useState([]);
  const [filters, setFilters] = useState(["Все"]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setLoadError(false);

        const [galleryRes, filtersRes] = await Promise.all([
          ApiService.getGallery(),
          ApiService.getGalleryFilters(),
        ]);

        if (galleryRes?.error || filtersRes?.error) {
          setLoadError(true);
        }

        if (galleryRes.success) {
          setPhotos(galleryRes.data);
        }

        if (filtersRes.success) {
          setFilters(filtersRes.data);
          setFilter((prev) => (filtersRes.data.includes(prev) ? prev : "Все"));
        }
      } catch (err) {
        console.error("Ошибка загрузки данных галереи:", err);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredPhotos =
    filter === "Все" ? photos : photos.filter((img) => img.filter === filter);
  const groups = groupByMonth(filteredPhotos);

  return (
    <section className={style.photo_section}>
      {/* Чипы-фильтры: чип категории без файлов скрыт (приходят из API) */}
      {!loading && filters.length > 1 && (
        <div className={style.chips} role="tablist" aria-label="Категории фото">
          {filters.map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              className={filter === f ? style.chipOn : style.chip}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className={style.gallery}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className={style.skeleton} />
          ))}
        </div>
      ) : loadError ? (
        <LoadError />
      ) : filteredPhotos.length === 0 ? (
        <p className={style.noPhotos}>
          {filter === "Все"
            ? "Фотографии появятся после ближайших выступлений"
            : `В категории «${filter}» пока нет фотографий`}
        </p>
      ) : (
        groups.map((group) => (
          <div key={group.key} className={style.group}>
            {group.title && (
              <h3 className={style.groupTitle}>{group.title}</h3>
            )}
            <div className={style.gallery}>
              {group.items.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  className={style.tile}
                  onClick={() =>
                    setSelectedImage({ src: img.fileUrl, footer: img.footer })
                  }
                  aria-label={img.footer || "Открыть фото"}
                >
                  <img
                    src={img.fileUrl}
                    alt={img.footer || img.filter || "Фото"}
                    className={style.photo}
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      {selectedImage && (
        <div
          className={style.modalOverlay}
          onClick={() => setSelectedImage(null)}
        >
          <div
            className={style.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage.src}
              alt="Увеличенное фото"
              className={style.modalImage}
            />
            <button
              className={style.closeButton}
              onClick={() => setSelectedImage(null)}
            >
              ×
            </button>
          </div>

          {selectedImage.footer && (
            <footer className={style.footer_window_photo}>
              {selectedImage.footer}
            </footer>
          )}
        </div>
      )}
    </section>
  );
};

export default FilteredPhotos;
