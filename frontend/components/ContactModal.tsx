'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { apiPost } from '@/lib/api';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import './ContactModal.css';

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
}

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

export default function ContactModal({ open, onClose }: ContactModalProps) {
  const { t } = useLanguage();
  const [form, setForm] = useState<ContactFormData>(initialForm);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Lock page scroll while the modal is open and let Escape close it.
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

  // Reset internal state a moment after close so the closing animation
  // doesn't flash a blank/reset form.
  useEffect(() => {
    if (open) return;
    const timeout = setTimeout(() => {
      setForm(initialForm);
      setStatus('idle');
      setErrorMsg('');
    }, 250);
    return () => clearTimeout(timeout);
  }, [open]);

  if (!open) return null;

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
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : t.contact.genericError);
    }
  };

  return (
    <div className="contact-modal__overlay" onMouseDown={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="contact-modal" role="dialog" aria-modal="true" aria-labelledby="contact-modal-title">
        <div className="contact-modal__glow contact-modal__glow--a" />
        <div className="contact-modal__glow contact-modal__glow--b" />

        <button className="contact-modal__close" onClick={onClose} aria-label="Close contact form">
          &times;
        </button>

        {status === 'success' ? (
          <div className="contact-modal__success">
            <span className="contact-modal__success-ring" />
            <span className="contact-modal__success-icon">✓</span>
            <h3 id="contact-modal-title">{t.contact.successTitle}</h3>
            <p>{t.contact.successBody}</p>
            <button className="contact-modal__submit" onClick={onClose}>
              {t.contact.close}
            </button>
          </div>
        ) : (
          <>
            <div className="contact-modal__badge">✉</div>
            <h3 id="contact-modal-title">{t.contact.modalTitle}</h3>
            <p className="contact-modal__subtitle">{t.contact.modalSubtitle}</p>

            <form className="contact-modal__form" onSubmit={handleSubmit}>
              <div className="contact-modal__row">
                <label className="contact-modal__field">
                  <span>{t.contact.fieldName}</span>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={handleChange('name')}
                    placeholder={t.contact.placeholderName}
                  />
                </label>

                <label className="contact-modal__field">
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

              <div className="contact-modal__row">
                <label className="contact-modal__field">
                  <span>{t.contact.fieldPhone}</span>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={handleChange('phone')}
                    placeholder="+91 00000 00000"
                  />
                </label>

                <label className="contact-modal__field">
                  <span>{t.contact.fieldCompany}</span>
                  <input
                    type="text"
                    value={form.company}
                    onChange={handleChange('company')}
                    placeholder={t.contact.placeholderCompany}
                  />
                </label>
              </div>

              <label className="contact-modal__field">
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
                <p className="contact-modal__error">{errorMsg}</p>
              )}

              <button
                type="submit"
                className="contact-modal__submit"
                disabled={status === 'submitting'}
              >
                {status === 'submitting' ? t.contact.sending : t.contact.send}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
