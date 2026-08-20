import './ListedBadge.css';

interface ListedBadgeProps {
  /** Compact mode for tight card headers vs. the fuller profile-page badge. */
  compact?: boolean;
}

/**
 * Craly's recognizable directory badge. Named honestly: contractors are
 * listed directly, with no admin approval/verification step behind it, so
 * this never claims "verified" — it marks a contractor as a real, live
 * profile on the platform. If a real verification workflow gets built
 * later, this is the one place to change the label and meaning.
 */
export default function ListedBadge({ compact }: ListedBadgeProps) {
  return (
    <span className={`listed-badge ${compact ? 'listed-badge--compact' : ''}`}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M8.5 12.5l2.3 2.3L15.5 9.5" />
      </svg>
      CRALY LISTED
    </span>
  );
}
