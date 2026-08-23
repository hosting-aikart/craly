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
  const [viewTab, setViewTab] = useState<'MATCHED' | 'ALL'>('MATCHED');
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

  const highMatchesCount = opportunities.filter((op) => (op.match_score || 0) >= 70).length;

  const industries = Array.from(
    new Set(opportunities.map((op) => op.industry).filter(Boolean)),
  ) as string[];

  const filtered = opportunities.filter((op) => {
    if (viewTab === 'MATCHED' && (op.match_score || 0) < 70 && highMatchesCount > 0) {
      return false;
    }
    if (filterIndustry !== 'ALL' && op.industry !== filterIndustry) {
      return false;
    }
    return true;
  });

  return (
    <div className="opportunities-page">
      <div className="opportunities-header">
        <div>
          <h1 className="opportunities-title">Personalized Manpower Opportunities</h1>
          <p className="opportunities-subtitle">
            Requirements from verified manufacturers matched to your location, workforce size, and experience.
          </p>
        </div>
      </div>

      {/* Top View Tabs (Personalized Matches vs All) */}
      <div className="opportunities-top-toolbar">
        <div className="opportunities-view-tabs">
          <button
            type="button"
            className={`opportunities-view-tab ${viewTab === 'MATCHED' ? 'opportunities-view-tab--active' : ''}`}
            onClick={() => setViewTab('MATCHED')}
          >
            <span>🎯 Best Matches For You</span>
            {highMatchesCount > 0 && (
              <span className="opportunities-match-count">{highMatchesCount}</span>
            )}
          </button>
          <button
            type="button"
            className={`opportunities-view-tab ${viewTab === 'ALL' ? 'opportunities-view-tab--active' : ''}`}
            onClick={() => setViewTab('ALL')}
          >
            <span>All Opportunities</span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>({opportunities.length})</span>
          </button>
        </div>

        {/* Filter Industry pills */}
        {industries.length > 0 && (
          <div className="opportunities-filters" style={{ margin: 0 }}>
            <span className="opportunities-filter-lbl">Industry:</span>
            <button
              type="button"
              className={`opportunities-filter-btn ${filterIndustry === 'ALL' ? 'opportunities-filter-btn--active' : ''}`}
              onClick={() => setFilterIndustry('ALL')}
            >
              All
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
      </div>

      {/* Opportunities List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="🎯"
          title={viewTab === 'MATCHED' ? 'No High Matches Currently' : 'No Opportunities Available'}
          subtitle={
            viewTab === 'MATCHED'
              ? 'Try clicking "All Opportunities" to view all available requirements, or update your company profile to improve matching.'
              : 'There are currently no active manpower requirements published. Check back soon!'
          }
        />
      ) : (
        <div className="opportunities-list">
          {filtered.map((op) => {
            const matchScore = op.match_score || 70;
            const matchBadgeClass =
              matchScore >= 75
                ? 'opportunity-match-badge--high'
                : matchScore >= 55
                ? 'opportunity-match-badge--medium'
                : 'opportunity-match-badge--low';

            return (
              <div key={op.id} className="opportunity-card">
                <div className="opportunity-card__header">
                  <div>
                    <div className="opportunity-card__tags">
                      {op.industry && <span className="opportunity-tag opportunity-tag--industry">{op.industry}</span>}
                      <span className="opportunity-tag opportunity-tag--location">📍 {op.location}</span>
                    </div>
                    <h3 className="opportunity-card__title">{op.title}</h3>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {op.has_applied ? (
                      <span className="opportunity-applied-badge">
                        ✓ Applied ({op.my_application_status || 'SUBMITTED'})
                      </span>
                    ) : (
                      <div className={`opportunity-match-badge ${matchBadgeClass}`}>
                        {matchScore >= 75 ? '🎯' : '✨'} {matchScore}% Match
                      </div>
                    )}
                  </div>
                </div>

                {/* Match Reasons Breakdown Box */}
                {op.match_reasons && op.match_reasons.length > 0 && (
                  <div className="opportunity-match-reasons-box">
                    <span className="opportunity-match-reasons-title">
                      🎯 Why this matches your company profile:
                    </span>
                    <div className="opportunity-match-reasons-list">
                      {op.match_reasons.map((reason, idx) => (
                        <span key={idx} className="opportunity-match-reason-item">
                          ✓ {reason}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

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
                    {op.has_applied ? 'View Application →' : 'View & Apply →'}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
