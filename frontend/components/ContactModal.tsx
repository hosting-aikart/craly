'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { apiPost } from '@/lib/api';
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
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again later.',
      );
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
            <h3 id="contact-modal-title">Thanks for reaching out!</h3>
            <p>We&apos;ve received your message and will get back to you shortly.</p>
            <button className="contact-modal__submit" onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="contact-modal__badge">✉</div>
            <h3 id="contact-modal-title">Contact Us</h3>
            <p className="contact-modal__subtitle">
              Have a question or want to get in touch? Fill out the form below.
            </p>

            <form className="contact-modal__form" onSubmit={handleSubmit}>
              <div className="contact-modal__row">
                <label className="contact-modal__field">
                  <span>Full Name*</span>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={handleChange('name')}
                    placeholder="Your name"
                  />
                </label>

                <label className="contact-modal__field">
                  <span>Email*</span>
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
                  <span>Phone</span>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={handleChange('phone')}
                    placeholder="+91 00000 00000"
                  />
                </label>

                <label className="contact-modal__field">
                  <span>Company</span>
                  <input
                    type="text"
                    value={form.company}
                    onChange={handleChange('company')}
                    placeholder="Company name"
                  />
                </label>
              </div>

              <label className="contact-modal__field">
                <span>Message*</span>
                <textarea
                  required
                  rows={4}
                  value={form.message}
                  onChange={handleChange('message')}
                  placeholder="How can we help?"
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
                {status === 'submitting' ? 'Sending…' : 'Send Message'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
