import React from 'react';
import './LoadingState.css';

interface DashboardSkeletonProps {
  label?: string;
}

export function DashboardSkeleton({ label = 'Loading Dashboard…' }: DashboardSkeletonProps) {
  return (
    <div className="skeleton-dashboard-container" aria-busy="true" aria-label={label}>
      {/* Banner Skeleton */}
      <div className="skeleton-banner loading-shimmer" />

      {/* 4 Metrics Skeletons */}
      <div className="skeleton-metrics-grid">
        <div className="skeleton-metric-card loading-card">
          <div className="loading-shimmer loading-shimmer--title" style={{ width: '40%' }} />
          <div className="loading-shimmer" style={{ width: '60%', height: '28px', margin: '8px 0' }} />
          <div className="loading-shimmer loading-shimmer--short" />
        </div>
        <div className="skeleton-metric-card loading-card">
          <div className="loading-shimmer loading-shimmer--title" style={{ width: '40%' }} />
          <div className="loading-shimmer" style={{ width: '60%', height: '28px', margin: '8px 0' }} />
          <div className="loading-shimmer loading-shimmer--short" />
        </div>
        <div className="skeleton-metric-card loading-card">
          <div className="loading-shimmer loading-shimmer--title" style={{ width: '40%' }} />
          <div className="loading-shimmer" style={{ width: '60%', height: '28px', margin: '8px 0' }} />
          <div className="loading-shimmer loading-shimmer--short" />
        </div>
        <div className="skeleton-metric-card loading-card">
          <div className="loading-shimmer loading-shimmer--title" style={{ width: '40%' }} />
          <div className="loading-shimmer" style={{ width: '60%', height: '28px', margin: '8px 0' }} />
          <div className="loading-shimmer loading-shimmer--short" />
        </div>
      </div>

      {/* 2 Column Content Skeletons */}
      <div className="skeleton-grid-2col">
        <div className="loading-card" style={{ height: '320px' }}>
          <div className="loading-shimmer loading-shimmer--badge" />
          <div className="loading-shimmer loading-shimmer--title" />
          <div className="loading-shimmer loading-shimmer--line" style={{ height: '8px', margin: '16px 0' }} />
          <div className="loading-shimmer loading-shimmer--line" style={{ height: '40px', margin: '10px 0' }} />
          <div className="loading-shimmer loading-shimmer--line" style={{ height: '40px', margin: '10px 0' }} />
          <div className="loading-shimmer loading-shimmer--line" style={{ height: '40px', margin: '10px 0' }} />
        </div>
        <div className="loading-card" style={{ height: '320px' }}>
          <div className="loading-shimmer loading-shimmer--badge" />
          <div className="loading-shimmer loading-shimmer--title" />
          <div className="loading-shimmer loading-shimmer--line" style={{ height: '60px', margin: '16px 0' }} />
          <div className="loading-shimmer loading-shimmer--line" style={{ margin: '8px 0' }} />
          <div className="loading-shimmer loading-shimmer--line" style={{ margin: '8px 0' }} />
          <div className="loading-shimmer loading-shimmer--line" style={{ margin: '8px 0' }} />
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="loading-card" style={{ width: '100%' }}>
      <div className="loading-shimmer loading-shimmer--title" style={{ width: '30%', marginBottom: '20px' }} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="loading-shimmer loading-shimmer--line" style={{ height: '36px', marginBottom: '10px' }} />
      ))}
    </div>
  );
}
