import React from "react";
import Header from "../widget/Header/ui/Header.jsx";
import Contact from "../widget/Contact/ui/Contact.jsx";
import ReviewsSection from "../widget/Reviews/ReviewsSection.jsx";
import pageStyles from "../shared/styles/page.module.css";

const Reviews = () => {
  return (
    <div>
      <Header />
      <main className={pageStyles.page}>
        <ReviewsSection />
      </main>
      <Contact />
    </div>
  );
};

export default Reviews;
