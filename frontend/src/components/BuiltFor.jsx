import { useState } from 'react';
import './BuiltFor.css';
import manufacturers from '../assets/manufacturers.png';
import audience2 from '../assets/audience2.png';
import audience3 from '../assets/audience3.png';
import audience4 from '../assets/audience4.png';

const slides = [
  {
    img: manufacturers,
    title: 'Manufacturers',
    text: 'Find reliable labour contractors for production and plant operations.',
  },
  {
    img: audience2,
    title: 'EPC & Engineering Companies', // swap in the real title/text/asset name for this slide
    text: 'Evaluate contractors before project execution.',
  },
  {
    img: audience3,
    title: 'Infrastructure & Construction',
    text: 'Review contractor profiles before awarding work.',
  },
  {
    img: audience4,
    title: 'Labour Contractors',
    text: 'Build trust, showcase experience, and grow your business.',
  },
];

export default function BuiltFor() {
  const [index, setIndex] = useState(0);

  const go = (dir) => {
    setIndex((prev) => (prev + dir + slides.length) % slides.length);
  };

  const current = slides[index];

  return (
    <section className="built-for">
      <p className="built-for__eyebrow">BUILT FOR</p>
      <h2 className="built-for__heading">
        Designed for India's Industrial
        <br />
        Ecosystem
      </h2>

      <div className="built-for__carousel">
        <div className="built-for__image-wrap">
          <img
            key={current.img} /* new key = fresh fade-in each slide change */
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
            <button onClick={() => go(1)} aria-label="Next">›</button>
          </div>
        </div>
      </div>
    </section>
  );
}