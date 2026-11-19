import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "../widget/Header/ui/Header.jsx";
import Contact from "../widget/Contact/ui/Contact.jsx";
import Title from "../shared/ui/Title/Title.jsx";
import LoadError from "../shared/ui/LoadError/LoadError";
import AudioPortfolioItem from "../widget/ServiceDetail/ui/AudioPortfolioItem.jsx";
import ApiService from "../shared/api/api";
import pageStyles from "../shared/styles/page.module.css";
import style from "./ServiceDetail.module.css";

const ServiceDetail = () => {
  const { slug } = useParams();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(false);
      setNotFound(false);
      const res = await ApiService.getServiceBySlug(slug);
      if (res?.success && res.data) setService(res.data);
      else if (res?.error) setLoadError(true);
      else setNotFound(true);
      setLoading(false);
    };
    load();
  }, [slug]);

  useEffect(() => {
    document.title = service ? `${service.title} — BANDANA` : "Услуга — BANDANA";
  }, [service]);

  const detail = service?.detail || {};
  const formats = detail.formats || [];
  const advantages = detail.advantages || [];
  const process = detail.process || [];
  const faq = detail.faq || [];
  const portfolio = detail.portfolio || [];

  return (
    <div>
      <Header />
      <main className={pageStyles.page}>
        <div className={pageStyles.inner}>
          {loading ? (
            <div className={style.skeleton} />
          ) : loadError ? (
            <LoadError />
          ) : notFound ? (
            <div className={style.notFound}>
              <h2 className={style.notFoundTitle}>Услуга не найдена</h2>
              <Link to="/services" className={style.backLink}>
                ← Вернуться в каталог услуг
              </Link>
            </div>
          ) : (
            <>
              <Title
                text={service.title}
                overline={service.status === "active" ? "Услуга" : "Скоро"}
              />

              {service.description && <p className={style.description}>{service.description}</p>}

              {formats.length > 0 && (
                <section className={style.section}>
                  <h3 className={style.sectionTitle}>Форматы</h3>
                  <div className={style.formatsGrid}>
                    {formats.map((f) => (
                      <div key={f.key} className={style.formatCard}>
                        <h4 className={style.formatTitle}>{f.title}</h4>
                        <p className={style.formatDesc}>{f.description}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {portfolio.length > 0 && (
                <section className={style.section}>
                  <h3 className={style.sectionTitle}>Портфолио</h3>
                  <div className={style.portfolioList}>
                    {portfolio.map((p, i) => (
                      <AudioPortfolioItem key={i} item={p} />
                    ))}
                  </div>
                </section>
              )}

              {advantages.length > 0 && (
                <section className={style.section}>
                  <h3 className={style.sectionTitle}>Почему так</h3>
                  <ul className={style.list}>
                    {advantages.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </section>
              )}

              {process.length > 0 && (
                <section className={style.section}>
                  <h3 className={style.sectionTitle}>Как это работает</h3>
                  <ol className={style.processList}>
                    {process.map((p, i) => (
                      <li key={i} className={style.processItem}>
                        <span className={style.processNum} aria-hidden="true">
                          {i + 1}
                        </span>
                        {p}
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {faq.length > 0 && (
                <section className={style.section}>
                  <h3 className={style.sectionTitle}>Вопросы</h3>
                  <div className={style.faqList}>
                    {faq.map((item, i) => (
                      <details key={i} className={style.faqItem}>
                        <summary className={style.faqQ}>{item.q}</summary>
                        <p className={style.faqA}>{item.a}</p>
                      </details>
                    ))}
                  </div>
                </section>
              )}

              <div className={style.ctaRow}>
                {service.status === "active" ? (
                  <Link to={`/services/${slug}/order`} className={style.orderBtn}>
                    Оформить заказ
                  </Link>
                ) : (
                  <p className={style.soonNote}>
                    Эта услуга пока не принимает заказы — загляните позже.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </main>
      <Contact />
    </div>
  );
};

export default ServiceDetail;
