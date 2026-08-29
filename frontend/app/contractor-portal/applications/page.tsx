'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { getMyApplications, type ApplicationItem } from '@/lib/api/contractorPortal';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import {
  IconClipboard,
  IconMapPin,
  IconBuilding,
  IconUsers,
  IconClock,
  IconSearch,
  IconSparkle,
  IconCheck,
  IconAlertCircle,
  IconArrowRight,
  IconShield,
  IconZap,
} from '@/components/ui/Icons';
import './applications.css';

export default function MyApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SELECTED' | 'ARCHIVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Sliding tab glider
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [gliderStyle, setGliderStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  useEffect(() => {
    getMyApplications()
      .then(({ data }) => setApplications(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Stats
  const selectedCount = useMemo(
    () => applications.filter((a) => a.application_status === 'SELECTED').length,
    [applications]
  );

  const shortlistedCount = useMemo(
    () => applications.filter((a) => a.application_status === 'SHORTLISTED' || a.application_status === 'SELECTED').length,
    [applications]
  );

  const underReviewCount = useMemo(
    () => applications.filter((a) => a.application_status === 'UNDER_REVIEW' || a.application_status === 'SUBMITTED').length,
    [applications]
  );

  const archivedCount = useMemo(
    () => applications.filter((a) => a.application_status === 'REJECTED' || a.application_status === 'CLOSED').length,
    [applications]
  );

  useEffect(() => {
    const el = tabRefs.current[statusFilter];
    if (el) {
      setGliderStyle({
        left: el.offsetLeft,
        width: el.offsetWidth,
      });
    }
  }, [statusFilter, applications.length, shortlistedCount, underReviewCount, archivedCount]);

  const filtered = useMemo(() => {
    return applications.filter((app) => {
      // Status filter
      if (statusFilter === 'ACTIVE') {
        if (app.application_status !== 'SUBMITTED' && app.application_status !== 'UNDER_REVIEW') {
          return false;
        }
      } else if (statusFilter === 'SELECTED') {
        if (app.application_status !== 'SHORTLISTED' && app.application_status !== 'SELECTED') {
          return false;
        }
      } else if (statusFilter === 'ARCHIVED') {
        if (app.application_status !== 'REJECTED' && app.application_status !== 'CLOSED') {
          return false;
        }
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (app.requirement_title || '').toLowerCase().includes(q);
        const matchesLocation = (app.requirement_location || '').toLowerCase().includes(q);
        const matchesIndustry = (app.requirement_industry || '').toLowerCase().includes(q);
        const matchesMsg = (app.message || '').toLowerCase().includes(q);

        if (!matchesTitle && !matchesLocation && !matchesIndustry && !matchesMsg) {
          return false;
        }
      }

      return true;
    });
  }, [applications, statusFilter, searchQuery]);

  if (loading) {
    return <LoadingState label="Loading Submitted Applications & Proposals…" />;
  }

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    switch (s) {
      case 'SELECTED':
        return { label: 'SELECTED & ENGAGED', cls: 'app-status--selected', dotCls: 'app-dot--green' };
      case 'SHORTLISTED':
        return { label: 'SHORTLISTED', cls: 'app-status--shortlisted', dotCls: 'app-dot--indigo' };
      case 'UNDER_REVIEW':
        return { label: 'UNDER CLIENT REVIEW', cls: 'app-status--review', dotCls: 'app-dot--amber' };
      case 'REJECTED':
        return { label: 'NOT SELECTED', cls: 'app-status--rejected', dotCls: 'app-dot--red' };
      case 'CLOSED':
        return { label: 'POSITION CLOSED', cls: 'app-status--closed', dotCls: 'app-dot--slate' };
      default:
        return { label: 'SUBMITTED', cls: 'app-status--submitted', dotCls: 'app-dot--blue' };
    }
  };

  return (
    <div className="applications-page">
      {/* ── Hero Banner ──────────────────────────────────────────────── */}
      <div className="applications-hero">
        <div className="applications-hero__content">
          <span className="applications-hero__badge">
            <IconClipboard size={12} /> Candidate Proposals & Tenders
          </span>
          <h1>My Submitted Applications</h1>
          <p>
            Track proposal review statuses, client feedback, committed workforce deployment schedules,
            and shortlisted manufacturing engagements.
          </p>

          <div className="applications-hero__highlights">
            <span className="app-highlight-tag">
              <IconShield size={12} /> Direct Client Review
            </span>
            <span className="app-highlight-tag">
              <IconZap size={12} /> Real-time Status Sync
            </span>
            <span className="app-highlight-tag">
              <IconCheck size={12} /> Milestone Payment Escrow
            </span>
          </div>
        </div>
      </div>

      {/* ── 3-Metric Intelligence Row ────────────────────────────────── */}
      <div className="applications-metrics-row">
        <div className="app-metric-card">
          <div className="app-metric-info">
            <span className="app-metric-lbl">Total Proposals</span>
            <span className="app-metric-val">{applications.length}</span>
            <span className="app-metric-sub">Submitted candidate bids</span>
          </div>
          <div className="app-metric-icon-box">
            <IconClipboard size={20} />
          </div>
        </div>

        <div className="app-metric-card">
          <div className="app-metric-info">
            <span className="app-metric-lbl">Under Client Review</span>
            <span className="app-metric-val" style={{ color: '#b45309' }}>
              {underReviewCount}
            </span>
            <span className="app-metric-sub">In operations assessment</span>
          </div>
          <div className="app-metric-icon-box" style={{ background: '#fffbeb', color: '#d97706', borderColor: '#fde68a' }}>
            <IconClock size={20} />
          </div>
        </div>

        <div className="app-metric-card">
          <div className="app-metric-info">
            <span className="app-metric-lbl">Shortlisted & Selected</span>
            <span className="app-metric-val" style={{ color: '#047857' }}>
              {shortlistedCount}
            </span>
            <span className="app-metric-sub">
              {selectedCount > 0 ? `${selectedCount} project contracts confirmed` : 'Approved for final selection'}
            </span>
          </div>
          <div className="app-metric-icon-box" style={{ background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }}>
            <IconSparkle size={20} />
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ──────────────────────────────────── */}
      <div className="applications-control-bar">
        {/* Sliding Status Switcher Tabs */}
        <div className="applications-view-tabs">
          {gliderStyle.width > 0 && (
            <div
              className="applications-view-glider"
              style={{
                left: `${gliderStyle.left}px`,
                width: `${gliderStyle.width}px`,
              }}
            />
          )}
          <button
            ref={(el) => { tabRefs.current['ALL'] = el; }}
            type="button"
            className={`applications-view-tab ${statusFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            <span>All Proposals</span>
            <span className="app-tab-counter">{applications.length}</span>
          </button>
          <button
            ref={(el) => { tabRefs.current['SELECTED'] = el; }}
            type="button"
            className={`applications-view-tab ${statusFilter === 'SELECTED' ? 'active' : ''}`}
            onClick={() => setStatusFilter('SELECTED')}
          >
            <IconSparkle size={13} />
            <span>Shortlisted / Won</span>
            <span className="app-tab-counter">{shortlistedCount}</span>
          </button>
          <button
            ref={(el) => { tabRefs.current['ACTIVE'] = el; }}
            type="button"
            className={`applications-view-tab ${statusFilter === 'ACTIVE' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ACTIVE')}
          >
            <IconClock size={13} />
            <span>Under Review</span>
            <span className="app-tab-counter">{underReviewCount}</span>
          </button>
          <button
            ref={(el) => { tabRefs.current['ARCHIVED'] = el; }}
            type="button"
            className={`applications-view-tab ${statusFilter === 'ARCHIVED' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ARCHIVED')}
          >
            <span>Archived</span>
            <span className="app-tab-counter">{archivedCount}</span>
          </button>
        </div>

        {/* Live Search Box */}
        <div className="applications-search-wrap">
          <IconSearch size={14} className="app-search-icon" />
          <input
            type="text"
            className="applications-search-input"
            placeholder="Search proposals by title or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="app-search-clear"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* ── Applications Grid ─────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="applications-empty-wrap">
          <EmptyState
            icon={<IconClipboard size={32} />}
            title={applications.length === 0 ? 'No Submitted Applications Yet' : 'No Matching Proposals Found'}
            subtitle={
              applications.length === 0
                ? "You haven't submitted proposals for any manpower tenders yet. Explore open manufacturer requirements to get matched."
                : 'Try adjusting your status filter or search keyword to locate your proposal.'
            }
          />
          {applications.length === 0 ? (
            <Link href="/contractor-portal/opportunities" className="app-primary-cta-btn">
              Browse Open Opportunities →
            </Link>
          ) : (
            <button
              type="button"
              className="app-reset-filters-btn"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="applications-grid">
          {filtered.map((app) => {
            const badge = getStatusBadge(app.application_status);

            return (
              <div key={app.id} className="application-card">
                <div>
                  {/* Card Header */}
                  <div className="application-card__top">
                    <div className="application-card__tags">
                      {app.requirement_industry && (
                        <span className="app-tag app-tag--industry">
                          <IconBuilding size={11} /> {app.requirement_industry}
                        </span>
                      )}
                      <span className="app-tag app-tag--location">
                        <IconMapPin size={11} /> {app.requirement_location}
                      </span>
                    </div>

                    <span className={`application-card__status ${badge.cls}`}>
                      <span className={`app-status-dot ${badge.dotCls}`} />
                      {badge.label}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="application-card__title">
                    <Link href={`/contractor-portal/applications/${app.id}`}>
                      {app.requirement_title}
                    </Link>
                  </h3>

                  {/* Message snippet if any */}
                  {app.message && (
                    <p className="application-card__msg">
                      &ldquo;{app.message.length > 120 ? `${app.message.slice(0, 120)}…` : app.message}&rdquo;
                    </p>
                  )}

                  {/* Parameters Matrix */}
                  <div className="application-card__info-grid">
                    <div className="app-info-item">
                      <span className="app-info-lbl">Committed Workforce</span>
                      <strong className="app-info-val">
                        <IconUsers size={13} className="app-info-icon" />
                        {app.proposed_workforce} Workers
                      </strong>
                    </div>

                    <div className="app-info-item">
                      <span className="app-info-lbl">Earliest Availability</span>
                      <strong className="app-info-val">
                        <IconClock size={13} className="app-info-icon" />
                        {new Date(app.availability_date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </strong>
                    </div>

                    <div className="app-info-item">
                      <span className="app-info-lbl">Proposed Commercials</span>
                      <strong className="app-info-val">
                        {app.proposed_rate ? `₹${app.proposed_rate}/day` : 'Standard Tender'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="application-card__footer">
                  <span className="app-submitted-date">
                    Submitted: {new Date(app.submitted_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>

                  <Link
                    href={`/contractor-portal/applications/${app.id}`}
                    className="application-action-btn"
                  >
                    View Proposal Details <IconArrowRight size={13} />
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
