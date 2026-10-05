'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { forgotPassword, resetPassword } from '@/lib/api/auth';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import './ForgotPasswordModal.css';

interface ForgotPasswordModalProps {
  open: boolean;
  onClose: () => void;
}

type Step = 'request' | 'reset' | 'success';

export default function ForgotPasswordModal({ open, onClose }: ForgotPasswordModalProps) {
  const { t } = useLanguage();

  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  // Reset state after modal closes (after animation)
  useEffect(() => {
    if (open) return;
    const timeout = setTimeout(() => {
      setStep('request');
      setEmail('');
      setOtp('');
      setNewPassword('');
      setShowPassword(false);
      setError('');
      setSubmitting(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [open]);

  const handleRequestReset = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await forgotPassword({ email });
      // Always advance to the code entry step — backend masks whether email exists.
      setStep('reset');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await resetPassword({ email, otp, newPassword });
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setSubmitting(true);
    setError('');
    try {
      await forgotPassword({ email });
      setOtp('');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fpm-overlay" onClick={onClose} aria-modal="true" role="dialog">
      <div className="fpm-card" onClick={(e) => e.stopPropagation()}>
        {/* ── Close button ─────────────────────────────── */}
        <button className="fpm-close" onClick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* ── Lock icon header ──────────────────────────── */}
        <div className="fpm-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
        </div>

        {/* ── Step: request ────────────────────────────── */}
        {step === 'request' && (
          <>
            <h2 className="fpm-title">{t.auth.requestResetTitle}</h2>
            <p className="fpm-subtitle">{t.auth.enterEmailLabel}</p>
            <form className="fpm-form" onSubmit={handleRequestReset}>
              <label className="fpm-label">
                <span>{t.auth.emailLabel}</span>
                <div className="fpm-field">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M3 7l9 6 9-6" />
                  </svg>
                  <input
                    id="fpm-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.auth.emailPlaceholder}
                    autoFocus
                  />
                </div>
              </label>
              {error && <p className="fpm-error">{error}</p>}
              <button type="submit" className="fpm-btn" disabled={submitting}>
                {submitting ? t.auth.sendingResetCode : t.auth.sendResetCode}
              </button>
            </form>
          </>
        )}

        {/* ── Step: reset ──────────────────────────────── */}
        {step === 'reset' && (
          <>
            <h2 className="fpm-title">{t.auth.checkEmail}</h2>
            <p className="fpm-subtitle">{t.auth.enterCodeAndPassword}</p>
            <form className="fpm-form" onSubmit={handleResetPassword}>
              <label className="fpm-label">
                <span>{t.auth.resetCode}</span>
                <div className="fpm-field">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4l3 3" />
                  </svg>
                  <input
                    id="fpm-otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder={t.auth.resetCodePlaceholder}
                    autoFocus
                  />
                </div>
              </label>
              <label className="fpm-label">
                <span>{t.auth.newPasswordLabel}</span>
                <div className="fpm-field">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="11" width="14" height="9" rx="2" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </svg>
                  <input
                    id="fpm-new-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t.auth.newPasswordPlaceholder}
                  />
                  <button
                    type="button"
                    className="fpm-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </label>
              {error && <p className="fpm-error">{error}</p>}
              <button type="submit" className="fpm-btn" disabled={submitting}>
                {submitting ? t.auth.resettingPassword : t.auth.resetPasswordBtn}
              </button>
            </form>
            <button className="fpm-resend" onClick={handleResend} disabled={submitting} type="button">
              {t.auth.resendCode}
            </button>
          </>
        )}

        {/* ── Step: success ────────────────────────────── */}
        {step === 'success' && (
          <div className="fpm-success">
            <div className="fpm-success__icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <h2 className="fpm-title">{t.auth.passwordResetSuccess}</h2>
            <button className="fpm-btn" onClick={onClose}>{t.auth.backToLogin}</button>
          </div>
        )}
      </div>
    </div>
  );
}
