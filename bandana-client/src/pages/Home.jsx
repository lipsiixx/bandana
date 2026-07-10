import React, { useEffect, useState } from "react";
import { ParticleCanvas } from "../shared/ui/Canvas/ParticleCanvas.jsx";
import ModelWindowProject from "../features/ExpandableText/ui/ModelWindowProject.jsx";
import HeroSerction from "../widget/HeroSection/ui/HeroSerction.jsx";
import EventsSection from "../widget/Events/EventsSection.jsx";
import Biography from "../widget/Biography/ui/Biography.jsx";
import Slider from "../shared/ui/Slider/Slider.jsx";
import Contact from "../widget/Contact/ui/Contact.jsx";
import Header from "../widget/Header/ui/Header.jsx";
import Forma from "../widget/Forma/ui/Forma.jsx";
import logo from "../shared/img/logo.png";
import api from "../shared/api/api.js";
import MasterCasses from "../widget/MasterCasses/MasterCasses.jsx";

const Home = () => {
  useEffect(() => {
    const initCookie = async () => {
      try {
        await api.refreshCookie();
      } catch (err) {
        console.log("Cookie init:", err.message);
      }
    };

    initCookie();
  }, []);
  return (
    <div>
      <ParticleCanvas className="background" />

      <Header
        text={[
          { img: logo, link: "/" },
          { page: "Галерея", link: "/gallery" },
          { page: "Команды", link: "/teams" },
          { page: "Отзывы", link: "/reviews" },
        ]}
      />

      <ModelWindowProject />

      <HeroSerction />

      <EventsSection />

      <MasterCasses />

      <Biography />

      <Slider title="НАШИ ВЫСТУПЛЕНИЯ" />

      <Forma />

      <Contact />
    </div>
  );
};

export default Home;
