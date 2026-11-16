import React from "react";
import style from "./Title.module.css";

const Title = ({ text, overline, align = "left" }) => {
  return (
    <header className={`${style.head} ${align === "center" ? style.center : ""}`}>
      {overline && <p className={`bd-overline ${style.over}`}>{overline}</p>}
      <h2 className={style.title}>{text}</h2>
    </header>
  );
};

export default Title;
