import ImageCarousel from './ImageCarousel';
import './TrustSection.css';

export default function TrustSection() {
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