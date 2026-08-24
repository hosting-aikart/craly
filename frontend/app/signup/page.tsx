'use client';

import { useEffect, useState, Suspense, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import './signup.css';
import { signup } from '@/lib/api/auth';
import { useAuth } from '@/lib/auth/useAuth';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import LoadingState from '@/components/ui/LoadingState';

const helmetLogo = '/assets/helmet.png';

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

  useEffect(() => {
    if (roleParam === 'contractor') {
      setRole('contractor');
    } else if (roleParam === 'business' || roleParam === 'manufacturer') {
      setRole('business');
    }
  }, [roleParam]);

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const PHONE_RE = /^\+?[0-9]{7,15}$/;

  const getFullMobile = (phone: string, country: CountryOption) => {
    const raw = phone.trim();
    if (!raw) return '';
    if (raw.startsWith('+')) return raw;
    return `${country.dialCode}${raw}`;
  };

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
      } else if (user.role === 'business') {
        router.replace('/business/dashboard');
      } else if (user.role === 'contractor') {
        router.replace('/contractor-portal/dashboard');
      } else {
        router.replace(getRoleDefaultDashboard(user.role));
      }
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!consent) {
      setError('You must agree to the Terms of Service & Privacy Policy.');
      return;
    }

    const fullMobile = getFullMobile(phoneNumber, selectedCountry);

    // Run validations before requesting OTP
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
    if (hasError) return;

    setSubmitting(true);
    setError('');

    const fullLocation = city.trim() ? `${city.trim()}, ${selectedCountry.name}` : selectedCountry.name;

    try {
      // Direct signup for testing
      await signup({ email, password, role, companyName, mobile: fullMobile, city: fullLocation });
      await refresh();

      if (role === 'contractor') {
        router.push('/contractor-portal/dashboard');
      } else {
        router.push('/onboarding');
      }
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
            {role === 'business' ? t.auth.joinTitle : 'Join as Contractor'}
          </h1>

          {/* Role selector buttons for mobile / quick toggle */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
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
              Manufacturer / Business
            </button>
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
              {submitting ? t.auth.creatingAccount : (role === 'business' ? 'Create Manufacturer Account' : t.auth.createAccountBtn)}
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

export default function SignupPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LoadingState label="Loading signup..." /></div>}>
      <SignupForm />
    </Suspense>
  );
}
