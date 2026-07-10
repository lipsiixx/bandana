import React from "react";
import { ParticleCanvas } from "../shared/ui/Canvas/ParticleCanvas";
import Header from "../widget/Header/ui/Header.jsx";
import logo from "../shared/img/logo.png";
import ReviewsSection from "../widget/Reviews/ReviewsSection.jsx"; // Импортируем компонент отзывов

const Reviews = () => {
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
      <ReviewsSection />
    </div>
  );
};

export default Reviews;
