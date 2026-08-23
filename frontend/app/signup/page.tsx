'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './signup.css';
import { signup, sendSignupOtp, verifySignupOtp } from '@/lib/api/auth';
import { useAuth } from '@/lib/auth/useAuth';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import LoadingState from '@/components/ui/LoadingState';
import OtpVerificationModal from '@/components/auth/OtpVerificationModal';

const helmetLogo = '/assets/helmet.png';

export default function SignupPage() {
  const router = useRouter();
  const { user, loading: authLoading, refresh } = useAuth();
  const { t } = useLanguage();

  const [role, setRole] = useState<'business' | 'contractor'>('contractor');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [consent, setConsent] = useState(true);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // OTP Modal State
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const PHONE_RE = /^\+?[0-9]{7,15}$/;

  const validateEmail = (value: string) => {
    if (!value) { setEmailError(''); return; }
    setEmailError(EMAIL_RE.test(value) ? '' : 'Please enter a valid email address');
  };

  const validateMobile = (value: string) => {
    if (!value) { setMobileError('Phone number is required'); return; }
    const cleaned = value.replace(/[\s\-().]/g, '');
    setMobileError(PHONE_RE.test(cleaned) ? '' : 'Please enter a valid phone number (7-15 digits with optional country code)');
  };

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      if (user.role === 'admin') {
        router.replace('/admin/dashboard');
      } else if (user.role === 'business') {
        router.replace('/business/dashboard');
      } else if (user.role === 'contractor') {
        router.replace('/contractor-portal/dashboard');
      } else {
        router.replace('/contractor/dashboard');
      }
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!consent) {
      setError('You must agree to the Terms of Service & Privacy Policy.');
      return;
    }

    // Run validations before requesting OTP
    let hasError = false;
    if (!EMAIL_RE.test(email)) {
      setEmailError('Please enter a valid email address');
      hasError = true;
    }
    if (mobile) {
      const cleaned = mobile.replace(/[\s\-().]/g, '');
      if (!PHONE_RE.test(cleaned)) {
        setMobileError('Please enter a valid phone number (7-15 digits with optional country code)');
        hasError = true;
      }
    } else {
      setMobileError('Phone number is required');
      hasError = true;
    }
    if (hasError) return;

    setSubmitting(true);
    setError('');
    setOtpError('');

    try {
      // Step 1: Send OTP to email and phone
      await sendSignupOtp({ email, mobile, name: companyName });
      setIsOtpModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.contact.genericError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyAndSubmit = async (emailOtp: string, phoneOtp: string) => {
    setOtpLoading(true);
    setOtpError('');

    try {
      // Step 2: Verify codes
      await verifySignupOtp({ email, mobile, emailOtp, phoneOtp });

      // Step 3: Complete registration
      await signup({ email, password, role, companyName, mobile, city: city || undefined });
      await refresh();

      setIsOtpModalOpen(false);
      if (role === 'contractor') {
        router.push('/contractor-portal/dashboard');
      } else {
        router.push('/onboarding');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Verification failed. Please try again.';
      setOtpError(msg);
      throw err;
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    await sendSignupOtp({ email, mobile, name: companyName });
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

        {/* ── Left: dark brand panel ────────────────────────────────── */}
        <div className="signup-panel">
          <div>
            <div className="signup-panel__brand">
              <img src={helmetLogo} alt="" />
              <span>Craly</span>
            </div>

            <p className="signup-panel__eyebrow">{t.auth.createAccountEyebrow}</p>
            <h2 className="signup-panel__heading">{t.auth.signupHeading}</h2>

            <div className="signup-panel__roles">
              <div
                className={`signup-panel__role-card ${role === 'contractor' ? 'signup-panel__role-card--active' : ''}`}
                onClick={() => setRole('contractor')}
                style={{ cursor: 'pointer' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 18a7 7 0 0 1 14 0" />
                  <path d="M9 18v-2" />
                  <path d="M12 6v2" />
                  <rect x="2" y="17" width="20" height="3" rx="1" />
                </svg>
                <h4>{t.auth.contractorRoleTitle}</h4>
                <p>{t.auth.contractorRoleDesc}</p>
              </div>

              <div
                className={`signup-panel__role-card ${role === 'business' ? 'signup-panel__role-card--active' : ''}`}
                onClick={() => setRole('business')}
                style={{ cursor: 'pointer' }}
              >
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
          <h1 className="signup-form-panel__heading">
            {role === 'contractor' ? 'Join as Contractor' : t.auth.joinTitle}
          </h1>

          {/* Role selector buttons for mobile / quick toggle */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              type="button"
              onClick={() => setRole('contractor')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                background: role === 'contractor' ? '#1e293b' : '#fff',
                color: role === 'contractor' ? '#fff' : '#334155',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Contractor
            </button>
            <button
              type="button"
              onClick={() => setRole('business')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                background: role === 'business' ? '#1e293b' : '#fff',
                color: role === 'business' ? '#fff' : '#334155',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Manufacturer
            </button>
          </div>

          <form className="signup-fields" onSubmit={handleSubmit}>
            <label className="signup-field">
              <span>{role === 'contractor' ? 'Company / Contractor Name' : t.auth.companyNameLabel}</span>
              <div className="signup-field__input">
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={role === 'contractor' ? 'e.g. Apex Manpower Services' : t.auth.companyNamePlaceholder}
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
                  onChange={(e) => { setEmail(e.target.value); if (emailError) validateEmail(e.target.value); }}
                  onBlur={(e) => validateEmail(e.target.value)}
                  placeholder={t.auth.emailPlaceholder}
                />
              </div>
              {emailError && <span className="signup-field-error">{emailError}</span>}
            </label>

            <label className="signup-field">
              <span>Phone / Mobile Number</span>
              <div className="signup-field__input">
                <input
                  type="tel"
                  required
                  value={mobile}
                  onChange={(e) => { setMobile(e.target.value); if (mobileError) validateMobile(e.target.value); }}
                  onBlur={(e) => validateMobile(e.target.value)}
                  placeholder="e.g. +1 555 123 4567 or +44 20 7123 4567"
                />
              </div>
              {mobileError && <span className="signup-field-error">{mobileError}</span>}
            </label>

            <label className="signup-field">
              <span>City / Base Location</span>
              <div className="signup-field__input">
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. London, New York, Tokyo, Mumbai"
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
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.auth.passwordPlaceholder}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b' }}>
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>I agree to Craly's Terms of Service & Privacy Policy</span>
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

      <OtpVerificationModal
        isOpen={isOtpModalOpen}
        email={email}
        mobile={mobile}
        onClose={() => setIsOtpModalOpen(false)}
        onVerifyAndSubmit={handleVerifyAndSubmit}
        onResendOtp={handleResendOtp}
        loading={otpLoading}
        error={otpError}
      />
    </div>
  );
}
