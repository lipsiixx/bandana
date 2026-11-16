import React from "react";
import Title from "../../../shared/ui/Title/Title";
import style from "./Contact.module.css";
import RollerogramButton from "../../../shared/ui/Button/RollerogramButton";

import tg from "../../../shared/svg/tg.svg";
import vk from "../../../shared/svg/vk.svg";
import instagram from "../../../shared/svg/instagram.svg";
import tiktok from "../../../shared/svg/tiktok.svg";

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
          <RollerogramButton
            onClick={() =>
              window.open(
                "https://www.instagram.com/mark.bandana?psln=ejJ4eHU0YTJid2Nm",
                "_blank",
                "noopener,noreferrer",
              )
            }
            className="instagram"
            text="Instagram"
            svg={instagram}
          />
          <RollerogramButton
            onClick={() =>
              window.open(
                "https://www.tiktok.com/@dancerinbandana?_r=1&_t=ZP-9BSYinbYjkc",
                "_blank",
                "noopener,noreferrer",
              )
            }
            className="tiktok"
            text="TikTok"
            svg={tiktok}
          />
        </div>
      </div>
    </div>
  );
};

export default Contact;
