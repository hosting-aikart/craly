'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './signup.css';
import { signup } from '@/lib/api/auth';
import { useAuth } from '@/lib/auth/useAuth';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import LoadingState from '@/components/ui/LoadingState';

const helmetLogo = '/assets/helmet.png';

export default function SignupPage() {
  const router = useRouter();
  const { user, loading: authLoading, refresh } = useAuth();
  const { t } = useLanguage();
  // Contractors no longer self-register — Craly's internal team lists them
  // directly (see docs/open-decisions.md). Business is the only public role.
  const role = 'business' as const;
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      if (user.role === 'admin') {
        router.replace('/admin/dashboard');
      } else if (user.role === 'business') {
        router.replace('/business/dashboard');
      } else {
        router.replace('/contractor/dashboard');
      }
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await signup({ email, password, role, companyName });
      await refresh();
      router.push('/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : t.contact.genericError);
      setSubmitting(false);
    }
  };

  if (authLoading || user) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingState label="Redirecting to workspace…" />
      </div>
    );
  }

  return (
    <div className="signup-page">
      <div className="signup-page__wrap">

        {/* ── Left: dark brand panel (same as /login) ──────────────── */}
        <div className="signup-panel">
          <div>
            <div className="signup-panel__brand">
              <img src={helmetLogo} alt="" />
              <span>Craly</span>
            </div>

            <p className="signup-panel__eyebrow">{t.auth.createAccountEyebrow}</p>
            <h2 className="signup-panel__heading">{t.auth.signupHeading}</h2>

            <div className="signup-panel__roles">
              <div className="signup-panel__role-card">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="3" width="16" height="18" rx="1" />
                  <path d="M9 8h1M14 8h1M9 12h1M14 12h1" />
                  <path d="M10 21v-4h4v4" />
                </svg>
                <h4>{t.auth.businessRoleTitle}</h4>
                <p>{t.auth.businessRoleDesc}</p>
              </div>
              <div className="signup-panel__role-card">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 18a7 7 0 0 1 14 0" />
                  <path d="M9 18v-2" />
                  <path d="M12 6v2" />
                  <rect x="2" y="17" width="20" height="3" rx="1" />
                </svg>
                <h4>{t.auth.contractorRoleTitle}</h4>
                <p>Craly's team lists contractors directly — <Link href="/#contact" style={{ color: 'inherit', textDecoration: 'underline' }}>get in touch</Link> to be added.</p>
              </div>
            </div>
          </div>

          <div className="signup-panel__security">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            {t.auth.securityBadge}
          </div>
        </div>

        {/* ── Right: white form panel ───────────────────────────────── */}
        <div className="signup-form-panel">
          <div className="signup-mobile-brand">
            <img src={helmetLogo} alt="Craly" />
            <span>Craly</span>
          </div>
          <p className="signup-form-panel__eyebrow">{t.auth.createAccountEyebrow}</p>
          <h1 className="signup-form-panel__heading">{t.auth.joinTitle}</h1>

          <form className="signup-fields" onSubmit={handleSubmit}>
            <label className="signup-field">
              <span>{t.auth.companyNameLabel}</span>
              <div className="signup-field__input">
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={t.auth.companyNamePlaceholder}
                />
              </div>
            </label>

            <label className="signup-field">
              <span>{t.auth.emailLabel}</span>
              <div className="signup-field__input">
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

            <label className="signup-field">
              <span>{t.auth.passwordLabel}</span>
              <div className="signup-field__input">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="11" width="14" height="9" rx="2" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.auth.passwordPlaceholder}
                />
              </div>
            </label>

            {error && <p className="signup-error">{error}</p>}

            <button type="submit" className="signup-submit" disabled={submitting}>
              {submitting ? t.auth.creatingAccount : t.auth.createAccountBtn}
            </button>
          </form>

          <p className="signup-footer-link">
            {t.auth.alreadyHaveAccount} <Link href="/login">{t.auth.logInTitle}</Link>
          </p>
        </div>

      </div>
    </div>
  );
}
