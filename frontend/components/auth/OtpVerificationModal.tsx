'use client';

import React, { useState, useEffect } from 'react';
import './OtpVerificationModal.css';

interface OtpVerificationModalProps {
  isOpen: boolean;
  email: string;
  mobile: string;
  onClose: () => void;
  onVerifyAndSubmit: (emailOtp: string, phoneOtp: string) => Promise<void>;
  onResendOtp: () => Promise<void>;
  loading: boolean;
  error?: string;
}

export default function OtpVerificationModal({
  isOpen,
  email,
  mobile,
  onClose,
  onVerifyAndSubmit,
  onResendOtp,
  loading,
  error: externalError,
}: OtpVerificationModalProps) {
  const [emailOtp, setEmailOtp] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(60);
  const [localError, setLocalError] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (emailOtp.length !== 4) {
      setLocalError('Please enter the 4-digit code sent to your email.');
      return;
    }
    if (phoneOtp.length !== 4) {
      setLocalError('Please enter the 4-digit code sent to your phone.');
      return;
    }

    try {
      await onVerifyAndSubmit(emailOtp, phoneOtp);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Verification failed. Please try again.');
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setLocalError('');
    try {
      await onResendOtp();
      setResendCooldown(60);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  const activeError = localError || externalError;

  return (
    <div className="otp-modal__overlay" role="dialog" aria-modal="true">
      <div className="otp-modal__content">
        <div className="otp-modal__header">
          <div className="otp-modal__icon-wrap">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 className="otp-modal__title">Verify Your Contact Info</h2>
          <p className="otp-modal__subtitle">
            We sent 4-digit verification codes to confirm ownership of your email and phone.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="otp-modal__body">
          {/* Email OTP Section */}
          <div className="otp-modal__section">
            <div className="otp-modal__section-header">
              <span className="otp-modal__section-title">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M3 7l9 6 9-6" />
                </svg>
                Email Code
              </span>
              <span className="otp-modal__section-target">{email}</span>
            </div>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={4}
              value={emailOtp}
              onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              className="otp-modal__input"
              required
              autoFocus
            />
          </div>

          {/* Phone OTP Section */}
          <div className="otp-modal__section">
            <div className="otp-modal__section-header">
              <span className="otp-modal__section-title">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                Phone Code
              </span>
              <span className="otp-modal__section-target">{mobile}</span>
            </div>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={4}
              value={phoneOtp}
              onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              className="otp-modal__input"
              required
            />
          </div>

          {activeError && <p className="otp-modal__error">{activeError}</p>}

          <div className="otp-modal__actions">
            <button
              type="submit"
              className="otp-modal__submit-btn"
              disabled={loading || emailOtp.length !== 4 || phoneOtp.length !== 4}
            >
              {loading ? 'Verifying & Creating Account…' : 'Confirm & Create Account'}
            </button>

            <div className="otp-modal__footer-links">
              <button
                type="button"
                onClick={onClose}
                className="otp-modal__back-btn"
                disabled={loading}
              >
                ← Edit details
              </button>

              <button
                type="button"
                onClick={handleResend}
                className="otp-modal__resend-btn"
                disabled={resendCooldown > 0 || resending || loading}
              >
                {resending ? 'Sending…' : resendCooldown > 0 ? `Resend codes in ${resendCooldown}s` : 'Resend codes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
