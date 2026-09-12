'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import './HowItWorks.css';

export default function HowItWorks() {
  const { t } = useLanguage();
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const steps = [
    {
      number: '01',
      title: t.howItWorks?.steps?.[0]?.title || 'Contractor Creates Profile',
      text: t.howItWorks?.steps?.[0]?.text || 'Contractors register their business and submit company information.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
    {
      number: '02',
      title: t.howItWorks?.steps?.[1]?.title || 'Information Gets Verified',
      text: t.howItWorks?.steps?.[1]?.text || 'Business details, documents, and compliance information are reviewed and verified.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ),
    },
    {
      number: '03',
      title: t.howItWorks?.steps?.[2]?.title || 'Build a Trusted Profile',
      text: t.howItWorks?.steps?.[2]?.text || 'Verified contractor profiles showcase business information, experience, and work history.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="7" />
          <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
        </svg>
      ),
    },
    {
      number: '04',
      title: t.howItWorks?.steps?.[3]?.title || 'Hire With Confidence',
      text: t.howItWorks?.steps?.[3]?.text || 'Businesses review verified profiles and reach out to the right contractor with confidence.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <polyline points="16 11 18 13 22 9" />
        </svg>
      ),
    },
  ];

  return (
    <section
      ref={sectionRef}
      className={`how-section ${isVisible ? 'how-section--visible' : ''}`}
      id="how"
      data-navbar-theme="light"
    >
      <div className="how-container">
        {/* Section Header */}
        <div className="how-header">
          <span className="how-eyebrow">{t.howItWorks?.eyebrow || 'HOW IT WORKS'}</span>
          <h2 className="how-title">{t.howItWorks?.heading || 'A Simple Verification Process'}</h2>
        </div>

        {/* Steps Grid Flow */}
        <div className="how-steps-grid">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="how-step-card"
              style={{ '--delay': `${idx * 0.12}s` } as React.CSSProperties}
            >
              <div className="how-step-top">
                <div className="how-step-icon">{step.icon}</div>
                <span className="how-step-number">{step.number}</span>
              </div>
              <h3 className="how-step-title">{step.title}</h3>
              <p className="how-step-text">{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
