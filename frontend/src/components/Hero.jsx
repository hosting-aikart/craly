import { useEffect, useState } from 'react';
import './Hero.css';
import heroBg from '../assets/hero-bg.png';
import helmetIcon from '../assets/helmet.png';

export default function Hero() {
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