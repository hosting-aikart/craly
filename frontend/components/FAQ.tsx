'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import './FAQ.css';

export default function FAQ() {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (i: number) =>
    setOpenIndex((prev) => (prev === i ? null : i));

  return (
    <section className="faq" id="faq">
      <div className="faq__glow" aria-hidden="true" />
      <h2 className="faq__heading">{t.faq.heading}</h2>

      <div className="faq__list">
        {t.faq.items.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div className={`faq-item ${isOpen ? 'faq-item--open' : ''}`} key={i}>
              <button
                className="faq-item__question"
                onClick={() => toggle(i)}
                aria-expanded={isOpen}
              >
                <span>{item.q}</span>
                <span className="faq-item__chevron">›</span>
              </button>

              {isOpen && (
                item.list ? (
                  <div className="faq-item__answer">
                    {item.intro && <p className="faq-item__intro">{item.intro}</p>}
                    <ul className="faq-item__bullets">
                      {item.list.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="faq-item__answer">{item.a}</p>
                )
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
