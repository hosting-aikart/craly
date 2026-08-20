'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './signup.css';
import { signup } from '@/lib/api/auth';

const helmetLogo = '/assets/helmet.png';

export default function SignupPage() {
  const router = useRouter();
  const [role, setRole] = useState<'contractor' | 'business'>('contractor');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await signup({ email, password, role, companyName });
      // Fresh accounts always need onboarding — no need to check the profile.
      router.push('/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

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

            <p className="signup-panel__eyebrow">JOIN CRALY</p>
            <h2 className="signup-panel__heading">Get discovered — or find who you need.</h2>

            <div className="signup-panel__roles">
              <div className="signup-panel__role-card">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 18a7 7 0 0 1 14 0" />
                  <path d="M9 18v-2" />
                  <path d="M12 6v2" />
                  <rect x="2" y="17" width="20" height="3" rx="1" />
                </svg>
                <h4>Contractor</h4>
                <p>Build a verified profile</p>
              </div>
              <div className="signup-panel__role-card">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="3" width="16" height="18" rx="1" />
                  <path d="M9 8h1M14 8h1M9 12h1M14 12h1" />
                  <path d="M10 21v-4h4v4" />
                </svg>
                <h4>Business</h4>
                <p>Hire with confidence</p>
              </div>
            </div>
          </div>

          <div className="signup-panel__security">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            Your account and business details stay protected.
          </div>
        </div>

        {/* ── Right: white form panel ───────────────────────────────── */}
        <div className="signup-form-panel">
          <p className="signup-form-panel__eyebrow">CREATE ACCOUNT</p>
          <h1 className="signup-form-panel__heading">Join Craly</h1>

          <form className="signup-fields" onSubmit={handleSubmit}>
            <div className="signup-role-picker">
              <button
                type="button"
                className={`signup-role-option ${role === 'contractor' ? 'signup-role-option--active' : ''}`}
                onClick={() => setRole('contractor')}
              >
                <span>🦺</span>
                <span>I&apos;m a Contractor</span>
              </button>
              <button
                type="button"
                className={`signup-role-option ${role === 'business' ? 'signup-role-option--active' : ''}`}
                onClick={() => setRole('business')}
              >
                <span>🏢</span>
                <span>I&apos;m a Business</span>
              </button>
            </div>

            <label className="signup-field">
              <span>Company Name</span>
              <div className="signup-field__input">
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Your company name"
                />
              </div>
            </label>

            <label className="signup-field">
              <span>Email</span>
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
                  placeholder="you@company.com"
                />
              </div>
            </label>

            <label className="signup-field">
              <span>Password</span>
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
                  placeholder="At least 8 characters"
                />
              </div>
            </label>

            {error && <p className="signup-error">{error}</p>}

            <button type="submit" className="signup-submit" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="signup-footer-link">
            Already have an account? <Link href="/login">Log in</Link>
          </p>
        </div>

      </div>
    </div>
  );
}
