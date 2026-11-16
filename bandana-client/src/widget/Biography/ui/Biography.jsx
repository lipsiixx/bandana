import React, { useState } from "react";
import styles from "./Biography.module.css";
import Title from "../../../shared/ui/Title/Title";
import RollerogramButton from "../../../shared/ui/Button/RollerogramButton";
import ExpandableText from "../../../features/ExpandableText/ui/ExpandableText";

const Biography = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section className={styles.biographySection}>
      <div className={styles.inner}>
        <Title text="О Марке" overline="Биография" />

        <div className={styles.grid}>
          <div className={styles.imageBlock}>
            <div className={styles.imageCaption}>
              <span className={styles.imageName}>BANDANA</span>
              <span className={styles.imageRole}>Professional Dancer</span>
            </div>
          </div>

          <div className={styles.textBlock}>
            <h3 className={styles.name}>Марк Алексеевич Шекунов</h3>
            <p className={styles.aka}>aka BANDANA</p>

            <p className={styles.shortBio}>
              Марк Алексеевич Шекунов, более известный в танцевальных кругах как{" "}
              <span className={styles.highlight}>BANDANA</span>, — яркий
              представитель современной российской танцевальной сцены. Его путь
              — это история труда, страсти к движению и стремления к
              совершенству.
            </p>

            <ExpandableText open={isExpanded} />

            <RollerogramButton
              onClick={() => setIsExpanded((prev) => !prev)}
              text={isExpanded ? "Свернуть" : "Читать полностью"}
              className={isExpanded ? "collapseButton" : "expandButton"}
            />

            <footer className={styles.footer}>
              <span className={styles.footerLine} />
              <p>Professional dancer &amp; choreographer</p>
            </footer>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Biography;
