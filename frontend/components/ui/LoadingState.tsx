import './LoadingState.css';

interface LoadingStateProps {
  label?: string;
  /** Renders a grid of skeleton cards instead of a plain spinner + label. */
  cards?: number;
}

/** Reusable loading indicator — spinner + label, or a skeleton card grid. */
export default function LoadingState({ label = 'Loading…', cards }: LoadingStateProps) {
  if (cards) {
    return (
      <div className="loading-grid" aria-busy="true" aria-label={label}>
        {Array.from({ length: cards }).map((_, i) => (
          <div className="loading-card" key={i}>
            <div className="loading-shimmer loading-shimmer--badge" />
            <div className="loading-shimmer loading-shimmer--title" />
            <div className="loading-shimmer loading-shimmer--line" />
            <div className="loading-shimmer loading-shimmer--line loading-shimmer--short" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className="loading-spinner" />
      <span>{label}</span>
    </div>
  );
}
