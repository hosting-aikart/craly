'use client';

import { useMemo, useState } from 'react';
import './ImageCarousel.css';

interface Slide {
  id: string;
  image: string;
  title: string;
}

const slides: Slide[] = [
  { id: 'business',  image: '/assets/shield-icon.png', title: 'Business Verification' },
  { id: 'license',   image: '/assets/trans2.png',      title: 'Licenses & Compliance' },
  { id: 'workforce', image: '/assets/trans3.png',      title: 'Workforce Details' },
  { id: 'projects',  image: '/assets/trans4.png',      title: 'Project History' },
  { id: 'ratings',   image: '/assets/trans5.png',      title: 'Ratings & Reviews' },
  { id: 'documents', image: '/assets/trans6.png',      title: 'Verified Documents' },
];

// Width of each visible position (%)
const WIDTHS = [58, 14, 9, 7, 5, 3] as const;
const GAP = 0.5;

// Pre-calculate left positions
const LEFTS: number[] = [];
let x = 0;
WIDTHS.forEach((w) => {
  LEFTS.push(x);
  x += w + GAP;
});

export default function ImageCarousel() {
  const [current, setCurrent] = useState(0);

  const visibleSlides = useMemo(
    () => [...slides.slice(current), ...slides.slice(0, current)],
    [current],
  );

  const next = () => setCurrent((prev) => (prev + 1) % slides.length);
  const prev = () => setCurrent((prev) => (prev - 1 + slides.length) % slides.length);

  return (
    <div className="image-carousel">
      <div className="carousel-window">
        {visibleSlides.map((slide, index) => (
          <div
            key={slide.id}
            className="carousel-item"
            style={{
              width: `${WIDTHS[index]}%`,
              left:  `${LEFTS[index]}%`,
            }}
          >
            <img src={slide.image} alt={slide.title} />
            <div className="overlay">
              <h3>{slide.title}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="carousel-nav">
        <button onClick={prev}>&#8249;</button>
        <button onClick={next}>&#8250;</button>
      </div>
    </div>
  );
}
