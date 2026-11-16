import React, { useEffect, useState } from "react";
import styles from "./TeamsCarts.module.css";
import ApiService from "../../../shared/api/api";
import LoadError from "../../../shared/ui/LoadError/LoadError";
import EmptyEvent from "../../../features/ExpandableText/ui/EmptyEvent";
import { useNavigate } from "react-router-dom";

const TeamsCarts = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await ApiService.getTeams();
        if (res?.error) setLoadError(true);
        if (res?.success) setTeams(res.data);
      } catch (e) {
        console.error("Ошибка загрузки команд", e);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  const goForm = () => {
    navigate("/");
    setTimeout(() => {
      document
        .getElementById("forma")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 500);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        {[1, 2, 3].map((i) => (
          <div key={i} className={styles.skeletonCard} />
        ))}
      </div>
    );
  }

  if (loadError) {
    return <LoadError />;
  }

  if (!teams.length) {
    return (
      <EmptyEvent
        title="Сейчас набор в команды закрыт"
        text="Набор в новые команды я анонсирую в Telegram первым — там даты, возраст групп и места."
      />
    );
  }

  // Открытые наборы — первыми
  const sorted = [...teams].sort(
    (a, b) => Number(b.isRecruiting) - Number(a.isRecruiting),
  );

  return (
    <div className={styles.container}>
      {sorted.map((team) => {
        const open = !!team.isRecruiting;
        return (
          <article
            key={team.id}
            className={`${styles.card} ${open ? "" : styles.cardClosed}`}
          >
            <div className={styles.cardTop}>
              {team.city && <span className={styles.city}>{team.city}</span>}
              {open ? (
                <span className={styles.chipOpen}>
                  <span className={styles.ping} aria-hidden="true">
                    <span className={styles.pingDot} />
                    <span className={styles.pingWave} />
                  </span>
                  Набор открыт
                </span>
              ) : (
                <span className={styles.chipClosed}>Набор закрыт</span>
              )}
            </div>

            <h3 className={styles.teamName}>{team.name}</h3>

            {(team.ageRange || team.instructors || team.choreographer) && (
              <dl className={styles.facts}>
                {team.ageRange && (
                  <>
                    <dt>Возраст</dt>
                    <dd>{team.ageRange}</dd>
                  </>
                )}
                {team.instructors && (
                  <>
                    <dt>Педагоги</dt>
                    <dd>{team.instructors}</dd>
                  </>
                )}
                {team.choreographer && (
                  <>
                    <dt>Хореограф</dt>
                    <dd>{team.choreographer}</dd>
                  </>
                )}
              </dl>
            )}

            {!open && (
              <p className={styles.closedNote}>
                Группа укомплектована. Напишу, когда освободится место.
              </p>
            )}

            {team.achievements?.length > 0 && (
              <ul className={styles.achievements}>
                {team.achievements.slice(0, 3).map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
                {team.achievements.length > 3 && (
                  <li className={styles.achievementsMore}>
                    и ещё {team.achievements.length - 3}
                  </li>
                )}
              </ul>
            )}

            <div className={styles.spacer} />

            {open ? (
              <button className={styles.ctaOpen} onClick={goForm}>
                Записаться на пробное
              </button>
            ) : (
              <button className={styles.ctaClosed} onClick={goForm}>
                Сообщить, когда откроется
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
};

export default TeamsCarts;
