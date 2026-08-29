'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { LANGUAGES } from '@/lib/i18n/translations';
import { useAuth } from '@/lib/auth/useAuth';
import ContactModal from './ContactModal';

export default function Navbar() {
  const { language, setLanguage, t } = useLanguage();
  const { user } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  // ── Dark/light theme detection (same as Aikart) ──────────────────────────
  useEffect(() => {
    function checkTheme() {
      const navIn = document.querySelector('.cnav-in');
      if (!navIn) return;
      const navRect = navIn.getBoundingClientRect();
      const checkX = navRect.left + navRect.width / 2;
      const checkY = navRect.top + navRect.height / 2;

      // ── Pass 1: explicit data-navbar-theme annotations (vertical overlap) ──
      const annotated = document.querySelectorAll('[data-navbar-theme]');
      for (const el of Array.from(annotated)) {
        const r = el.getBoundingClientRect();
        if (r.top <= checkY && r.bottom >= checkY) {
          const attr = el.getAttribute('data-navbar-theme');
          setIsDarkTheme(attr === 'dark');
          return;
        }
      }

      // ── Pass 2: check elements under the navbar point ──
      const elements = document.elementsFromPoint(checkX, checkY);
      let dark = false;
      for (const el of elements) {
        if (el.closest('.cnav')) continue;

        const darkAttr = el.getAttribute('data-navbar-theme') || el.closest('[data-navbar-theme]')?.getAttribute('data-navbar-theme');
        if (darkAttr === 'dark') { dark = true; break; }
        if (darkAttr === 'light') { dark = false; break; }

        if (
          el.classList.contains('built-for') || el.closest('.built-for') ||
          el.classList.contains('footer') || el.closest('.footer') ||
          el.classList.contains('hero') || el.closest('.hero')
        ) {
          dark = true;
          break;
        }

        const bg = window.getComputedStyle(el).backgroundColor;
        if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
          const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (m) {
            const brightness = (parseInt(m[1]) * 299 + parseInt(m[2]) * 587 + parseInt(m[3]) * 114) / 1000;
            if (brightness < 128) dark = true;
            break;
          }
        }
      }
      setIsDarkTheme(dark);
    }
    checkTheme();
    window.addEventListener('scroll', checkTheme, { passive: true });
    window.addEventListener('resize', checkTheme, { passive: true });
    return () => {
      window.removeEventListener('scroll', checkTheme);
      window.removeEventListener('resize', checkTheme);
    };
  }, [pathname]);

  // ── Close language dropdown on outside click ─────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Close mobile drawer on outside click ─────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        menuRef.current && !menuRef.current.contains(target) &&
        hamburgerRef.current && !hamburgerRef.current.contains(target)
      ) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  // ── Close mobile menu on route change ────────────────────────────────────
  useEffect(() => {
    const id = requestAnimationFrame(() => setMenuOpen(false));
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  // Don't show marketing nav for authenticated workspace pages
  if (
    user ||
    pathname.startsWith('/business') ||
    pathname.startsWith('/contractor') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/staff')
  ) {
    return null;
  }

  const navLinks = [
    { href: '/#why', label: 'Why Craly' },
    { href: '/#faq', label: 'FAQ' },
    { href: '#contact', label: 'Contact Us', isContact: true },
  ];

  const closeAll = () => {
    setMenuOpen(false);
    setLangDropdownOpen(false);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CNAV_CSS }} />

      <header className="cnav">
        <div className={`cnav-in ${isDarkTheme ? 'cnav-dark' : ''}`}>

          {/* ── Logo ── */}
          <Link href="/" className="cnav-logo" aria-label="Craly home" onClick={closeAll}>
            {/* Single img — src swaps via React state; same element = zero size jump */}
            <img
              src={isDarkTheme ? '/assets/craly-logo-white.png' : '/assets/craly-logo.png'}
              alt="Craly"
              className="cnav-logo-img"
            />
          </Link>

          {/* ── Desktop Center Nav Links ── */}
          <nav className="cnav-links" aria-label="Main Navigation">
            {navLinks.map((link) => {
              if (link.isContact) {
                return (
                  <button
                    key="contact"
                    type="button"
                    className="cnav-link cnav-contact-btn"
                    onClick={() => { closeAll(); setIsContactOpen(true); }}
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
                  className={`cnav-link${isActive ? ' cnav-link-active' : ''}`}
                  onClick={closeAll}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* ── Right Controls ── */}
          <div className="cnav-right">

            {/* Language Selector */}
            <div className="cnav-lang-wrap" ref={langRef}>
              <button
                type="button"
                className={`cnav-lang-btn${langDropdownOpen ? ' cnav-lang-btn--open' : ''}`}
                onClick={() => setLangDropdownOpen((v) => !v)}
                aria-label="Select Language"
                aria-expanded={langDropdownOpen}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                <span>{LANGUAGES.find((l) => l.code === language)?.label ?? 'EN'}</span>
                <svg
                  width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className={`cnav-caret${langDropdownOpen ? ' cnav-caret--up' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {langDropdownOpen && (
                <div className="cnav-lang-dropdown">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      className={`cnav-lang-option${language === l.code ? ' cnav-lang-option--active' : ''}`}
                      onClick={() => { setLanguage(l.code); setLangDropdownOpen(false); }}
                    >
                      <span>{l.label}</span>
                      {language === l.code && (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Auth Buttons */}
            <div className="cnav-auth">
              <Link href="/login" className="cnav-login">{t.nav.login}</Link>
              <Link href="/signup?role=business" className="cnav-signup">Sign Up</Link>
            </div>

            {/* Hamburger */}
            <button
              ref={hamburgerRef}
              type="button"
              className={`cnav-hamburger${menuOpen ? ' cnav-hamburger--open' : ''}`}
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              aria-expanded={menuOpen}
            >
              <span className="cnav-hb-box">
                <span className="cnav-hb-line cnav-hb-line--1" />
                <span className="cnav-hb-line cnav-hb-line--2" />
                <span className="cnav-hb-line cnav-hb-line--3" />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Backdrop ── */}
      <div
        className={`cnav-backdrop${menuOpen ? ' cnav-backdrop--open' : ''}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden={!menuOpen}
      />

      {/* ── Mobile Side Drawer ── */}
      <div
        ref={menuRef}
        className={`cnav-drawer${menuOpen ? ' cnav-drawer--open' : ''}`}
        aria-hidden={!menuOpen}
      >
        <button
          type="button"
          onClick={() => setMenuOpen(false)}
          className="cnav-drawer-close"
          aria-label="Close menu"
        >
          ✕
        </button>

        <div className="cnav-drawer-body">
          {/* Nav links */}
          {navLinks.map((link) => {
            if (link.isContact) {
              return (
                <button
                  key="contact-mobile"
                  type="button"
                  className="cnav-drawer-link"
                  onClick={() => { closeAll(); setIsContactOpen(true); }}
                >
                  {link.label}
                </button>
              );
            }
            return (
              <Link
                key={link.href}
                href={link.href}
                className="cnav-drawer-link"
                onClick={closeAll}
              >
                {link.label}
              </Link>
            );
          })}

          <div className="cnav-drawer-divider" />

          {/* Language pills */}
          <p className="cnav-drawer-section-label">Language</p>
          <div className="cnav-drawer-lang-grid">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                className={`cnav-drawer-lang-pill${language === l.code ? ' cnav-drawer-lang-pill--active' : ''}`}
                onClick={() => setLanguage(l.code)}
              >
                {l.label}
              </button>
            ))}
          </div>

          <div className="cnav-drawer-divider" />

          {/* Auth */}
          <div className="cnav-drawer-auth">
            <Link href="/login" className="cnav-drawer-login" onClick={closeAll}>
              {t.nav.login}
            </Link>
            <Link href="/signup?role=business" className="cnav-drawer-signup" onClick={closeAll}>
              Sign Up
            </Link>
          </div>
        </div>
      </div>

      <ContactModal open={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </>
  );
}

/* ============================================================
   Inlined CSS — same pattern as Aikart GNAV_CSS
   ============================================================ */
const CNAV_CSS = `
/* ── Outer shell (positions the floating pill) ── */
.cnav {
  position: fixed;
  top: 16px;
  left: 0;
  right: 0;
  z-index: 1000;
  padding: 0 24px;
  font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
}
@media (max-width: 899px) { .cnav { padding: 0 16px; top: 12px; } }
@media (min-width: 1024px) { .cnav { padding: 0 50px; } }

/* ── Pill container ── */
.cnav-in {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 20px;
  height: 74px;
  max-width: 1340px;
  margin: 0 auto;
  padding: 0 32px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(32px) saturate(180%);
  -webkit-backdrop-filter: blur(32px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.28);
  box-shadow:
    0 4px 30px rgba(0, 0, 0, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.35);
  transition: background 0.4s ease, border-color 0.4s ease;
}
@media (max-width: 899px) {
  .cnav-in {
    display: flex;
    justify-content: space-between;
    height: 62px;
    padding: 0 18px;
    border-radius: 9999px;
  }
}
/* Dark hero — deeper tint so white content pops */
.cnav-in.cnav-dark {
  background: rgba(5, 10, 24, 0.42);
  border-color: rgba(255, 255, 255, 0.20);
}

/* ── Logo ── */
.cnav-logo {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  flex-shrink: 0;
  justify-self: start;
}
/* Single logo image — fixed size, src swaps in React */
.cnav-logo-img {
  height: 28px;
  width: auto;
  max-width: 100px;
  object-fit: contain;
  display: block;
  flex-shrink: 0;
}
@media (max-width: 899px) {
  .cnav-logo-img { height: 24px; max-width: 85px; }
}

/* ── Desktop center nav links ── */
.cnav-links {
  display: none;
  align-items: center;
  gap: 6px;
  justify-content: center;
  justify-self: center;
}
@media (min-width: 900px) { .cnav-links { display: flex; } }

.cnav-link {
  font-size: 15.5px;
  font-weight: 500;
  color: #0f172a;
  text-decoration: none;
  padding: 8px 18px;
  border-radius: 9999px;
  background: transparent;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.35s ease, background 0.25s ease, text-shadow 0.35s ease;
  font-family: inherit;
  text-shadow: none;
}
.cnav-link:hover { background: rgba(15, 23, 42, 0.07); color: #0d9488; }
.cnav-link-active { color: #0d9488 !important; font-weight: 600; }
.cnav-contact-btn { font-family: inherit; }

/* On dark sections — all nav text goes white */
.cnav-dark .cnav-link {
  color: #ffffff !important;
  text-shadow: 0 1px 4px rgba(0,0,0,0.5);
}
.cnav-dark .cnav-link:hover { background: rgba(255,255,255,0.15); color: #ffffff !important; }
.cnav-dark .cnav-link-active { color: #5eead4 !important; }

/* ── Right controls ── */
.cnav-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  justify-self: end;
}
@media (min-width: 900px) { .cnav-right { gap: 14px; } }

/* ── Language selector ── */
.cnav-lang-wrap { position: relative; }
.cnav-lang-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(15, 23, 42, 0.06);
  border: 1px solid rgba(15, 23, 42, 0.15);
  padding: 6px 14px;
  border-radius: 9999px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  color: #0f172a;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}
.cnav-lang-btn:hover { background: rgba(15, 23, 42, 0.12); }
.cnav-lang-btn--open { background: rgba(15, 23, 42, 0.12); }
.cnav-caret { transition: transform 0.2s ease; }
.cnav-caret--up { transform: rotate(180deg); }
/* Dark mode lang btn */
.cnav-dark .cnav-lang-btn {
  background: rgba(255,255,255,0.15);
  border-color: rgba(255,255,255,0.28);
  color: #ffffff;
}
.cnav-dark .cnav-lang-btn:hover { background: rgba(255,255,255,0.25); }
/* Hide lang on mobile */
@media (max-width: 899px) { .cnav-lang-wrap { display: none; } }

.cnav-lang-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  min-width: 148px;
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  border: 1px solid rgba(15,23,42,0.12);
  border-radius: 18px;
  padding: 6px;
  box-shadow: 0 16px 40px rgba(0,0,0,0.14);
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 1010;
  animation: cnavFadeIn 0.15s ease-out;
}
.cnav-dark .cnav-lang-dropdown {
  background: rgba(12, 18, 36, 0.88);
  border-color: rgba(255,255,255,0.18);
}
@keyframes cnavFadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.cnav-lang-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 14px;
  border-radius: 12px;
  background: none;
  border: none;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 500;
  color: #0f172a;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;
}
.cnav-lang-option:hover { background: rgba(15,23,42,0.07); }
.cnav-lang-option--active { background: rgba(13,148,136,0.12); color: #0d9488; font-weight: 600; }
.cnav-dark .cnav-lang-option { color: #e2e8f0; }
.cnav-dark .cnav-lang-option:hover { background: rgba(255,255,255,0.1); }
.cnav-dark .cnav-lang-option--active { background: rgba(13,148,136,0.3); color: #5eead4; }

/* ── Auth buttons ── */
.cnav-auth {
  display: none;
  align-items: center;
  gap: 8px;
}
@media (min-width: 640px) { .cnav-auth { display: flex; } }

.cnav-login {
  font-size: 15px;
  font-weight: 500;
  color: #0f172a;
  text-decoration: none;
  padding: 8px 8px;
  transition: color 0.35s ease, text-shadow 0.35s ease;
  white-space: nowrap;
  text-shadow: none;
}
.cnav-login:hover { color: #0d9488; }
.cnav-dark .cnav-login { color: #ffffff !important; text-shadow: 0 1px 3px rgba(0,0,0,0.45); }
.cnav-dark .cnav-login:hover { color: #5eead4 !important; }

.cnav-signup {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 11px 30px;
  background: #ffffff;
  color: #0d9488;
  font-weight: 700;
  font-size: 15px;
  font-family: inherit;
  border-radius: 9999px;
  text-decoration: none;
  white-space: nowrap;
  box-shadow: 0 4px 16px rgba(0,0,0,0.14);
  border: 1px solid rgba(255,255,255,0.95);
  transition: transform 0.2s ease, box-shadow 0.2s ease, color 0.2s ease;
}
.cnav-signup:hover {
  transform: translateY(-1.5px);
  box-shadow: 0 10px 28px rgba(0,0,0,0.20);
  color: #0b6c64;
}

/* ── Hamburger (mobile) ── */
.cnav-hamburger {
  display: none;
  background: transparent;
  border: none;
  padding: 6px;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  color: #111827;
  transition: color 0.3s ease;
}
@media (max-width: 899px) { .cnav-hamburger { display: flex; } }
.cnav-dark .cnav-hamburger { color: #ffffff; }

.cnav-hb-box {
  width: 22px;
  height: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
}
.cnav-hb-line {
  display: block;
  width: 100%;
  height: 2px;
  background-color: currentColor;
  border-radius: 2px;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease;
  transform-origin: center;
}
.cnav-hamburger--open .cnav-hb-line--1 { transform: translateY(7px) rotate(45deg); }
.cnav-hamburger--open .cnav-hb-line--2 { opacity: 0; transform: scaleX(0); }
.cnav-hamburger--open .cnav-hb-line--3 { transform: translateY(-7px) rotate(-45deg); }

/* ── Mobile backdrop ── */
.cnav-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.50);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: 9998;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.cnav-backdrop--open { opacity: 1; pointer-events: auto; }

/* ── Mobile side drawer ── */
.cnav-drawer {
  position: fixed;
  top: 0; right: 0; bottom: 0;
  width: 290px;
  max-width: 85vw;
  height: 100vh;
  height: 100dvh;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  background: rgba(10, 15, 30, 0.72);
  backdrop-filter: blur(36px) saturate(190%);
  -webkit-backdrop-filter: blur(36px) saturate(190%);
  border-left: 1px solid rgba(255,255,255,0.16);
  transform: translate3d(100%, 0, 0);
  visibility: hidden;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.4s;
  overflow-y: auto;
  pointer-events: none;
  will-change: transform;
}
.cnav-drawer--open {
  transform: translate3d(0, 0, 0);
  visibility: visible;
  box-shadow: -12px 0 36px rgba(0,0,0,0.45);
  pointer-events: auto;
}

.cnav-drawer-close {
  position: absolute;
  top: 18px; right: 18px;
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px;
  color: #ffffff;
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.20);
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.2s ease;
}
.cnav-drawer-close:hover { background: rgba(255,255,255,0.20); }

.cnav-drawer-body {
  margin-top: 68px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 16px 32px;
}
.cnav-drawer-link {
  display: block;
  padding: 13px 16px;
  font-size: 16px;
  font-weight: 500;
  color: #ffffff;
  text-decoration: none;
  border-radius: 12px;
  background: transparent;
  border: none;
  text-align: left;
  width: 100%;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.2s ease;
}
.cnav-drawer-link:hover { background: rgba(255,255,255,0.10); }

.cnav-drawer-divider {
  height: 1px;
  background: rgba(255,255,255,0.15);
  margin: 12px 0;
}
.cnav-drawer-section-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(255,255,255,0.50);
  margin: 0 0 10px 4px;
}
.cnav-drawer-lang-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 4px;
}
.cnav-drawer-lang-pill {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.18);
  background: rgba(255,255,255,0.08);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  color: #ffffff;
  cursor: pointer;
  text-align: center;
  transition: all 0.15s ease;
}
.cnav-drawer-lang-pill--active {
  background: rgba(13,148,136,0.35);
  border-color: #0d9488;
  font-weight: 600;
}
.cnav-drawer-auth {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.cnav-drawer-login {
  display: block;
  text-align: center;
  padding: 12px 16px;
  font-size: 15px;
  font-weight: 500;
  color: #ffffff;
  border: 1.5px solid rgba(255,255,255,0.30);
  border-radius: 9999px;
  text-decoration: none;
  transition: background 0.2s ease;
}
.cnav-drawer-login:hover { background: rgba(255,255,255,0.10); }
.cnav-drawer-signup {
  display: block;
  text-align: center;
  padding: 12px 16px;
  font-size: 15px;
  font-weight: 700;
  color: #0d9488;
  background: #ffffff;
  border-radius: 9999px;
  text-decoration: none;
  box-shadow: 0 4px 14px rgba(0,0,0,0.18);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.cnav-drawer-signup:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.22);
}

/* ── Mobile (≤768px): full-width bar style like Aikart ── */
@media (max-width: 768px) {
  .cnav { top: 0; padding: 0; }
  .cnav-in {
    border-radius: 0 !important;
    max-width: 100% !important;
    width: 100% !important;
    border-left: none !important;
    border-right: none !important;
    border-top: none !important;
    border-bottom: 1px solid rgba(255,255,255,0.18) !important;
    box-sizing: border-box !important;
    height: 58px !important;
    padding: 0 16px !important;
  }
}
`;
