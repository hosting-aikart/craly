'use client';

import dynamic from 'next/dynamic';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import './WhyCraly.css';

const HelmetViewer3D = dynamic(() => import('./3d/HelmetViewer3D'), {
  ssr: false,
});

const glitterBg = '/assets/glitter-back.png';

const badgeClasses = ['badge--top-left', 'badge--mid-right', 'badge--mid-left', 'badge--bottom-right'];

export default function WhyCraly() {
  const { t } = useLanguage();

  return (
    <section
      id="why"
      className="why-craly"
      style={{ backgroundImage: `url(${glitterBg})` }}
      data-navbar-theme="light"
    >
      <p className="why-craly__eyebrow">{t.whyCraly.eyebrow}</p>
      <h2 className="why-craly__heading">{t.whyCraly.heading}</h2>

      <div className="why-craly__stage">
        {/* Central 3D Interactive Construction Helmet */}
        <div className="why-craly__3d-wrap">
          <HelmetViewer3D />
        </div>

        {/* Floating Glass Badges */}
        {t.whyCraly.badges.map((text, i) => (
          <span key={text} className={`why-craly__badge ${badgeClasses[i]}`}>
            <span className="why-craly__check">✓</span> {text}
          </span>
        ))}
      </div>
    </section>
  );
}
