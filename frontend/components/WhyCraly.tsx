import './WhyCraly.css';

const helmet = '/assets/helmet.png';
const glitterBg = '/assets/glitter-back.png';

interface Badge {
  text: string;
  className: string;
}

const badges: Badge[] = [
  { text: 'Reduce hiring risk',                className: 'badge--top-left' },
  { text: 'Improve contractor transparency',   className: 'badge--mid-right' },
  { text: 'Save time during evaluation',       className: 'badge--mid-left' },
  { text: 'Make confident decisions',          className: 'badge--bottom-right' },
];

export default function WhyCraly() {
  return (
    <section
      className="why-craly"
      style={{ backgroundImage: `url(${glitterBg})` }}
    >
      <p className="why-craly__eyebrow">WHY CRALY</p>
      <h2 className="why-craly__heading">Make Better Contractor Decisions</h2>

      <div className="why-craly__stage">
        <img src={helmet} alt="" className="why-craly__helmet" />

        {badges.map((b) => (
          <span key={b.text} className={`why-craly__badge ${b.className}`}>
            <span className="why-craly__check">✓</span> {b.text}
          </span>
        ))}
      </div>
    </section>
  );
}
