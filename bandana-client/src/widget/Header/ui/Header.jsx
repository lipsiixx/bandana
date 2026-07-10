import React from "react";
import style from "./Header.module.css";
import { useNavigate } from "react-router-dom";
import logo from "../../../shared/img/logo.png";
import { colors } from "@mui/material";

const Header = ({ text }) => {
  const navigate = useNavigate();

  return (
    <div className={style.header}>
      {text.map((t, index) =>
        t.img ? (
          <img
            key={index}
            src={t.img}
            alt="logo"
            className={style.logo}
            onClick={() => navigate(t.link)}
          />
        ) : (
          <p
            key={index}
            onClick={() => navigate(t.link)}
            className={style.link}
          >
            {t.page}
          </p>
        ),
      )}
    </div>
  );
};

export default Header;
