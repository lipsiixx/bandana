import React, { useEffect } from "react";
import Header from "../widget/Header/ui/Header.jsx";
import Contact from "../widget/Contact/ui/Contact.jsx";
import Title from "../shared/ui/Title/Title.jsx";
import ServicesGrid from "../widget/Services/ui/ServicesGrid.jsx";
import pageStyles from "../shared/styles/page.module.css";

const Services = () => {
  useEffect(() => {
    document.title = "Услуги — BANDANA";
  }, []);

  return (
    <div>
      <Header />
      <main className={pageStyles.page}>
        <div className={pageStyles.inner}>
          <Title text="Услуги" overline="Каталог" />
        </div>
        <ServicesGrid />
      </main>
      <Contact />
    </div>
  );
};

export default Services;
