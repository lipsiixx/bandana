import React from "react";
import Header from "../widget/Header/ui/Header.jsx";
import FilteredPhotos from "../features/ExpandableText/ui/FilteredPhotos.jsx";
import Contact from "../widget/Contact/ui/Contact.jsx";
import Title from "../shared/ui/Title/Title.jsx";
import pageStyles from "../shared/styles/page.module.css";

const Gallery = () => {
  return (
    <div>
      <Header />
      <main className={pageStyles.page}>
        <div className={pageStyles.inner}>
          <Title text="Галерея" overline="Фото" />
        </div>
        <FilteredPhotos />
      </main>
      <Contact />
    </div>
  );
};

export default Gallery;
