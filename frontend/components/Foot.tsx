'use client';

import { useState } from 'react';
import ContactModal from './ContactModal';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import './Foot.css';

export default function Foot() {
  const { t } = useLanguage();
  const [isContactOpen, setIsContactOpen] = useState(false);

  return (
    <footer className="footer">
      <div className="footer-container">

        <div className="footer-top">

          <div className="footer-brand">
            <img src="/assets/craly-logo.svg" alt="Craly" className="footer__logo-wordmark" />
            <p>{t.footer.tagline}</p>
            <span>{t.footer.subtext}</span>
          </div>

          <div className="footer-links">
            <h3>{t.footer.navHeading}</h3>
            <a href="#trust">{t.footer.navTrust}</a>
            <a href="#why">{t.footer.navWhy}</a>
            <a href="#how">{t.footer.navHow}</a>
            <a href="#faq">{t.footer.navFaq}</a>
            <button className="footer-links__contact" onClick={() => setIsContactOpen(true)}>
              {t.footer.navContact}
            </button>
          </div>

        </div>

        <div className="footer-divider" />

        <div className="footer-bottom">

          <div className="footer-contact">
            <div className="contact-item">
              <span className="icon">📍</span>
              <p>{t.footer.address}</p>
            </div>

            <div className="contact-item">
              <span className="icon">☎</span>
              <p>{t.footer.phone}</p>
            </div>

            <div className="contact-item">
              <span className="icon">✉</span>
              <p>{t.footer.email}</p>
            </div>
          </div>

          <div className="footer-social">
            <a href="#">LinkedIn</a>
            <a href="#">Instagram</a>
            <a href="#">X</a>
          </div>

        </div>

        <div className="footer-divider" />

        <div className="footer-copy">
          {t.footer.copyright}
        </div>

      </div>

      <ContactModal open={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </footer>
  );
}
