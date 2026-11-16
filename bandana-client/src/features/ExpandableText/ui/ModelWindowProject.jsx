import React, { useEffect, useState } from "react";
import style from "./ModelWindowProject.module.css";
import { observer } from "mobx-react-lite";

import { windowStore } from "../../../entities/model/windowStore";

const ModelWindowProject = observer(() => {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (windowStore.open) {
      const timer = setTimeout(() => {
        setOpacity(1);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setOpacity(0);
    }
    // windowStore.open — observable MobX: компонент обёрнут в observer и
    // перерендеривается при его изменении, поэтому эффект корректно
    // перезапускается. Правило exhaustive-deps этого не распознаёт.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowStore.open]);

  if (windowStore.open) {
    return (
      <div
        className={style.background}
        onClick={() => windowStore.setOpenWindow(false)}
      >
        <div
          style={{ opacity: opacity }}
          className={style.window}
          onClick={(e) => e.stopPropagation()}
        >
          <header className={style.header_window}>
            <button
              className={style.crest}
              onClick={() => windowStore.setOpenWindow(false)}
              aria-label="Закрыть"
            >
              ✕
            </button>
          </header>
          <p>{windowStore.text}</p>
        </div>
      </div>
    );
  } else {
    return null;
  }
});

export default ModelWindowProject;
