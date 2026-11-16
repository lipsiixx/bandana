import React, { useEffect } from "react";
import HeroSerction from "../widget/HeroSection/ui/HeroSerction.jsx";
import EventsSection from "../widget/Events/EventsSection.jsx";
import Biography from "../widget/Biography/ui/Biography.jsx";
import Slider from "../shared/ui/Slider/Slider.jsx";
import Contact from "../widget/Contact/ui/Contact.jsx";
import Header from "../widget/Header/ui/Header.jsx";
import Forma from "../widget/Forma/ui/Forma.jsx";
import api from "../shared/api/api.js";
import MasterCasses from "../widget/MasterCasses/MasterCasses.jsx";
import Reveal from "../shared/ui/Reveal/Reveal.jsx";

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
      <Header />

      <HeroSerction />

      <Reveal as="section" id="events">
        <EventsSection />
      </Reveal>

      <Reveal as="section" id="masterclasses">
        <MasterCasses />
      </Reveal>

      <Reveal as="section" id="biography">
        <Biography />
      </Reveal>

      <Reveal as="section" id="performances">
        <Slider title="Наши выступления" />
      </Reveal>

      <Reveal as="section" id="form">
        <Forma />
      </Reveal>

      <Reveal as="section">
        <Contact />
      </Reveal>
    </div>
  );
};

export default Home;
