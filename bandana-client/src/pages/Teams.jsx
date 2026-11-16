import React from "react";
import Header from "../widget/Header/ui/Header.jsx";
import TeamsCarts from "../widget/Teams/ui/TeamsCarts.jsx";
import Contact from "../widget/Contact/ui/Contact.jsx";
import Title from "../shared/ui/Title/Title.jsx";
import pageStyles from "../shared/styles/page.module.css";

const Teams = () => {
  return (
    <div>
      <Header />
      <main className={pageStyles.page}>
        <div className={pageStyles.inner}>
          <Title text="Команды" overline="Регулярные занятия" />
        </div>
        <TeamsCarts />
      </main>
      <Contact />
    </div>
  );
};

export default Teams;
