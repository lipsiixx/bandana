import React from "react";
import { ParticleCanvas } from "../shared/ui/Canvas/ParticleCanvas";
import Header from "../widget/Header/ui/Header.jsx";
import TeamsCarts from "../widget/Teams/ui/TeamsCarts.jsx";
import Contact from "../widget/Contact/ui/Contact.jsx";
import logo from "../shared/img/logo.png";
const Teams = () => {
  return (
    <div>
      <ParticleCanvas className="background" />
      <Header
        text={[
          { img: logo, link: "/" },
          { page: "Галерея", link: "/gallery" },
          { page: "Отзывы", link: "/reviews" },
        ]}
      />
      <TeamsCarts />
      <Contact />
    </div>
  );
};

export default Teams;
