import { useState } from 'react';
import './FAQ.css';

const faqs = [
  {
    q: 'What is Craly?',
    a: 'Craly is a contractor verification platform that helps businesses evaluate labour contractors through verified business information, work history, and compliance details before hiring.',
  },
  {
    q: 'Who can use Craly?',
    intro: 'Craly is built for:',
        list: [
      'Manufacturers',
      'EPC & Engineering Companies',
      'Construction Firms',
      'Infrastructure Companies',
      'Warehousing & Logistics Businesses',
      'Labour Contractors',
    ],
  },
  {
    q: 'Why should businesses use Craly?',
    a: 'Hiring the right contractor is critical to project success. Craly helps businesses make informed hiring decisions by providing trusted contractor information in one place.',
  },
  {
    q: 'How do contractors get verified?',
    a: 'Contractors submit their business information and supporting documents. Our verification process helps build a trusted profile that businesses can review.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null); // null = nothing open

  const toggle = (i) => {
    setOpenIndex((prev) => (prev === i ? null : i));
  };

  return (
    <section className="faq">
      <h2 className="faq__heading">Frequently Asked Questions</h2>

      <div className="faq__list">
        {faqs.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div className={`faq-item ${isOpen ? 'faq-item--open' : ''}`} key={item.q}>
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