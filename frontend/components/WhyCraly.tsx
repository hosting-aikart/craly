'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import './WhyCraly.css';

const helmet = '/assets/helmet.png';
const glitterBg = '/assets/glitter-back.png';

const badgeClasses = ['badge--top-left', 'badge--mid-right', 'badge--mid-left', 'badge--bottom-right'];

export default function WhyCraly() {
  const { t } = useLanguage();
  const sectionRef = useRef<HTMLElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  // Scroll-driven 3D tilt on the helmet — rAF-throttled so it only ever
  // touches `transform` (compositor-only, no layout thrash).
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let ticking = false;

    const update = () => {
      ticking = false;
      const el = sectionRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when the section's center is at the bottom of the viewport,
      // 1 when it's at the top — i.e. progress through the section.
      const center = rect.top + rect.height / 2;
      const progress = Math.min(Math.max(1 - center / (vh + rect.height), 0), 1);

      setTilt({
        y: (progress - 0.5) * 34, // rotateY range
        x: (0.5 - progress) * 12, // rotateX range
      });
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <section
      ref={sectionRef}
      id="why"
      className="why-craly"
      style={{ backgroundImage: `url(${glitterBg})` }}
    >
      <p className="why-craly__eyebrow">{t.whyCraly.eyebrow}</p>
      <h2 className="why-craly__heading">{t.whyCraly.heading}</h2>

      <div className="why-craly__stage">
        <div
          className="why-craly__helmet-wrap"
          style={{
            transform: `translate(-50%, -50%) perspective(1200px) rotateY(${tilt.y}deg) rotateX(${tilt.x}deg)`,
          }}
        >
          <img src={helmet} alt="" className="why-craly__helmet" />
        </div>

        {t.whyCraly.badges.map((text, i) => (
          <span key={text} className={`why-craly__badge ${badgeClasses[i]}`}>
            <span className="why-craly__check">✓</span> {text}
          </span>
        ))}
      </div>
    </section>
  );
}
