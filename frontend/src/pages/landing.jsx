import { useState, useEffect, useRef, useMemo } from 'react';

// Assets
import heroBg from '../assets/hero-bg.png';
import helmetIcon from '../assets/helmet.png';
import shield from '../assets/shield-icon.png';
import trans2 from '../assets/trans2.png';
import trans3 from '../assets/trans3.png';
import trans4 from '../assets/trans4.png';
import trans5 from '../assets/trans5.png';
import trans6 from '../assets/trans6.png';
import glitterBg from '../assets/glitter-back.png';
import constructor1 from '../assets/constructor1.png';
import constructor2 from '../assets/constructor2.png';
import constructor3 from '../assets/constructor3.png';
import constructor4 from '../assets/constructor4.png';
import manufacturers from '../assets/manufacturers.png';
import audience2 from '../assets/audience2.png';
import audience3 from '../assets/audience3.png';
import audience4 from '../assets/audience4.png';

// ----------------------------------------------------
// Hero Component
// ----------------------------------------------------
export function Hero() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <section
      className="hero"
      style={{ backgroundImage: `url(${heroBg})` }}
    >
      <div className={`hero-content ${visible ? 'hero-content--visible' : ''}`}>
        <img src={helmetIcon} alt="" className="hero-icon" />

        <div className="hero-badges">
          <span className="hero-badge">✓ Verified Contractors</span>
          <span className="hero-badge">✓ Trusted People</span>
        </div>

        <h1 className="hero-headline">
          Smarter Way to <span className="hero-accent">Hire</span> Labour
          <br />
          Contractors
        </h1>
      </div>
    </section>
  );
}

// ----------------------------------------------------
// Image Carousel Component
// ----------------------------------------------------
const carouselSlides = [
  {
    id: "business",
    image: shield,
    title: "Business Verification",
  },
  {
    id: "license",
    image: trans2,
    title: "Licenses & Compliance",
  },
  {
    id: "workforce",
    image: trans3,
    title: "Workforce Details",
  },
  {
    id: "projects",
    image: trans4,
    title: "Project History",
  },
  {
    id: "ratings",
    image: trans5,
    title: "Ratings & Reviews",
  },
  {
    id: "documents",
    image: trans6,
    title: "Verified Documents",
  },
];

const CAROUSEL_WIDTHS = [58, 14, 9, 7, 5, 3];
const CAROUSEL_GAP = 0.5;

const CAROUSEL_LEFTS = [];
let carouselX = 0;

CAROUSEL_WIDTHS.forEach((w) => {
  CAROUSEL_LEFTS.push(carouselX);
  carouselX += w + CAROUSEL_GAP;
});

export function ImageCarousel() {
  const [current, setCurrent] = useState(0);

  const visibleSlides = useMemo(() => {
    return [...carouselSlides.slice(current), ...carouselSlides.slice(0, current)];
  }, [current]);

  const next = () => {
    setCurrent((prev) => (prev + 1) % carouselSlides.length);
  };

  const prev = () => {
    setCurrent((prev) => (prev - 1 + carouselSlides.length) % carouselSlides.length);
  };

  return (
    <div className="image-carousel">
      <div className="carousel-window">
        {visibleSlides.map((slide, index) => (
          <div
            key={slide.id}
            className="carousel-item"
            style={{
              width: `${CAROUSEL_WIDTHS[index]}%`,
              left: `${CAROUSEL_LEFTS[index]}%`,
            }}
          >
            <img src={slide.image} alt={slide.title} />

            <div className="overlay">
              <h3>{slide.title}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="carousel-nav">
        <button onClick={prev}>
          &#8249;
        </button>

        <button onClick={next}>
          &#8250;
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Trust Section Component
// ----------------------------------------------------
export function TrustSection() {
  return (
    <section className="trust-section">
      <p className="trust-eyebrow">TRUSTED INFORMATION</p>
      <h2 className="trust-heading">
        Everything You Need to Evaluate a Contractor in One Place
      </h2>

      <ImageCarousel />
    </section>
  );
}

// ----------------------------------------------------
// Why Craly Component
// ----------------------------------------------------
const whyCralyBadges = [
  { text: 'Reduce hiring risk', className: 'badge--top-left' },
  { text: 'Improve contractor transparency', className: 'badge--mid-right' },
  { text: 'Save time during evaluation', className: 'badge--mid-left' },
  { text: 'Make confident decisions', className: 'badge--bottom-right' },
];

export function WhyCraly() {
  return (
    <section
      className="why-craly"
      style={{ backgroundImage: `url(${glitterBg})` }}
    >
      <p className="why-craly__eyebrow">WHY CRALY</p>
      <h2 className="why-craly__heading">Make Better Contractor Decisions</h2>

      <div className="why-craly__stage">
        <img src={helmetIcon} alt="" className="why-craly__helmet" />

        {whyCralyBadges.map((b) => (
          <span key={b.text} className={`why-craly__badge ${b.className}`}>
            <span className="why-craly__check">✓</span> {b.text}
          </span>
        ))}
      </div>
    </section>
  );
}

// ----------------------------------------------------
// How It Works Component
// ----------------------------------------------------
const howItWorksSteps = [
  {
    number: '1.',
    title: 'Contractor Creates Profile',
    text: 'Contractors register their business and submit company information.',
    color: '#F87531',
    img: constructor1,
  },
  {
    number: '2.',
    title: 'Information Gets Verified',
    text: 'Business details, documents, and compliance information are reviewed and verified.',
    color: '#2563eb',
    img: constructor2,
  },
  {
    number: '3.',
    title: 'Build a Trusted Profile',
    text: 'Verified contractor profiles showcase business information, experience, and work history.',
    color: '#eab308',
    img: constructor3,
  },
  {
    number: '4.',
    title: 'Hire With Confidence',
    text: 'Verified contractor profiles showcase business information, experience, and work history.',
    color: '#7c3aed',
    img: constructor4,
  },
];

export function HowItWorks() {
  const containerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const el = containerRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;

      const total = rect.height - vh;
      const progress = Math.min(Math.max(-rect.top / total, 0), 1);

      const index = Math.min(
        howItWorksSteps.length - 1,
        Math.floor(progress * howItWorksSteps.length)
      );
      setActiveIndex(index);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const current = howItWorksSteps[activeIndex];

  return (
    <section className="how-it-works">
      <div className="how-it-works__intro">
        <p className="how-it-works__eyebrow">HOW IT WORKS</p>
        <h2 className="how-it-works__heading">A Simple Verification Process</h2>
      </div>

      <div
        ref={containerRef}
        className="how-it-works__scroll-track"
        style={{ height: `${howItWorksSteps.length * 100}vh` }}
      >
        <div className="how-it-works__sticky">
          <div className="how-step">
            <div className="how-step__text" key={`text-${activeIndex}`}>
              <h3 className="how-step__title" style={{ color: current.color }}>
                {current.number} {current.title}
              </h3>
              <p className="how-step__subtext">{current.text}</p>
            </div>

            <div className="how-step__image-wrap">
              <img
                key={`img-${activeIndex}`}
                src={current.img}
                alt=""
                className="how-step__image"
              />
            </div>
          </div>

          <div className="how-it-works__progress">
            {howItWorksSteps.map((s, i) => (
              <span
                key={s.number}
                className={`how-it-works__dot ${i === activeIndex ? 'how-it-works__dot--active' : ''}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------
// Built For Component
// ----------------------------------------------------
const builtForSlides = [
  {
    img: manufacturers,
    title: 'Manufacturers',
    text: 'Find reliable labour contractors for production and plant operations.',
  },
  {
    img: audience2,
    title: 'EPC & Engineering Companies',
    text: 'Evaluate contractors before project execution.',
  },
  {
    img: audience3,
    title: 'Infrastructure & Construction',
    text: 'Review contractor profiles before awarding work.',
  },
  {
    img: audience4,
    title: 'Labour Contractors',
    text: 'Build trust, showcase experience, and grow your business.',
  },
];

export function BuiltFor() {
  const [index, setIndex] = useState(0);

  const go = (dir) => {
    setIndex((prev) => (prev + dir + builtForSlides.length) % builtForSlides.length);
  };

  const current = builtForSlides[index];

  return (
    <section className="built-for">
      <p className="built-for__eyebrow">BUILT FOR</p>
      <h2 className="built-for__heading">
        Designed for India's Industrial
        <br />
        Ecosystem
      </h2>

      <div className="built-for__carousel">
        <div className="built-for__image-wrap">
          <img
            key={current.img}
            src={current.img}
            alt=""
            className="built-for__image"
          />
        </div>

        <div className="built-for__footer">
          <div className="built-for__caption" key={current.title}>
            <h3 className="built-for__title">{current.title}</h3>
            <p className="built-for__text">{current.text}</p>
          </div>

          <div className="built-for__nav">
            <button onClick={() => go(-1)} aria-label="Previous">‹</button>
            <button onClick={() => go(1)} aria-label="Next">›</button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------
// FAQ Component
// ----------------------------------------------------
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

export function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

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

// ----------------------------------------------------
// Foot Component
// ----------------------------------------------------
export function Foot() {
  return (
    <footer className="footer">
      <div className="footer-container">

        <div className="footer-top">

          <div className="footer-brand">
            <img src={helmetIcon} alt="Craly" className="footer__logo" />
            <p>
              Building trust before the first phone call.
            </p>

            <span>
              Verified contractor profiles for modern businesses.
            </span>
          </div>

          <div className="footer-links">
            <h3>Navigation</h3>

            <a href="#trust">Trust Section</a>
            <a href="#why">Why Craly</a>
            <a href="#how">How It Works</a>
            <a href="#faq">FAQ</a>
          </div>

        </div>

        <div className="footer-divider"></div>

        <div className="footer-bottom">

          <div className="footer-contact">

            <div className="contact-item">
              <span className="icon">📍</span>
              <p>
                Badnera Rd, in front of Tapadia City Centre Mall,
                Saturna, Amravati,
                Maharashtra 444607
              </p>
            </div>

            <div className="contact-item">
              <span className="icon">☎</span>
              <p>+91 95032 52288</p>
            </div>

            <div className="contact-item">
              <span className="icon">✉</span>
              <p>hello@craly.com</p>
            </div>

          </div>

          <div className="footer-social">

            <a href="#">LinkedIn</a>
            <a href="#">Instagram</a>
            <a href="#">X</a>

          </div>

        </div>

        <div className="footer-divider"></div>

        <div className="footer-copy">
          © 2026 Craly. All rights reserved.
        </div>

      </div>
    </footer>
  );
}

// ----------------------------------------------------
// Main Landing Page Component
// ----------------------------------------------------
export default function Landing() {
  return (
    <div className="landing">
      <Hero />
      <TrustSection />
      <WhyCraly />
      <HowItWorks />
      <BuiltFor />
      <FAQ />
      <Foot />
    </div>
  );
}
