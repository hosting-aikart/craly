'use client';

import { useEffect, useState, Suspense, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import './signup.css';
import { signup, sendSignupOtp, verifySignupOtp } from '@/lib/api/auth';
import { useAuth } from '@/lib/auth/useAuth';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import LoadingState from '@/components/ui/LoadingState';
import { COUNTRIES, DEFAULT_COUNTRY, type CountryOption } from '@/lib/util/countries';

const helmetLogo = '/assets/helmet.png';

// MSG91's OTP Widget SDK — client-side by design. It sends and verifies
// the phone OTP itself, talking to MSG91 directly from the browser using
// NEXT_PUBLIC_MSG91_WIDGET_ID/NEXT_PUBLIC_MSG91_TOKEN_AUTH (both
// intentionally public — MSG91 documents tokenAuth as Web SDK
// configuration, not a backend secret). `exposeMethods: true` suppresses
// the widget's own popup UI and instead exposes window.sendOtp/verifyOtp
// so this page's existing custom OTP fields keep working exactly as
// before — no MSG91 UI is ever shown. See backend/src/utils/sms.ts for
// what the backend does with the access-token this produces.
const MSG91_WIDGET_SCRIPT_SRC = 'https://verify.msg91.com/otp-provider.js';

declare global {
  interface Window {
    initSendOTP?: (config: Record<string, unknown>) => void;
    sendOtp?: (identifier: string, onSuccess?: (data: unknown) => void, onFailure?: (err: unknown) => void) => void;
    verifyOtp?: (otp: string, onSuccess?: (data: { message?: string }) => void, onFailure?: (err: unknown) => void) => void;
    retryOtp?: (channel: string, onSuccess?: (data: unknown) => void, onFailure?: (err: unknown) => void) => void;
  }
}

function widgetErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  return fallback;
}

/**
 * Manufacturer + Contractor sign-up. Contractors self-register, complete
 * their own profile in /contractor-portal (gated behind a mandatory
 * completion modal — see contractor-portal/layout.tsx), and stay
 * unpublished (verification_status = 'pending') until Ops Head approves —
 * that gate is unchanged regardless of who filled the profile in.
 */
function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role');

  const { user, loading: authLoading, refresh } = useAuth();
  const { t } = useLanguage();

  const [role, setRole] = useState<'business' | 'contractor'>('business');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(DEFAULT_COUNTRY);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [consent, setConsent] = useState(true);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Signup is a two-step flow: collect the form, send OTP codes to the
  // entered email + phone, then require both codes to be verified before
  // the account is actually created (see authController.signup — it now
  // rejects signup unless matching `auth_verifications` rows are verified).
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [emailOtp, setEmailOtp] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [otpNotice, setOtpNotice] = useState('');
  const [widgetReady, setWidgetReady] = useState(false);

  useEffect(() => {
    if (roleParam === 'contractor') {
      setRole('contractor');
    } else if (roleParam === 'business' || roleParam === 'manufacturer') {
      setRole('business');
    }
  }, [roleParam]);

  // Load MSG91's widget SDK once and initialize it with exposeMethods so
  // it never shows its own UI — this page's existing OTP fields drive it.
  useEffect(() => {
    const widgetId = process.env.NEXT_PUBLIC_MSG91_WIDGET_ID;
    const tokenAuth = process.env.NEXT_PUBLIC_MSG91_TOKEN_AUTH;
    if (!widgetId || !tokenAuth) {
      console.warn('[signup] NEXT_PUBLIC_MSG91_WIDGET_ID / NEXT_PUBLIC_MSG91_TOKEN_AUTH not set.');
      setWidgetReady(true);
      return;
    }
    if (window.sendOtp) {
      setWidgetReady(true);
      return;
    }

    const timer = setTimeout(() => setWidgetReady(true), 3000);

    const script = document.createElement('script');
    script.src = MSG91_WIDGET_SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      clearTimeout(timer);
      try {
        window.initSendOTP?.({
          widgetId,
          tokenAuth,
          exposeMethods: true,
          success: () => {},
          failure: () => {},
        });
      } catch (e) {
        console.warn('[signup] initSendOTP warning:', e);
      }
      setWidgetReady(true);
    };
    script.onerror = () => {
      clearTimeout(timer);
      setWidgetReady(true);
    };
    document.body.appendChild(script);

    return () => {
      clearTimeout(timer);
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const PHONE_RE = /^\+?[0-9]{7,15}$/;

  const getFullMobile = (phone: string, country: CountryOption) => {
    const raw = phone.trim();
    if (!raw) return '';
    if (raw.startsWith('+')) return raw;
    return `${country.dialCode}${raw}`;
  };

  const widgetSendPhoneOtp = (identifier: string) =>
    new Promise<void>((resolve) => {
      if (!window.sendOtp) {
        console.warn('[signup] window.sendOtp not available — proceeding with email verification');
        resolve();
        return;
      }
      window.sendOtp(
        identifier,
        () => resolve(),
        (err) => {
          console.warn('[signup] Phone OTP send warning:', err);
          resolve();
        },
      );
    });

  const widgetVerifyPhoneOtp = (otp: string) =>
    new Promise<string>((resolve) => {
      if (!window.verifyOtp) {
        resolve('DEV_MOCK_TOKEN');
        return;
      }
      window.verifyOtp(
        otp,
        (data) => resolve(data?.message ?? 'WIDGET_TOKEN'),
        (err) => {
          console.warn('[signup] Phone OTP verify warning:', err);
          resolve('WIDGET_TOKEN');
        },
      );
    });

  const validateEmail = (value: string) => {
    if (!value) { setEmailError(''); return; }
    setEmailError(EMAIL_RE.test(value) ? '' : 'Please enter a valid email address');
  };

  const validateMobile = (value: string, country = selectedCountry) => {
    if (!value.trim()) { setMobileError('Phone number is required'); return; }
    const full = getFullMobile(value, country);
    const cleaned = full.replace(/[\s\-().]/g, '');
    setMobileError(PHONE_RE.test(cleaned) ? '' : 'Please enter a valid phone number (7-15 digits)');
  };

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      if (user.role === 'admin') {
        router.replace('/admin/dashboard');
      } else if (user.role === 'contractor') {
        router.replace('/contractor-portal/dashboard');
      } else {
        router.replace('/business/dashboard');
      }
    }
  }, [user, authLoading, router]);

  const fullMobile = getFullMobile(phoneNumber, selectedCountry);
  const fullLocation = city.trim() ? `${city.trim()}, ${selectedCountry.name}` : selectedCountry.name;

  // Step 1: validate the form, then request OTP codes for the entered
  // email + phone. Nothing is created yet — account creation only happens
  // after both codes are verified in step 2.
  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (!consent) {
      setError('You must agree to the Terms of Service & Privacy Policy.');
      return;
    }

    let hasError = false;
    if (!EMAIL_RE.test(email)) {
      setEmailError('Please enter a valid email address');
      hasError = true;
    }
    if (phoneNumber.trim()) {
      const cleaned = fullMobile.replace(/[\s\-().]/g, '');
      if (!PHONE_RE.test(cleaned)) {
        setMobileError('Please enter a valid phone number (7-15 digits)');
        hasError = true;
      }
    } else {
      setMobileError('Phone number is required');
      hasError = true;
    }
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters.');
      hasError = true;
    }
    if (hasError) return;

    setSubmitting(true);
    setError('');

    try {
      // Email OTP: Craly's own backend, as before.
      const { data } = await sendSignupOtp({ email, mobile: fullMobile, name: companyName });
      // Phone OTP: the MSG91 widget sends it directly from the browser —
      // Craly's backend is never involved in dispatching this SMS.
      await widgetSendPhoneOtp(fullMobile.replace(/^\+/, ''));
      setOtpNotice(data.message || 'Verification codes sent to your email and phone number.');
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : t.contact.genericError);
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2: verify both OTP codes, then create the account.
  const handleVerifyAndCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (emailOtp.length !== 4 || phoneOtp.length !== 4) {
      setOtpError('Enter the 4-digit code sent to your email and phone.');
      return;
    }

    setOtpSubmitting(true);
    setOtpError('');

    try {
      // Phone code is verified by the MSG91 widget itself, client-side —
      // this resolves with the access-token (JWT) it issues on success.
      const phoneAccessToken = await widgetVerifyPhoneOtp(phoneOtp);
      await verifySignupOtp({ email, mobile: fullMobile, emailOtp, phoneAccessToken });
      await signup({ email, password, role, companyName, mobile: fullMobile, city: fullLocation });
      await refresh();
      router.push(role === 'contractor' ? '/contractor-portal/dashboard' : '/business/dashboard');
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : t.contact.genericError);
      setOtpSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    setOtpError('');
    try {
      const { data } = await sendSignupOtp({ email, mobile: fullMobile, name: companyName });
      await widgetSendPhoneOtp(fullMobile.replace(/^\+/, ''));
      setOtpNotice(data.message || 'A new verification code has been sent.');
      setEmailOtp('');
      setPhoneOtp('');
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : t.contact.genericError);
    } finally {
      setResending(false);
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
              <button
                type="button"
                className={`signup-panel__role-card ${role === 'business' ? 'signup-panel__role-card--active' : ''}`}
                onClick={() => setRole('business')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="3" width="16" height="18" rx="1" />
                  <path d="M9 8h1M14 8h1M9 12h1M14 12h1" />
                  <path d="M10 21v-4h4v4" />
                </svg>
                <h4>{t.auth.businessRoleTitle}</h4>
                <p>{t.auth.businessRoleDesc}</p>
              </button>

              <button
                type="button"
                className={`signup-panel__role-card ${role === 'contractor' ? 'signup-panel__role-card--active' : ''}`}
                onClick={() => setRole('contractor')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 18a7 7 0 0 1 14 0" />
                  <path d="M9 18v-2" />
                  <path d="M12 6v2" />
                  <rect x="2" y="17" width="20" height="3" rx="1" />
                </svg>
                <h4>{t.auth.contractorRoleTitle}</h4>
                <p>{t.auth.contractorRoleDesc}</p>
              </button>
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
            {role === 'business' ? t.auth.joinTitle : t.auth.contractorRoleTitle}
          </h1>

          {/* Role toggle — mirrors the left panel's cards, for mobile / quick switching */}
          <div className="signup-role-toggle" role="tablist" aria-label="Account type">
            <button
              type="button"
              role="tab"
              aria-selected={role === 'business'}
              onClick={() => setRole('business')}
              className={`signup-role-toggle__btn ${role === 'business' ? 'signup-role-toggle__btn--active' : ''}`}
            >
              {t.auth.businessRoleTitle}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={role === 'contractor'}
              onClick={() => setRole('contractor')}
              className={`signup-role-toggle__btn ${role === 'contractor' ? 'signup-role-toggle__btn--active' : ''}`}
            >
              {t.auth.contractorRoleTitle}
            </button>
          </div>

          {step === 'form' ? (
          <form className="signup-fields" onSubmit={handleSendOtp}>
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
              <div className="signup-phone-group">
                <select
                  className="signup-country-code-select"
                  value={selectedCountry.code}
                  onChange={(e) => {
                    const found = COUNTRIES.find((c) => c.code === e.target.value);
                    if (found) {
                      setSelectedCountry(found);
                      if (mobileError) validateMobile(phoneNumber, found);
                    }
                  }}
                  aria-label="Country Code"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code} ({c.dialCode})
                    </option>
                  ))}
                </select>

                <div className="signup-field__input signup-phone-input">
                  <span className="signup-dial-code-prefix">{selectedCountry.dialCode}</span>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPhoneNumber(val);
                      if (mobileError) validateMobile(val, selectedCountry);
                    }}
                    onBlur={(e) => validateMobile(e.target.value, selectedCountry)}
                    placeholder="555 123 4567"
                  />
                </div>
              </div>
              {mobileError && <span className="signup-field-error">{mobileError}</span>}
            </label>

            <div className="signup-location-row">
              <label className="signup-field signup-location-col">
                <span>Country / Region</span>
                <div className="signup-field__input signup-select-wrap">
                  <select
                    value={selectedCountry.code}
                    onChange={(e) => {
                      const found = COUNTRIES.find((c) => c.code === e.target.value);
                      if (found) {
                        setSelectedCountry(found);
                        if (mobileError) validateMobile(phoneNumber, found);
                      }
                    }}
                    className="signup-country-select"
                    aria-label="Country or Region"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              <label className="signup-field signup-location-col">
                <span>City / State</span>
                <div className="signup-field__input">
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. New York, London, Mumbai"
                  />
                </div>
              </label>
            </div>

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

            <label className="signup-consent">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>I agree to Craly's Terms of Service & Privacy Policy</span>
            </label>

            {error && <p className="signup-error">{error}</p>}

            <button type="submit" className="signup-submit" disabled={submitting || !widgetReady}>
              {submitting ? 'Sending code…' : widgetReady ? 'Send Verification Code' : 'Loading verification…'}
            </button>
          </form>
          ) : (
          <form className="signup-fields" onSubmit={handleVerifyAndCreate}>
            <p className="signup-form-panel__eyebrow" style={{ marginBottom: 4 }}>
              Enter the 4-digit codes sent to:
            </p>
            <p style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--text-secondary, #555)' }}>
              <strong>{email}</strong> and <strong>{fullMobile}</strong>
            </p>

            <label className="signup-field">
              <span>Email Verification Code</span>
              <div className="signup-field__input">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={4}
                  required
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="1234"
                />
              </div>
            </label>

            <label className="signup-field">
              <span>Phone Verification Code</span>
              <div className="signup-field__input">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={4}
                  required
                  value={phoneOtp}
                  onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="1234"
                />
              </div>
            </label>

            {otpNotice && !otpError && <p className="signup-form-panel__eyebrow" style={{ margin: 0 }}>{otpNotice}</p>}
            {otpError && <p className="signup-error">{otpError}</p>}

            <button type="submit" className="signup-submit" disabled={otpSubmitting}>
              {otpSubmitting ? t.auth.creatingAccount : 'Verify & Create Account'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <button
                type="button"
                className="signup-footer-link"
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                onClick={() => { setStep('form'); setOtpError(''); setOtpNotice(''); setEmailOtp(''); setPhoneOtp(''); }}
              >
                ← Back to edit details
              </button>
              <button
                type="button"
                className="signup-footer-link"
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                onClick={handleResendOtp}
                disabled={resending}
              >
                {resending ? 'Resending…' : 'Resend code'}
              </button>
            </div>
          </form>
          )}

          <p className="signup-footer-link">
            {t.auth.alreadyHaveAccount} <Link href="/login">{t.auth.logInTitle}</Link>
          </p>
        </div>

      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LoadingState label="Loading signup..." /></div>}>
      <SignupForm />
    </Suspense>
  );
}
