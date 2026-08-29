'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import './BuiltFor.css';

const slideImages = [
  '/assets/manufacturers.png',
  '/assets/audience2.png',
  '/assets/audience3.png',
  '/assets/audience4.png',
];

export default function BuiltFor() {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);

  const go = (dir: number) =>
    setIndex((prev) => (prev + dir + slideImages.length) % slideImages.length);

  const currentImg = slideImages[index];
  const currentSlide = t.builtFor.slides[index];

  return (
    <section className="built-for" data-navbar-theme="dark">
      <p className="built-for__eyebrow">{t.builtFor.eyebrow}</p>
      <h2 className="built-for__heading">{t.builtFor.heading}</h2>

      <div className="built-for__carousel">
        <div className="built-for__image-wrap">
          <img
            key={currentImg}
            src={currentImg}
            alt=""
            className="built-for__image"
          />
        </div>

        <div className="built-for__footer">
          <div className="built-for__caption" key={index}>
            <h3 className="built-for__title">{currentSlide.title}</h3>
            <p className="built-for__text">{currentSlide.text}</p>
          </div>

          <div className="built-for__nav">
            <button onClick={() => go(-1)} aria-label="Previous">‹</button>
            <button onClick={() => go(1)}  aria-label="Next">›</button>
          </div>
        </div>
      </div>
    </section>
  );
}
