'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './login.css';
import { login } from '@/lib/api/auth';
import { getMyProfile } from '@/lib/api/profile';
import { useAuth } from '@/lib/auth/useAuth';
import { useLanguage } from '@/lib/i18n/LanguageContext';

const helmetLogo = '/assets/helmet.png';

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const { data: user } = await login({ email, password });
      await refresh();

      try {
        const { data: profile } = await getMyProfile();
        router.push(
          profile.onboarding_complete
            ? user.role === 'business'
              ? '/business/dashboard'
              : '/contractor/dashboard'
            : '/onboarding',
        );
      } catch {
        router.push('/onboarding');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.contact.genericError);
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-page__wrap">

        {/* ── Left: dark brand panel ────────────────────────────────── */}
        <div className="login-panel">
          <div>
            <div className="login-panel__brand">
              <img src={helmetLogo} alt="" />
              <span>Craly</span>
            </div>

            <p className="login-panel__eyebrow">{t.auth.networkEyebrow}</p>
            <h2 className="login-panel__heading">{t.auth.loginHeading}</h2>

            <div className="login-panel__roles">
              <div className="login-panel__role-card">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 18a7 7 0 0 1 14 0" />
                  <path d="M9 18v-2" />
                  <path d="M12 6v2" />
                  <rect x="2" y="17" width="20" height="3" rx="1" />
                </svg>
                <h4>{t.auth.contractorRoleTitle}</h4>
                <p>{t.auth.contractorRoleDesc}</p>
              </div>
              <div className="login-panel__role-card">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="3" width="16" height="18" rx="1" />
                  <path d="M9 8h1M14 8h1M9 12h1M14 12h1" />
                  <path d="M10 21v-4h4v4" />
                </svg>
                <h4>{t.auth.businessRoleTitle}</h4>
                <p>{t.auth.businessRoleDesc}</p>
              </div>
            </div>
          </div>

          <div className="login-panel__security">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            {t.auth.securityBadge}
          </div>
        </div>

        {/* ── Right: white form panel ───────────────────────────────── */}
        <div className="login-form-panel">
          <p className="login-form-panel__eyebrow">{t.auth.welcomeBackEyebrow}</p>
          <h1 className="login-form-panel__heading">{t.auth.logInTitle}</h1>

          <form className="login-fields" onSubmit={handleSubmit}>
            <label className="login-field">
              <span>{t.auth.emailLabel}</span>
              <div className="login-field__input">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M3 7l9 6 9-6" />
                </svg>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.auth.emailPlaceholder}
                />
              </div>
            </label>

            <label className="login-field">
              <span>{t.auth.passwordLabel}</span>
              <div className="login-field__input">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="11" width="14" height="9" rx="2" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.auth.passwordPlaceholder}
                />
              </div>
            </label>

            <a href="mailto:hello@craly.com?subject=Forgot%20password" className="login-forgot">
              {t.auth.forgotPassword}
            </a>

            {error && <p className="login-error">{error}</p>}

            <button type="submit" className="login-submit" disabled={submitting}>
              {submitting ? t.auth.loggingIn : t.auth.logInBtn}
            </button>
          </form>

          <div className="login-new">
            <p>{t.auth.newToCraly}</p>
            <div className="login-new__grid">
              <Link href="/signup" className="login-new__chip">
                {t.auth.joinAsContractor}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="M13 6l6 6-6 6" />
                </svg>
              </Link>
              <Link href="/signup" className="login-new__chip">
                {t.auth.joinAsBusiness}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
