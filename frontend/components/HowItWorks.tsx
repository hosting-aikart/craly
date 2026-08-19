'use client';

import { useEffect, useRef, useState } from 'react';
import './HowItWorks.css';

interface Step {
  number: string;
  title: string;
  text: string;
  color: string;
  img: string;
}

const steps: Step[] = [
  {
    number: '1.',
    title: 'Contractor Creates Profile',
    text: 'Contractors register their business and submit company information.',
    color: '#F87531',
    img: '/assets/constructor1.png',
  },
  {
    number: '2.',
    title: 'Information Gets Verified',
    text: 'Business details, documents, and compliance information are reviewed and verified.',
    color: '#2563eb',
    img: '/assets/constructor2.png',
  },
  {
    number: '3.',
    title: 'Build a Trusted Profile',
    text: 'Verified contractor profiles showcase business information, experience, and work history.',
    color: '#eab308',
    img: '/assets/constructor3.png',
  },
  {
    number: '4.',
    title: 'Hire With Confidence',
    text: 'Verified contractor profiles showcase business information, experience, and work history.',
    color: '#7c3aed',
    img: '/assets/constructor4.png',
  },
];

export default function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const el = containerRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;

      // How far we've scrolled through the pinned container, 0 → 1
      const total = rect.height - vh;
      const progress = Math.min(Math.max(-rect.top / total, 0), 1);

      const index = Math.min(
        steps.length - 1,
        Math.floor(progress * steps.length),
      );
      setActiveIndex(index);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const current = steps[activeIndex];

  return (
    <section className="how-it-works">
      <div className="how-it-works__intro">
        <p className="how-it-works__eyebrow">HOW IT WORKS</p>
        <h2 className="how-it-works__heading">A Simple Verification Process</h2>
      </div>

      {/* Tall scroll track — height determines how long each step stays pinned */}
      <div
        ref={containerRef}
        className="how-it-works__scroll-track"
        style={{ height: `${steps.length * 100}vh` }}
      >
        <div className="how-it-works__sticky">
          <div className="how-step">
            <div className="how-step__text" key={`text-${activeIndex}`}>
              <h3 className="how-step__title" style={{ color: current.color }}>
                {current.number} {current.title}
              </h3>
              <p className="how-step__subtext">{current.text}</p>
            </div>

            <div className="how-step__image-wrap">
              <img
                key={`img-${activeIndex}`}
                src={current.img}
                alt=""
                className="how-step__image"
              />
            </div>
          </div>

          <div className="how-it-works__progress">
            {steps.map((s, i) => (
              <span
                key={s.number}
                className={`how-it-works__dot ${i === activeIndex ? 'how-it-works__dot--active' : ''}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
