'use client';

import { useState } from 'react';
import './BuiltFor.css';

interface Slide {
  img: string;
  title: string;
  text: string;
}

const slides: Slide[] = [
  {
    img:   '/assets/manufacturers.png',
    title: 'Manufacturers',
    text:  'Find reliable labour contractors for production and plant operations.',
  },
  {
    img:   '/assets/audience2.png',
    title: 'EPC & Engineering Companies',
    text:  'Evaluate contractors before project execution.',
  },
  {
    img:   '/assets/audience3.png',
    title: 'Infrastructure & Construction',
    text:  'Review contractor profiles before awarding work.',
  },
  {
    img:   '/assets/audience4.png',
    title: 'Labour Contractors',
    text:  'Build trust, showcase experience, and grow your business.',
  },
];

export default function BuiltFor() {
  const [index, setIndex] = useState(0);

  const go = (dir: number) =>
    setIndex((prev) => (prev + dir + slides.length) % slides.length);

  const current = slides[index];

  return (
    <section className="built-for">
      <p className="built-for__eyebrow">BUILT FOR</p>
      <h2 className="built-for__heading">
        Designed for India&apos;s Industrial
        <br />
        Ecosystem
      </h2>

      <div className="built-for__carousel">
        <div className="built-for__image-wrap">
          <img
            key={current.img}
            src={current.img}
            alt=""
            className="built-for__image"
          />
        </div>

        <div className="built-for__footer">
          <div className="built-for__caption" key={current.title}>
            <h3 className="built-for__title">{current.title}</h3>
            <p className="built-for__text">{current.text}</p>
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
