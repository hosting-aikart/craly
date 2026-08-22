'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getOpportunities, type Opportunity } from '@/lib/api/contractorPortal';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import './opportunities.css';

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterIndustry, setFilterIndustry] = useState('ALL');

  useEffect(() => {
    getOpportunities()
      .then(({ data }) => setOpportunities(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingState label="Loading Opportunities…" />;
  }

  const industries = Array.from(
    new Set(opportunities.map((op) => op.industry).filter(Boolean)),
  ) as string[];

  const filtered = opportunities.filter((op) => {
    if (filterIndustry !== 'ALL' && op.industry !== filterIndustry) return false;
    return true;
  });

  return (
    <div className="opportunities-page">
      <div className="opportunities-header">
        <div>
          <h1 className="opportunities-title">Manpower Opportunities</h1>
          <p className="opportunities-subtitle">
            Browse published requirements from verified manufacturers and apply directly.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      {industries.length > 0 && (
        <div className="opportunities-filters">
          <span className="opportunities-filter-lbl">Filter Industry:</span>
          <button
            type="button"
            className={`opportunities-filter-btn ${filterIndustry === 'ALL' ? 'opportunities-filter-btn--active' : ''}`}
            onClick={() => setFilterIndustry('ALL')}
          >
            All ({opportunities.length})
          </button>
          {industries.map((ind) => (
            <button
              key={ind}
              type="button"
              className={`opportunities-filter-btn ${filterIndustry === ind ? 'opportunities-filter-btn--active' : ''}`}
              onClick={() => setFilterIndustry(ind)}
            >
              {ind}
            </button>
          ))}
        </div>
      )}

      {/* Opportunities List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="No Published Opportunities Available"
          subtitle="There are currently no active manpower requirements published. Check back soon!"
        />
      ) : (
        <div className="opportunities-list">
          {filtered.map((op) => (
            <div key={op.id} className="opportunity-card">
              <div className="opportunity-card__header">
                <div>
                  <div className="opportunity-card__tags">
                    {op.industry && <span className="opportunity-tag opportunity-tag--industry">{op.industry}</span>}
                    <span className="opportunity-tag opportunity-tag--location">📍 {op.location}</span>
                  </div>
                  <h3 className="opportunity-card__title">{op.title}</h3>
                </div>
                {op.has_applied && (
                  <span className="opportunity-applied-badge">
                    ✓ Applied ({op.my_application_status || 'SUBMITTED'})
                  </span>
                )}
              </div>

              {op.description && (
                <p className="opportunity-card__desc">
                  {op.description.length > 160 ? `${op.description.slice(0, 160)}…` : op.description}
                </p>
              )}

              <div className="opportunity-card__details">
                <div className="opportunity-detail-item">
                  <span className="opportunity-detail-lbl">Workers Needed</span>
                  <strong className="opportunity-detail-val">{op.workers_required} Workers</strong>
                </div>
                <div className="opportunity-detail-item">
                  <span className="opportunity-detail-lbl">Start Date</span>
                  <strong className="opportunity-detail-val">{new Date(op.start_date).toLocaleDateString()}</strong>
                </div>
                <div className="opportunity-detail-item">
                  <span className="opportunity-detail-lbl">Duration</span>
                  <strong className="opportunity-detail-val">{op.duration}</strong>
                </div>
              </div>

              {op.required_skills && op.required_skills.length > 0 && (
                <div className="opportunity-card__skills">
                  {op.required_skills.map((skill) => (
                    <span key={skill} className="opportunity-skill-pill">
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              <div className="opportunity-card__footer">
                <span className="opportunity-posted-date">
                  Posted: {new Date(op.published_at || op.created_at).toLocaleDateString()}
                </span>
                <Link href={`/contractor-portal/opportunities/${op.id}`} className="opportunity-view-btn">
                  View Opportunity →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
