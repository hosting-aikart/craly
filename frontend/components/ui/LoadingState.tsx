import React from 'react';
import { DashboardSkeleton, TableSkeleton } from './Skeleton';
import './LoadingState.css';

interface LoadingStateProps {
  label?: string;
  cards?: number;
  variant?: 'spinner' | 'dashboard' | 'cards' | 'table';
}

/** Reusable loading component rendering modern Skeleton UI loaders */
export default function LoadingState({
  label = 'Loading…',
  cards,
  variant = 'dashboard',
}: LoadingStateProps) {
  if (variant === 'dashboard') {
    return <DashboardSkeleton label={label} />;
  }

  if (variant === 'table') {
    return <TableSkeleton rows={cards || 5} />;
  }

  if (cards || variant === 'cards') {
    const cardCount = cards || 3;
    return (
      <div className="loading-grid" aria-busy="true" aria-label={label}>
        {Array.from({ length: cardCount }).map((_, i) => (
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
