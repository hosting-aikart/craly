'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import './Hero.css';

const heroBg = '/assets/hero-bg.png';
const helmetIcon = '/assets/helmet.png';

export default function Hero() {
  const [visible, setVisible] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section
      className="hero"
      style={{ backgroundImage: `url(${heroBg})` }}
    >
      <div className={`hero-content ${visible ? 'hero-content--visible' : ''}`}>
        <img src={helmetIcon} alt="" className="hero-icon" />

        <h1 className="hero-headline">
          {t.hero.headlinePrefix}
          <span className="hero-accent">{t.hero.headlineAccent}</span>
          {t.hero.headlineSuffix}
        </h1>

        <p className="hero-subtext">{t.hero.subtext}</p>

        <div className="hero-cta">
          <Link href="/contractors" className="hero-cta__btn hero-cta__btn--solid">
            {t.hero.ctaFind}
          </Link>
          <Link href="/signup?role=contractor" className="hero-cta__btn hero-cta__btn--outline">
            {t.hero.ctaJoin}
          </Link>
        </div>
      </div>
    </section>
  );
}
