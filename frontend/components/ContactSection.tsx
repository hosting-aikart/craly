'use client';

import React, { useState, type FormEvent } from 'react';
import { apiPost } from '@/lib/api';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import './ContactSection.css';

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string;
}

const initialForm: ContactFormData = {
  name: '',
  email: '',
  phone: '',
  company: '',
  message: '',
};

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function ContactSection() {
  const { t } = useLanguage();
  const [form, setForm] = useState<ContactFormData>(initialForm);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (field: keyof ContactFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');

    try {
      await apiPost('/contact', form);
      setStatus('success');
      setForm(initialForm);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : t.contact.genericError);
    }
  };

  return (
    <section className="contact-section" id="contact">
      <div className="contact-section__glow contact-section__glow--a" />
      <div className="contact-section__glow contact-section__glow--b" />

      <div className="contact-section__intro">
        <p className="contact-section__eyebrow">{t.contact.eyebrow}</p>
        <h2 className="contact-section__heading">{t.contact.heading}</h2>
      </div>

      <div className="contact-section__container">
        {/* ── Left: Form (50%) ───────────────────────────────────────── */}
        <div className="contact-section__form-col">
          {status === 'success' ? (
            <div className="contact-section__success">
              <span className="contact-section__success-icon">✓</span>
              <h3>{t.contact.successTitle}</h3>
              <p>{t.contact.successBody}</p>
              <button className="contact-section__submit" onClick={() => setStatus('idle')}>
                {t.contact.sendAnother}
              </button>
            </div>
          ) : (
            <form className="contact-section__form" onSubmit={handleSubmit}>
              <div className="contact-section__row">
                <label className="contact-section__field">
                  <span>{t.contact.fieldName}</span>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={handleChange('name')}
                    placeholder={t.contact.placeholderName}
                  />
                </label>

                <label className="contact-section__field">
                  <span>{t.contact.fieldEmail}</span>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={handleChange('email')}
                    placeholder="you@company.com"
                  />
                </label>
              </div>

              <div className="contact-section__row">
                <label className="contact-section__field">
                  <span>{t.contact.fieldPhone}</span>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={handleChange('phone')}
                    placeholder="+91 00000 00000"
                  />
                </label>

                <label className="contact-section__field">
                  <span>{t.contact.fieldCompany}</span>
                  <input
                    type="text"
                    value={form.company}
                    onChange={handleChange('company')}
                    placeholder={t.contact.placeholderCompany}
                  />
                </label>
              </div>

              <label className="contact-section__field">
                <span>{t.contact.fieldMessage}</span>
                <textarea
                  required
                  rows={4}
                  value={form.message}
                  onChange={handleChange('message')}
                  placeholder={t.contact.placeholderMessage}
                />
              </label>

              {status === 'error' && (
                <p className="contact-section__error">{errorMsg}</p>
              )}

              <button
                type="submit"
                className="contact-section__submit"
                disabled={status === 'submitting'}
              >
                {status === 'submitting' ? t.contact.sending : t.contact.send}
              </button>
            </form>
          )}
        </div>

        {/* ── Right: Executive Contact Info & Support Card (50%) ────── */}
        <div className="contact-section__visual-col">
          <div className="contact-info-card">
            <div className="contact-info-card__header">
              <div className="contact-info-card__badge">
                <span className="contact-info-card__dot" />
                <span>Live Support & Sales Inquiry</span>
              </div>
              <h3 className="contact-info-card__title">We're here to help your business scale</h3>
              <p className="contact-info-card__desc">
                Have a custom requirement, need contractor onboarding assistance, or want a platform demo? Reach out directly to our team.
              </p>
            </div>

            <div className="contact-info-card__channels">
              <div className="contact-channel">
                <div className="contact-channel__icon contact-channel__icon--email">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="3" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </div>
                <div>
                  <span className="contact-channel__label">Direct Email</span>
                  <a href="mailto:support@craly.co" className="contact-channel__value">support@craly.co</a>
                </div>
              </div>

              <div className="contact-channel">
                <div className="contact-channel__icon contact-channel__icon--time">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div>
                  <span className="contact-channel__label">Response Time</span>
                  <span className="contact-channel__value">Under 2 Hours</span>
                </div>
              </div>

              <div className="contact-channel">
                <div className="contact-channel__icon contact-channel__icon--location">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div>
                  <span className="contact-channel__label">Headquarters</span>
                  <span className="contact-channel__value">India • Nationwide Contractor Coverage</span>
                </div>
              </div>
            </div>

            <div className="contact-info-card__trust">
              <div className="trust-pill">✓ 5,000+ Verified Contractors</div>
              <div className="trust-pill">✓ Enterprise Security & NDA</div>
              <div className="trust-pill">✓ Dedicated Support Manager</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
