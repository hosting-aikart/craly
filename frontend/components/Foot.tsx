'use client';

import { useState } from 'react';
import ContactModal from './ContactModal';
import './Foot.css';

const helmetLogo = '/assets/helmet.png';

export default function Foot() {
  const [isContactOpen, setIsContactOpen] = useState(false);

  return (
    <footer className="footer">
      <div className="footer-container">

        <div className="footer-top">

          <div className="footer-brand">
            <img src={helmetLogo} alt="Craly" className="footer__logo" />
            <p>Building trust before the first phone call.</p>
            <span>Verified contractor profiles for modern businesses.</span>
          </div>

          <div className="footer-links">
            <h3>Navigation</h3>
            <a href="#trust">Trust Section</a>
            <a href="#why">Why Craly</a>
            <a href="#how">How It Works</a>
            <a href="#faq">FAQ</a>
            <button className="footer-links__contact" onClick={() => setIsContactOpen(true)}>
              Contact Us
            </button>
          </div>

        </div>

        <div className="footer-divider" />

        <div className="footer-bottom">

          <div className="footer-contact">
            <div className="contact-item">
              <span className="icon">📍</span>
              <p>
                Badnera Rd, in front of Tapadia City Centre Mall,
                Saturna, Amravati, Maharashtra 444607
              </p>
            </div>

            <div className="contact-item">
              <span className="icon">☎</span>
              <p>+91 95032 52288</p>
            </div>

            <div className="contact-item">
              <span className="icon">✉</span>
              <p>hello@craly.com</p>
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
          © 2026 Craly. All rights reserved.
        </div>

      </div>

      <ContactModal open={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </footer>
  );
}
