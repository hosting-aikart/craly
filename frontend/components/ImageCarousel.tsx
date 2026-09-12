'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import './ImageCarousel.css';

interface Slide {
  id: 'license' | 'workforce' | 'projects' | 'ratings' | 'documents';
  image: string;
}

const slides: Slide[] = [
  { id: 'license',   image: '/assets/trans2.png' },
  { id: 'workforce', image: '/assets/trans3.png' },
  { id: 'projects',  image: '/assets/trans4.png' },
  { id: 'ratings',   image: '/assets/trans5.png' },
  { id: 'documents', image: '/assets/trans6.png' },
];

// Width of each visible slot (%), front-to-back.
const WIDTHS = [60, 16, 11, 7, 4] as const;
const GAP = 0.5;
const AUTOPLAY_MS = 4500;

// Pre-calculate left offsets for each slot.
const LEFTS: number[] = [];
let x = 0;
WIDTHS.forEach((w) => {
  LEFTS.push(x);
  x += w + GAP;
});

export default function ImageCarousel() {
  const { t } = useLanguage();
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = () => setCurrent((prev) => (prev + 1) % slides.length);
  const prev = () => setCurrent((prev) => (prev - 1 + slides.length) % slides.length);

  // Autoplay — pauses on hover/focus and respects reduced-motion preference.
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (paused || prefersReducedMotion) return;

    intervalRef.current = setInterval(next, AUTOPLAY_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused]);

  return (
    <div
      className="image-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="carousel-window">
        {/* DOM order stays fixed (matches `slides`) — only the computed slot
            (left/width/z-index) changes. Reordering the array itself would
            make React reorder the DOM nodes, which snaps stacking order
            instantly while left/width are still mid-transition, causing
            items to flicker/pop through each other. */}
        {slides.map((slide, i) => {
          const slot = (i - current + slides.length) % slides.length;
          const title = t.carousel[slide.id];
          return (
            <div
              key={slide.id}
              className={`carousel-item ${slot === 0 ? 'carousel-item--active' : ''}`}
              style={{
                width: `${WIDTHS[slot]}%`,
                left: `${LEFTS[slot]}%`,
                zIndex: slides.length - slot,
              }}
              onClick={() => setCurrent(i)}
            >
              <img
                src={slide.image}
                alt={title}
                style={(slide.id === 'documents' || slide.id === 'projects') ? { objectPosition: 'center top' } : undefined}
              />
              <div className="overlay">
                <h3>{title}</h3>
              </div>
            </div>
          );
        })}
      </div>

      <div className="carousel-nav">
        <button onClick={prev} aria-label="Previous">&#8249;</button>
        <button onClick={next} aria-label="Next">&#8250;</button>
      </div>
    </div>
  );
}
