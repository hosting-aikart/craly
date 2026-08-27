'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import './HowItWorks.css';

interface StepMeta {
  id: string;
  color: string;
  icon: ReactNode;
}

const iconProps = {
  viewBox: '0 0 48 48',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function ProfileIcon() {
  return (
    <svg {...iconProps}>
      <rect x="6" y="9" width="36" height="30" rx="5" />
      <circle cx="17" cy="21" r="5" />
      <path d="M10 33c0-4.4 3.6-7 7-7s7 2.6 7 7" />
      <path d="M27 17h9M27 24h6" />
    </svg>
  );
}

function VerifyIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="20" cy="20" r="12" />
      <path d="M15 20l3.5 3.5L26 15" />
      <path d="M28.5 28.5L40 40" />
    </svg>
  );
}

function BadgeIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="24" cy="17" r="10" />
      <path d="M19 15.5l3.2 3.2L29 12" />
      <path d="M17.5 25.5L13 41l11-6 11 6-4.5-15.5" />
    </svg>
  );
}

function HandshakeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M5 21l8-7 7 3 6-4 8 6-5 6" />
      <path d="M13 14l7 6-4 4.5" />
      <path d="M20 20l7 6-4 4" />
      <path d="M27 22l6 5-3.5 4" />
      <path d="M5 21l4 10 5 3" />
      <path d="M43 21l-4 9-4.5 3" />
    </svg>
  );
}

const stepMeta: StepMeta[] = [
  { id: 'profile', color: '#F87531', icon: <ProfileIcon /> },
  { id: 'verify', color: '#2563eb', icon: <VerifyIcon /> },
  { id: 'trust', color: '#eab308', icon: <BadgeIcon /> },
  { id: 'hire', color: '#7c3aed', icon: <HandshakeIcon /> },
];

export default function HowItWorks() {
  const { t } = useLanguage();
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  // One-time reveal when the section scrolls into view — no scroll-jacking,
  // no pinning, just a discrete animation triggered by IntersectionObserver.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="how"
      className={`how-it-works ${visible ? 'how-it-works--visible' : ''}`}
    >
      <div className="how-it-works__glow how-it-works__glow--a" aria-hidden="true" />
      <div className="how-it-works__glow how-it-works__glow--b" aria-hidden="true" />

      <div className="how-it-works__intro">
        <p className="how-it-works__eyebrow">{t.howItWorks.eyebrow}</p>
        <h2 className="how-it-works__heading">{t.howItWorks.heading}</h2>
      </div>

      <div className="how-grid">
        {/* Desktop: one line through all 4. Phone (2×2 grid): row1 connects
            steps 1-2, row2 (below) connects steps 3-4 — row2 is hidden on
            desktop via CSS. */}
        <span className="how-flow-line" aria-hidden="true">
          <span className="how-flow-line__pulse" />
        </span>
        <span className="how-flow-line how-flow-line--row2" aria-hidden="true">
          <span className="how-flow-line__pulse" style={{ animationDelay: '2s' }} />
        </span>

        {stepMeta.map((step, i) => (
          <div
            key={step.id}
            className="how-card"
            style={{ '--accent': step.color, transitionDelay: `${i * 0.12}s` } as CSSProperties}
          >
            <div className="how-card__icon-wrap">
              <span className="how-card__ring" style={{ animationDelay: `${i * 0.4}s` }} />
              <span className="how-card__icon">{step.icon}</span>
              <span className="how-card__number">{i + 1}</span>
            </div>

            <h3 className="how-card__title">{t.howItWorks.steps[i].title}</h3>
            <p className="how-card__text">{t.howItWorks.steps[i].text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
