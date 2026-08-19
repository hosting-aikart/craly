'use client';

import { useState, type FormEvent } from 'react';
import { apiPost } from '@/lib/api';
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
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again later.',
      );
    }
  };

  return (
    <section className="contact-section" id="contact">
      <div className="contact-section__glow contact-section__glow--a" />
      <div className="contact-section__glow contact-section__glow--b" />

      <div className="contact-section__intro">
        <p className="contact-section__eyebrow">GET IN TOUCH</p>
        <h2 className="contact-section__heading">Have a Question? Let&apos;s Talk.</h2>
        <p className="contact-section__subtext">
          Whether you&apos;re a business looking to hire or a contractor ready to get
          verified — send us a message and our team will get back to you.
        </p>
      </div>

      <div className="contact-section__container">
        {/* ── Left: Form (50%) ───────────────────────────────────────── */}
        <div className="contact-section__form-col">
          {status === 'success' ? (
            <div className="contact-section__success">
              <span className="contact-section__success-icon">✓</span>
              <h3>Thanks for reaching out!</h3>
              <p>We&apos;ve received your message and will get back to you shortly.</p>
              <button className="contact-section__submit" onClick={() => setStatus('idle')}>
                Send another message
              </button>
            </div>
          ) : (
            <form className="contact-section__form" onSubmit={handleSubmit}>
              <div className="contact-section__row">
                <label className="contact-section__field">
                  <span>Full Name*</span>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={handleChange('name')}
                    placeholder="Your name"
                  />
                </label>

                <label className="contact-section__field">
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

              <div className="contact-section__row">
                <label className="contact-section__field">
                  <span>Phone</span>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={handleChange('phone')}
                    placeholder="+91 00000 00000"
                  />
                </label>

                <label className="contact-section__field">
                  <span>Company</span>
                  <input
                    type="text"
                    value={form.company}
                    onChange={handleChange('company')}
                    placeholder="Company name"
                  />
                </label>
              </div>

              <label className="contact-section__field">
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
                <p className="contact-section__error">{errorMsg}</p>
              )}

              <button
                type="submit"
                className="contact-section__submit"
                disabled={status === 'submitting'}
              >
                {status === 'submitting' ? 'Sending…' : 'Send Message'}
              </button>
            </form>
          )}
        </div>

        {/* ── Right: Animated illustration (50%) ─────────────────────── */}
        <div className="contact-section__visual-col" aria-hidden="true">
          <div className="contact-visual">
            <span className="contact-visual__ring contact-visual__ring--1" />
            <span className="contact-visual__ring contact-visual__ring--2" />
            <span className="contact-visual__ring contact-visual__ring--3" />

            <svg
              className="contact-visual__lines"
              viewBox="0 0 400 400"
              preserveAspectRatio="none"
            >
              <path
                id="contact-path-a"
                className="contact-visual__path"
                d="M 70 90 C 130 90, 150 150, 200 200"
                fill="none"
              />
              <path
                id="contact-path-b"
                className="contact-visual__path"
                d="M 330 310 C 270 310, 250 250, 200 200"
                fill="none"
              />
              <circle r="4" className="contact-visual__pulse-dot">
                <animateMotion dur="3s" repeatCount="indefinite" rotate="auto">
                  <mpath href="#contact-path-a" xlinkHref="#contact-path-a" />
                </animateMotion>
              </circle>
              <circle r="4" className="contact-visual__pulse-dot">
                <animateMotion dur="3.4s" begin="0.6s" repeatCount="indefinite" rotate="auto">
                  <mpath href="#contact-path-b" xlinkHref="#contact-path-b" />
                </animateMotion>
              </circle>
            </svg>

            <div className="contact-visual__shield">
              <svg viewBox="0 0 64 64" fill="none">
                <path
                  d="M32 4 L56 14 V30 C56 45 46 55 32 60 C18 55 8 45 8 30 V14 Z"
                  fill="url(#shieldGradient)"
                />
                <path
                  d="M21 32 L28 39 L43 23"
                  stroke="#fff"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <defs>
                  <linearGradient id="shieldGradient" x1="8" y1="4" x2="56" y2="60">
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#4f46e5" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="contact-visual__node contact-visual__node--business">
              <span className="contact-visual__node-icon">🏢</span>
              <span>Business</span>
            </div>

            <div className="contact-visual__node contact-visual__node--contractor">
              <span className="contact-visual__node-icon">🦺</span>
              <span>Contractor</span>
            </div>

            <span className="contact-visual__particle contact-visual__particle--1" />
            <span className="contact-visual__particle contact-visual__particle--2" />
            <span className="contact-visual__particle contact-visual__particle--3" />
            <span className="contact-visual__particle contact-visual__particle--4" />
            <span className="contact-visual__particle contact-visual__particle--5" />
          </div>
        </div>
      </div>
    </section>
  );
}
