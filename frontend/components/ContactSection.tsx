'use client';

import { useState, type FormEvent } from 'react';
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

        {/* ── Right: Craly process illustration (50%) ─────────────────
            Manufacturer → Contract Requirement → Craly Matching →
            Verified Contractor → Successful Engagement. Purely
            supplementary (the same narrative is covered accessibly by
            the How It Works section), so it stays aria-hidden. */}
        <div className="contact-section__visual-col" aria-hidden="true">
          <div className="contact-flow">
            <span className="contact-flow__dot" />

            <div className="contact-flow__step contact-flow__step--manufacturer">
              <span className="contact-flow__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21V10l6 4v-4l6 4V6l6 4v11H3Z" />
                  <path d="M7 21v-4M12 21v-4M17 21v-4" />
                </svg>
              </span>
              <span className="contact-flow__label">Manufacturer</span>
            </div>

            <div className="contact-flow__step contact-flow__step--requirement">
              <span className="contact-flow__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="3" width="14" height="18" rx="2" />
                  <path d="M9 8h6M9 12h6M9 16h3" />
                </svg>
              </span>
              <span className="contact-flow__label">Contract Requirement</span>
            </div>

            <div className="contact-flow__step contact-flow__step--matching">
              <span className="contact-flow__icon contact-flow__icon--hero">
                <span className="contact-flow__icon-ring" />
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </span>
              <span className="contact-flow__label contact-flow__label--hero">Craly Matching</span>
            </div>

            <div className="contact-flow__step contact-flow__step--contractor">
              <span className="contact-flow__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 18a7 7 0 0 1 14 0" />
                  <path d="M9 18v-2" />
                  <path d="M12 6v2" />
                  <rect x="2" y="17" width="20" height="3" rx="1" />
                </svg>
              </span>
              <span className="contact-flow__label">Verified Contractor</span>
            </div>

            <div className="contact-flow__step contact-flow__step--engagement">
              <span className="contact-flow__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12l4-3 4 2 3-2 3 1 4-3" />
                  <path d="M4 12v3.5a1 1 0 0 0 .4.8l3.6 2.7a1.2 1.2 0 0 0 1.6-.1l.4-.4a1.2 1.2 0 0 1 1.7 0l.3.3a1.2 1.2 0 0 0 1.7 0l3.9-3.8" />
                </svg>
              </span>
              <span className="contact-flow__label">Successful Engagement</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
