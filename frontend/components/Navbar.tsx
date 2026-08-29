'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { LANGUAGES } from '@/lib/i18n/translations';
import { useAuth } from '@/lib/auth/useAuth';
import ContactModal from './ContactModal';
import './Navbar.css';

export default function Navbar() {
  const { language, setLanguage, t } = useLanguage();
  const { user } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Public navbar belongs ONLY to the marketing site and should NEVER be shown for authenticated users on workspace pages
  if (user || pathname.startsWith('/business') || pathname.startsWith('/contractor') || pathname.startsWith('/admin') || pathname.startsWith('/staff')) {
    return null;
  }

  const navLinks = [
    { href: '/#faq', label: 'FAQ' },
    { href: '#contact', label: 'Contact Us', isContact: true },
  ];

  const currentLangObj = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  const closeAll = () => {
    setMenuOpen(false);
    setLangDropdownOpen(false);
  };

  return (
    <>
      <header className={`craly-nav ${scrolled ? 'craly-nav--scrolled' : ''} ${menuOpen ? 'craly-nav--menu-open' : ''}`}>
        <div className="craly-nav__container">
          
          {/* ── Brand Logo ── */}
          <Link href="/" className="craly-nav__brand" onClick={closeAll}>
            <img src="/assets/craly-logo.png" alt="Craly" className="craly-nav__logo-wordmark" />
          </Link>

          {/* ── Desktop Center Navigation ── */}
          <nav className="craly-nav__menu" aria-label="Main Navigation">
            {navLinks.map((link) => {
              if (link.isContact) {
                return (
                  <button
                    key={link.label}
                    type="button"
                    className="craly-nav__link"
                    onClick={() => {
                      closeAll();
                      setIsContactOpen(true);
                    }}
                  >
                    {link.label}
                  </button>
                );
              }

              const isActive = !link.href.includes('#') && pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`craly-nav__link ${isActive ? 'craly-nav__link--active' : ''}`}
                  onClick={closeAll}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

        {/* ── Desktop Right Controls ── */}
        <div className="craly-nav__actions">
          
          {/* Language Selector Dropdown */}
          <div className="craly-nav__lang-wrapper" ref={langRef}>
            <button
              type="button"
              className={`craly-nav__lang-trigger ${langDropdownOpen ? 'craly-nav__lang-trigger--active' : ''}`}
              onClick={() => setLangDropdownOpen((v) => !v)}
              aria-label="Select Language"
              aria-expanded={langDropdownOpen}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span>{currentLangObj.label}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`craly-nav__lang-caret ${langDropdownOpen ? 'craly-nav__lang-caret--up' : ''}`}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {langDropdownOpen && (
              <div className="craly-nav__lang-dropdown">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    className={`craly-nav__lang-option ${language === l.code ? 'craly-nav__lang-option--active' : ''}`}
                    onClick={() => {
                      setLanguage(l.code);
                      setLangDropdownOpen(false);
                    }}
                  >
                    <span>{l.label}</span>
                    {language === l.code && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="craly-nav__divider" aria-hidden="true" />

          {/* Auth Buttons */}
          <div className="craly-nav__auth-group">
            <Link href="/login" className="craly-nav__btn craly-nav__btn--ghost">
              {t.nav.login}
            </Link>
            <Link href="/signup?role=business" className="craly-nav__btn craly-nav__btn--primary">
              <span>Sign Up</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>

          {/* Mobile Hamburger Toggle */}
          <button
            className={`craly-nav__toggle ${menuOpen ? 'craly-nav__toggle--active' : ''}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
          >
            <span className="craly-nav__toggle-bar" />
            <span className="craly-nav__toggle-bar" />
            <span className="craly-nav__toggle-bar" />
          </button>
        </div>
      </div>

      {/* ── Mobile Drawer ── */}
      {menuOpen && (
        <div className="craly-nav__mobile-drawer">
          <div className="craly-nav__mobile-inner">
            
            {/* Language Switcher for Mobile */}
            <div className="craly-nav__mobile-lang">
              <span className="craly-nav__mobile-section-label">Language</span>
              <div className="craly-nav__mobile-lang-grid">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    className={`craly-nav__mobile-lang-pill ${language === l.code ? 'craly-nav__mobile-lang-pill--active' : ''}`}
                    onClick={() => {
                      setLanguage(l.code);
                    }}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Navigation Links */}
            <div className="craly-nav__mobile-links">
              {navLinks.map((link) => {
                if (link.isContact) {
                  return (
                    <button
                      key={link.label}
                      type="button"
                      className="craly-nav__mobile-link"
                      style={{ background: 'none', border: 'none', textAlign: 'left', width: '100%', cursor: 'pointer' }}
                      onClick={() => {
                        closeAll();
                        setIsContactOpen(true);
                      }}
                    >
                      {link.label}
                    </button>
                  );
                }
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="craly-nav__mobile-link"
                    onClick={closeAll}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {/* Mobile Auth CTAs */}
            <div className="craly-nav__mobile-auth">
              <Link
                href="/login"
                className="craly-nav__btn craly-nav__btn--ghost craly-nav__btn--full"
                onClick={closeAll}
              >
                {t.nav.login}
              </Link>
              <Link
                href="/signup?role=business"
                className="craly-nav__btn craly-nav__btn--primary craly-nav__btn--full"
                onClick={closeAll}
              >
                <span>Sign Up</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>

          </div>
        </div>
      )}
    </header>

    <ContactModal open={isContactOpen} onClose={() => setIsContactOpen(false)} />
  </>
  );
}
