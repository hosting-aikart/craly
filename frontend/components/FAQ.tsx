'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import ContactModal from './ContactModal';
import './FAQ.css';

export default function FAQ() {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [isContactOpen, setIsContactOpen] = useState(false);

  const toggle = (i: number) =>
    setOpenIndex((prev) => (prev === i ? null : i));

  // Fallback / default FAQ list if translations don't have enough items
  const defaultItems = [
    {
      q: 'What is Craly?',
      a: 'Craly is a contractor verification platform that helps businesses evaluate labour contractors through verified business information, work history, and compliance details before hiring.',
    },
    {
      q: 'Who can use Craly?',
      intro: 'Craly is built for:',
      list: [
        'Manufacturers & Industrial Plants',
        'EPC & Engineering Companies',
        'Construction & Real Estate Firms',
        'Infrastructure Contractors',
        'Warehousing & Logistics Businesses',
        'Labour Contractors & Sub-contractors',
      ],
    },
    {
      q: 'Why should businesses use Craly?',
      a: 'Hiring the right contractor is critical to project success. Craly helps businesses make informed hiring decisions by providing trusted contractor information in one unified platform.',
    },
    {
      q: 'How do contractors get verified?',
      a: 'Contractors submit their business credentials, licenses, and background details. Our team verifies the documentation to ensure trust before publishing profiles.',
    },
    {
      q: 'How long does the verification process take?',
      a: 'Standard verification takes 24 to 48 hours once all required business documents and workforce details are submitted.',
    },
  ];

  const items = t.faq?.items && t.faq.items.length >= 4 ? t.faq.items : defaultItems;

  return (
    <section className="faq-section" id="faq">
      <div className="faq-container">
        {/* Header Heading */}
        <div className="faq-header">
          <span className="faq-eyebrow">GET IN TOUCH</span>
          <h2 className="faq-title">Have a Question? Let&apos;s Talk.</h2>
        </div>

        <div className="faq-grid">
          {/* Left Column: Email card + Questions list */}
          <div className="faq-left">
            {/* Top Email / Get in Touch Card */}
            <div className="faq-email-card">
              <div className="faq-email-info">
                <span className="faq-email-label">Email</span>
                <a href="mailto:hello@craly.com" className="faq-email-address">
                  hello@craly.com
                </a>
              </div>
              <button
                type="button"
                className="faq-get-in-touch-btn"
                onClick={() => setIsContactOpen(true)}
              >
                <svg
                  className="faq-envelope-icon"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <span>Get in touch</span>
              </button>
            </div>

            {/* Accordion Questions List */}
            <div className="faq-accordion-list">
              {items.map((item, i) => {
                const isOpen = openIndex === i;
                return (
                  <div
                    className={`faq-card-item ${isOpen ? 'faq-card-item--open' : ''}`}
                    key={i}
                  >
                    <button
                      type="button"
                      className="faq-card-question"
                      onClick={() => toggle(i)}
                      aria-expanded={isOpen}
                    >
                      <span className="faq-question-text">{item.q}</span>
                      <span className="faq-toggle-circle" aria-hidden="true">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{
                            transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                            transition: 'transform 0.25s ease',
                          }}
                        >
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </span>
                    </button>

                    {isOpen && (
                      <div className="faq-card-answer">
                        {item.intro && <p className="faq-answer-intro">{item.intro}</p>}
                        {item.list ? (
                          <ul className="faq-answer-bullets">
                            {item.list.map((point, idx) => (
                              <li key={idx}>{point}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="faq-answer-text">{item.a}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Featured Image Card */}
          <div className="faq-right">
            <div className="faq-image-card">
              <img
                src="/assets/faq-property.jpg"
                alt="Modern luxury property design"
                className="faq-property-img"
              />
            </div>
          </div>
        </div>

      </div>

      {/* Contact Modal */}
      <ContactModal open={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </section>
  );
}

