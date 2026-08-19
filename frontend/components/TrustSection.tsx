'use client';

import ImageCarousel from './ImageCarousel';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import './TrustSection.css';

export default function TrustSection() {
  const { t } = useLanguage();

  return (
    <section className="trust-section" id="trust">
      <p className="trust-eyebrow">{t.trust.eyebrow}</p>
      <h2 className="trust-heading">{t.trust.heading}</h2>

      <ImageCarousel />
    </section>
  );
}
