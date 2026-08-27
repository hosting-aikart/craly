'use client';

import { useState } from 'react';
import ContactModal from './ContactModal';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import './Foot.css';

function MapPinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="footer-icon">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="footer-icon">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="footer-icon">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export default function Foot() {
  const { t } = useLanguage();
  const [isContactOpen, setIsContactOpen] = useState(false);

  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Main Grid */}
        <div className="footer-grid">
          {/* Brand Column */}
          <div className="footer-brand">
            <img src="/assets/craly-logo-white.png" alt="Craly" className="footer__logo-wordmark" />
            <p className="footer-brand__tagline">{t.footer.tagline}</p>
            <span className="footer-brand__subtext">{t.footer.subtext}</span>
          </div>

          {/* Navigation Links Column */}
          <div className="footer-links">
            <h3 className="footer-heading">{t.footer.navHeading}</h3>
            <div className="footer-links__list">
              <a href="#trust">{t.footer.navTrust}</a>
              <a href="#why">{t.footer.navWhy}</a>
              <a href="#how">{t.footer.navHow}</a>
              <a href="#faq">{t.footer.navFaq}</a>
              <button className="footer-links__contact" onClick={() => setIsContactOpen(true)}>
                {t.footer.navContact}
              </button>
            </div>
          </div>

          {/* Contact Details Column */}
          <div className="footer-contact-col">
            <h3 className="footer-heading">Contact Information</h3>
            <div className="footer-contact">
              <div className="contact-item">
                <MapPinIcon />
                <p>{t.footer.address}</p>
              </div>

              <div className="contact-item">
                <PhoneIcon />
                <p>{t.footer.phone}</p>
              </div>

              <div className="contact-item">
                <MailIcon />
                <p>{t.footer.email}</p>
              </div>
            </div>
          </div>

          {/* Social Links Column */}
          <div className="footer-social-col">
            <h3 className="footer-heading">Connect With Us</h3>
            <p className="footer-social__desc">Verified workforce solution for contractors and businesses.</p>
            <div className="footer-social">
              <a href="#" aria-label="LinkedIn" className="footer-social__link">
                <LinkedInIcon />
                <span>LinkedIn</span>
              </a>
              <a href="#" aria-label="Instagram" className="footer-social__link">
                <InstagramIcon />
                <span>Instagram</span>
              </a>
              <a href="#" aria-label="X" className="footer-social__link">
                <TwitterIcon />
                <span>X</span>
              </a>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="footer-divider" />

        {/* Bottom Bar */}
        <div className="footer-bottom">
          <p className="footer-copy">{t.footer.copyright}</p>
        </div>
      </div>

      <ContactModal open={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </footer>
  );
}
