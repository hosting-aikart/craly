'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { LANGUAGES } from '@/lib/i18n/translations';
import { useAuth } from '@/lib/auth/useAuth';
import NotificationBell from '@/components/NotificationBell';
import './Navbar.css';

const helmetLogo = '/assets/helmet.png';

export default function Navbar() {
  const { language, setLanguage, t } = useLanguage();
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: t.nav.home },
    { href: '/contractors', label: t.nav.contractors },
    { href: '/#why', label: t.nav.whyCraly },
    { href: '/#how', label: t.nav.howItWorks },
    { href: '/#faq', label: t.nav.faq },
  ];

  const dashboardHref = user?.role === 'business' ? '/business/dashboard' : '/contractor/dashboard';

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    router.push('/');
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link href="/" className="navbar__brand" onClick={closeMenu}>
          <img src={helmetLogo} alt="" className="navbar__logo" />
          <span>Craly</span>
        </Link>

        <nav className="navbar__links">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={!link.href.includes('#') && pathname === link.href ? 'navbar__links-item--active' : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="navbar__right">
          <div className="navbar__lang navbar__lang--desktop" role="group" aria-label="Choose language">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                className={`navbar__lang-btn ${language === l.code ? 'navbar__lang-btn--active' : ''}`}
                onClick={() => setLanguage(l.code)}
                aria-pressed={language === l.code}
              >
                {l.label}
              </button>
            ))}
          </div>

          {!loading && user ? (
            <div className="navbar__auth">
              <NotificationBell />
              <Link href={dashboardHref} className="navbar__btn navbar__btn--ghost">
                {t.nav.dashboard}
              </Link>
              <button className="navbar__btn navbar__btn--ghost" onClick={handleLogout}>
                {t.nav.logout}
              </button>
            </div>
          ) : (
            <div className="navbar__auth">
              <Link href="/login" className="navbar__btn navbar__btn--ghost">
                {t.nav.login}
              </Link>
              <Link href="/signup" className="navbar__btn navbar__btn--solid">
                {t.nav.getStarted}
              </Link>
            </div>
          )}

          <button
            className={`navbar__menu-toggle ${menuOpen ? 'navbar__menu-toggle--open' : ''}`}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="navbar__mobile">
          <div className="navbar__mobile-lang" role="group" aria-label="Choose language">
            <span className="navbar__mobile-lang-title">Language / भाषा / भाषा</span>
            <div className="navbar__mobile-lang-btns">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  className={`navbar__mobile-lang-btn ${language === l.code ? 'navbar__mobile-lang-btn--active' : ''}`}
                  onClick={() => setLanguage(l.code)}
                  aria-pressed={language === l.code}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <nav className="navbar__mobile-links">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={closeMenu}>
                {link.label}
              </Link>
            ))}
          </nav>

          {!loading && user ? (
            <div className="navbar__mobile-auth">
              <NotificationBell />
              <Link href={dashboardHref} className="navbar__btn navbar__btn--ghost" onClick={closeMenu}>
                {t.nav.dashboard}
              </Link>
              <button className="navbar__btn navbar__btn--ghost" onClick={handleLogout}>
                {t.nav.logout}
              </button>
            </div>
          ) : (
            <div className="navbar__mobile-auth">
              <Link href="/login" className="navbar__btn navbar__btn--ghost" onClick={closeMenu}>
                {t.nav.login}
              </Link>
              <Link href="/signup" className="navbar__btn navbar__btn--solid" onClick={closeMenu}>
                {t.nav.getStarted}
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
