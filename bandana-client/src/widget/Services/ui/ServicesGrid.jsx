import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import style from "./ServicesGrid.module.css";
import ApiService from "../../../shared/api/api";
import LoadError from "../../../shared/ui/LoadError/LoadError";

const ServicesGrid = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(false);
      const res = await ApiService.getServices();
      if (res?.success) setServices(res.data);
      else setLoadError(true);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className={`bd-container ${style.grid}`}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className={style.skeleton} />
        ))}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bd-container">
        <LoadError />
      </div>
    );
  }

  return (
    <div className={`bd-container ${style.grid}`}>
      {services.map((s) => (
        <Link key={s.slug} to={`/services/${s.slug}`} className={style.card}>
          <div className={style.cover}>
            {s.coverImageUrl ? (
              <img src={s.coverImageUrl} alt="" />
            ) : (
              <span className={style.coverPlaceholder} aria-hidden="true" />
            )}
            {s.status !== "active" && <span className={style.soon}>Скоро</span>}
          </div>
          <div className={style.body}>
            <h3 className={style.title}>{s.title}</h3>
            <p className={style.desc}>{s.shortDescription}</p>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default ServicesGrid;
