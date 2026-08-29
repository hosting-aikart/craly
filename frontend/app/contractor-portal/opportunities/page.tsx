'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { getOpportunities, type Opportunity } from '@/lib/api/contractorPortal';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import {
  IconTarget,
  IconMapPin,
  IconBuilding,
  IconUsers,
  IconClock,
  IconSearch,
  IconSparkle,
  IconCheck,
  IconAlertCircle,
  IconZap,
  IconArrowRight,
  IconShield,
  IconBriefcase,
} from '@/components/ui/Icons';
import './opportunities.css';

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewTab, setViewTab] = useState<'MATCHED' | 'ALL' | 'APPLIED'>('MATCHED');
  const [filterIndustry, setFilterIndustry] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Sliding tab glider
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [gliderStyle, setGliderStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  useEffect(() => {
    getOpportunities()
      .then((res) => {
        setOpportunities(res.data || []);
        if ((res as any).profile_incomplete) {
          setProfileIncomplete(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const highMatchesCount = useMemo(
    () => opportunities.filter((op) => (op.match_score || 0) >= 70).length,
    [opportunities]
  );

  const appliedCount = useMemo(
    () => opportunities.filter((op) => op.has_applied).length,
    [opportunities]
  );

  const industries = useMemo(
    () => Array.from(new Set(opportunities.map((op) => op.industry).filter(Boolean))) as string[],
    [opportunities]
  );

  useEffect(() => {
    const el = tabRefs.current[viewTab];
    if (el) {
      setGliderStyle({
        left: el.offsetLeft,
        width: el.offsetWidth,
      });
    }
  }, [viewTab, opportunities.length, highMatchesCount, appliedCount]);

  const filtered = useMemo(() => {
    return opportunities.filter((op) => {
      // Tab filter
      if (viewTab === 'MATCHED') {
        if (highMatchesCount > 0 && (op.match_score || 0) < 70) {
          return false;
        }
      } else if (viewTab === 'APPLIED') {
        if (!op.has_applied) {
          return false;
        }
      }

      // Industry filter
      if (filterIndustry !== 'ALL' && op.industry !== filterIndustry) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = op.title.toLowerCase().includes(q);
        const matchesLocation = op.location.toLowerCase().includes(q);
        const matchesIndustry = (op.industry || '').toLowerCase().includes(q);
        const matchesSkills = (op.required_skills || []).some((s) => s.toLowerCase().includes(q));
        const matchesDesc = (op.description || '').toLowerCase().includes(q);

        if (!matchesTitle && !matchesLocation && !matchesIndustry && !matchesSkills && !matchesDesc) {
          return false;
        }
      }

      return true;
    });
  }, [opportunities, viewTab, highMatchesCount, filterIndustry, searchQuery]);

  if (loading) {
    return <LoadingState label="Loading Live Opportunities & Matching Algorithms…" />;
  }

  return (
    <div className="opportunities-page">
      {/* ── Hero Banner ──────────────────────────────────────────────── */}
      <div className="opportunities-hero">
        <div className="opportunities-hero__content">
          <span className="opportunities-hero__badge">
            <IconSparkle size={12} /> Live Manufacturing Demands
          </span>
          <h1>Industrial Opportunities & Tenders</h1>
          <p>
            Discover direct manufacturing workforce tenders matched to your industrial trade specializations,
            registered capacity, and mobilization zones.
          </p>

          <div className="opportunities-hero__highlights">
            <span className="opp-highlight-tag">
              <IconShield size={12} /> Verified Enterprise Tenders
            </span>
            <span className="opp-highlight-tag">
              <IconZap size={12} /> Instant Smart Matching
            </span>
            <span className="opp-highlight-tag">
              <IconBriefcase size={12} /> Direct Manufacturer Access
            </span>
          </div>
        </div>
      </div>

      {/* ── Profile Incomplete Warning ───────────────────────────────── */}
      {profileIncomplete && (
        <div className="opportunities-notice-box">
          <IconAlertCircle size={18} className="opportunities-notice-icon" />
          <div className="opportunities-notice-content">
            <strong>Boost your Match Score:</strong> Complete your company skills, trades, and service coverage
            in your profile to unlock higher priority match rankings and automatic tender alerts.
          </div>
          <Link href="/contractor-portal/profile?tab=coverage" className="opportunities-notice-btn">
            Update Coverage →
          </Link>
        </div>
      )}

      {/* ── 3-Metric Intelligence Row ────────────────────────────────── */}
      <div className="opportunities-metrics-row">
        <div className="opp-metric-card">
          <div className="opp-metric-info">
            <span className="opp-metric-lbl">Total Active Tenders</span>
            <span className="opp-metric-val">{opportunities.length}</span>
            <span className="opp-metric-sub">Published industrial demands</span>
          </div>
          <div className="opp-metric-icon-box">
            <IconTarget size={20} />
          </div>
        </div>

        <div className="opp-metric-card">
          <div className="opp-metric-info">
            <span className="opp-metric-lbl">Smart Matched For You</span>
            <span className="opp-metric-val" style={{ color: '#047857' }}>
              {highMatchesCount}
            </span>
            <span className="opp-metric-sub">
              {highMatchesCount > 0 ? 'High compatibility (≥70%)' : 'General opportunities'}
            </span>
          </div>
          <div className="opp-metric-icon-box" style={{ background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }}>
            <IconSparkle size={20} />
          </div>
        </div>

        <div className="opp-metric-card">
          <div className="opp-metric-info">
            <span className="opp-metric-lbl">Submitted Applications</span>
            <span className="opp-metric-val" style={{ color: '#1d4ed8' }}>
              {appliedCount}
            </span>
            <span className="opp-metric-sub">Active candidate proposals</span>
          </div>
          <div className="opp-metric-icon-box" style={{ background: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe' }}>
            <IconCheck size={20} />
          </div>
        </div>
      </div>

      {/* ── Search & Filter Toolbar ──────────────────────────────────── */}
      <div className="opportunities-control-bar">
        {/* Sliding View Switcher Tabs */}
        <div className="opportunities-view-tabs">
          {gliderStyle.width > 0 && (
            <div
              className="opportunities-view-glider"
              style={{
                left: `${gliderStyle.left}px`,
                width: `${gliderStyle.width}px`,
              }}
            />
          )}
          <button
            ref={(el) => { tabRefs.current['MATCHED'] = el; }}
            type="button"
            className={`opportunities-view-tab ${viewTab === 'MATCHED' ? 'active' : ''}`}
            onClick={() => setViewTab('MATCHED')}
          >
            <IconSparkle size={13} />
            <span>Top Matches</span>
            <span className="opp-tab-counter">{highMatchesCount}</span>
          </button>
          <button
            ref={(el) => { tabRefs.current['ALL'] = el; }}
            type="button"
            className={`opportunities-view-tab ${viewTab === 'ALL' ? 'active' : ''}`}
            onClick={() => setViewTab('ALL')}
          >
            <IconTarget size={13} />
            <span>All Opportunities</span>
            <span className="opp-tab-counter">{opportunities.length}</span>
          </button>
          <button
            ref={(el) => { tabRefs.current['APPLIED'] = el; }}
            type="button"
            className={`opportunities-view-tab ${viewTab === 'APPLIED' ? 'active' : ''}`}
            onClick={() => setViewTab('APPLIED')}
          >
            <IconCheck size={13} />
            <span>Applied</span>
            <span className="opp-tab-counter">{appliedCount}</span>
          </button>
        </div>

        {/* Live Search Input */}
        <div className="opportunities-search-wrap">
          <IconSearch size={14} className="opp-search-icon" />
          <input
            type="text"
            className="opportunities-search-input"
            placeholder="Search by title, skill, city, or trade..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="opp-search-clear"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* ── Industry Quick Pills ─────────────────────────────────────── */}
      {industries.length > 0 && (
        <div className="opportunities-industry-bar">
          <span className="opp-ind-label">Industry:</span>
          <button
            type="button"
            className={`opp-ind-btn ${filterIndustry === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilterIndustry('ALL')}
          >
            All Industries
          </button>
          {industries.map((ind) => (
            <button
              key={ind}
              type="button"
              className={`opp-ind-btn ${filterIndustry === ind ? 'active' : ''}`}
              onClick={() => setFilterIndustry(ind)}
            >
              {ind}
            </button>
          ))}
        </div>
      )}

      {/* ── Opportunities Grid ───────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="opportunities-empty-wrap">
          <EmptyState
            icon={<IconTarget size={32} />}
            title="No Matching Opportunities Found"
            subtitle={
              searchQuery || filterIndustry !== 'ALL' || viewTab !== 'ALL'
                ? 'Try adjusting your filters, search keywords, or tab selection to discover more industrial demands.'
                : 'There are currently no active requirements published. New manufacturing demands are posted daily!'
            }
          />
          {(searchQuery || filterIndustry !== 'ALL' || viewTab !== 'ALL') && (
            <button
              type="button"
              className="opp-reset-filters-btn"
              onClick={() => {
                setSearchQuery('');
                setFilterIndustry('ALL');
                setViewTab('ALL');
              }}
            >
              Reset All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="opportunities-grid">
          {filtered.map((op) => {
            const matchScore = op.match_score || 0;
            const isHighMatch = matchScore >= 70;
            const isMedMatch = matchScore >= 40 && matchScore < 70;

            return (
              <div key={op.id} className="opportunity-card">
                <div>
                  {/* Card Header & Badges */}
                  <div className="opportunity-card__header">
                    <div className="opportunity-card__tags">
                      {op.industry && (
                        <span className="opportunity-tag opportunity-tag--industry">
                          <IconBuilding size={11} /> {op.industry}
                        </span>
                      )}
                      <span className="opportunity-tag opportunity-tag--location">
                        <IconMapPin size={11} /> {op.location}
                      </span>
                    </div>

                    <div className="opportunity-card__top-badges">
                      {op.has_applied ? (
                        <span className="opportunity-applied-badge">
                          <IconCheck size={11} /> Applied ({op.my_application_status || 'SUBMITTED'})
                        </span>
                      ) : matchScore > 0 ? (
                        <span
                          className={`opportunity-match-badge ${
                            isHighMatch
                              ? 'opportunity-match-badge--high'
                              : isMedMatch
                              ? 'opportunity-match-badge--med'
                              : 'opportunity-match-badge--low'
                          }`}
                        >
                          <IconSparkle size={11} /> {matchScore}% Match
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="opportunity-card__title">
                    <Link href={`/contractor-portal/opportunities/${op.id}`}>
                      {op.title}
                    </Link>
                  </h3>

                  {op.description && (
                    <p className="opportunity-card__desc">
                      {op.description.length > 150 ? `${op.description.slice(0, 150)}…` : op.description}
                    </p>
                  )}

                  {/* Match Reasons (if available) */}
                  {op.match_reasons && op.match_reasons.length > 0 && (
                    <div className="opportunity-match-reasons-wrap">
                      {op.match_reasons.slice(0, 3).map((reason, idx) => (
                        <span key={idx} className="opp-match-reason-chip">
                          ✓ {reason}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Operational Parameters Row */}
                  <div className="opportunity-card__params">
                    <div className="opp-param-box">
                      <span className="opp-param-lbl">Workers Needed</span>
                      <strong className="opp-param-val">
                        <IconUsers size={13} className="opp-param-icon" />
                        {op.workers_required} {op.workers_required === 1 ? 'Worker' : 'Workers'}
                      </strong>
                    </div>

                    <div className="opp-param-box">
                      <span className="opp-param-lbl">Start Date</span>
                      <strong className="opp-param-val">
                        <IconClock size={13} className="opp-param-icon" />
                        {new Date(op.start_date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </strong>
                    </div>

                    <div className="opp-param-box">
                      <span className="opp-param-lbl">Duration</span>
                      <strong className="opp-param-val">{op.duration || 'Flexible'}</strong>
                    </div>
                  </div>

                  {/* Trade / Skills Pills */}
                  {op.required_skills && op.required_skills.length > 0 && (
                    <div className="opportunity-card__skills">
                      {op.required_skills.map((skill) => (
                        <span key={skill} className="opportunity-skill-pill">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="opportunity-card__footer">
                  <span className="opportunity-posted-date">
                    Posted: {new Date(op.published_at || op.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <Link
                    href={`/contractor-portal/opportunities/${op.id}`}
                    className={`opportunity-action-btn ${op.has_applied ? 'opportunity-action-btn--applied' : ''}`}
                  >
                    {op.has_applied ? (
                      <>View Proposal <IconArrowRight size={13} /></>
                    ) : (
                      <>View & Apply <IconArrowRight size={13} /></>
                    )}
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
