'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { LANGUAGES } from '@/lib/i18n/translations';
import { useAuth } from '@/lib/auth/useAuth';
import './Navbar.css';

const helmetLogo = '/assets/helmet.png';

export default function Navbar() {
  const { language, setLanguage } = useLanguage();
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const dashboardHref = user?.role === 'business' ? '/business/dashboard' : '/contractor/dashboard';

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link href="/" className="navbar__brand">
          <img src={helmetLogo} alt="" className="navbar__logo" />
          <span>Craly</span>
        </Link>

        <nav className="navbar__links">
          <Link href="/">Home</Link>
          <Link href="/contractors">Contractors</Link>
          <Link href="/#why">Why Craly</Link>
          <Link href="/#how">How It Works</Link>
          <Link href="/#faq">FAQ</Link>
        </nav>

        <div className="navbar__right">
          <div className="navbar__lang" role="group" aria-label="Choose language">
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
              <Link href={dashboardHref} className="navbar__btn navbar__btn--ghost">
                Dashboard
              </Link>
              <button className="navbar__btn navbar__btn--ghost" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : (
            <div className="navbar__auth">
              <Link href="/login" className="navbar__btn navbar__btn--ghost">
                Login
              </Link>
              <Link href="/signup" className="navbar__btn navbar__btn--solid">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
