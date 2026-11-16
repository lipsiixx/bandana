import React from "react";
import Title from "../../../shared/ui/Title/Title";
import style from "./Contact.module.css";
import RollerogramButton from "../../../shared/ui/Button/RollerogramButton";

import tg from "../../../shared/svg/tg.svg";
import vk from "../../../shared/svg/vk.svg";

const Contact = () => {
  return (
    <div className={style.contact}>
      <div className={style.inner}>
        <Title text="Контакты" overline="Связаться" align="center" />

        <div className={style.buttons}>
          <RollerogramButton
            onClick={() =>
              window.open(
                "https://t.me/dancerinbandana",
                "_blank",
                "noopener,noreferrer",
              )
            }
            className="telegram"
            text="Telegram-канал"
            svg={tg}
          />
          <RollerogramButton
            onClick={() =>
              window.open(
                "https://vk.com/dancer_bandana",
                "_blank",
                "noopener,noreferrer",
              )
            }
            className="vk"
            text="ВКонтакте"
            svg={vk}
          />
          <RollerogramButton
            onClick={() =>
              window.open(
                "https://vk.com/fsdschool",
                "_blank",
                "noopener,noreferrer",
              )
            }
            className="bot"
            text="Сообщество школы"
            svg={vk}
          />
        </div>
      </div>
    </div>
  );
};

export default Contact;
