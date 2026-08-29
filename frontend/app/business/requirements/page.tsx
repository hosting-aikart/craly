'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import {
  getBusinessRequirements,
  publishBusinessRequirement,
  deleteBusinessRequirement,
  type RequirementItem,
} from '@/lib/api/businessPortal';
import LoadingState from '@/components/ui/LoadingState';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import {
  IconMapPin,
  IconUsers,
  IconClock,
  IconArrowRight,
  IconApplications,
  IconBuilding,
  IconPlus,
  IconSearch,
  IconBriefcase,
  IconTarget,
  IconRupee,
  IconCalendar,
  IconShield,
  IconCheck,
  IconAlertTriangle,
} from '@/components/ui/Icons';
import './requirements.css';

const STATUS_TABS = [
  { label: 'All Requirements', value: '' },
  { label: 'Published', value: 'PUBLISHED' },
  { label: 'Drafts', value: 'DRAFT' },
  { label: 'Selected', value: 'SELECTED' },
  { label: 'Closed', value: 'CLOSED' },
];

export default function BusinessRequirementsListPage() {
  const router = useRouter();
  const [requirements, setRequirements] = useState<RequirementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchRequirements = (statusFilter: string) => {
    setLoading(true);
    getBusinessRequirements(statusFilter)
      .then(({ data }) => setRequirements(Array.isArray(data) ? data : []))
      .catch((err) => {
        setError(err.message || 'Failed to fetch requirements');
        setRequirements([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequirements(activeStatus);
  }, [activeStatus]);

  const handlePublishDraft = async (id: string) => {
    setActionId(id);
    try {
      await publishBusinessRequirement(id);
      fetchRequirements(activeStatus);
    } catch (err: any) {
      setError(err.message || 'Failed to publish requirement');
    } finally {
      setActionId(null);
    }
  };

  const handleDeleteDraft = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this draft requirement?')) return;
    setActionId(id);
    try {
      await deleteBusinessRequirement(id);
      setRequirements((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete draft');
    } finally {
      setActionId(null);
    }
  };

  // Filtered by Search Query
  const filteredRequirements = useMemo(() => {
    if (!searchQuery.trim()) return requirements;
    const q = searchQuery.toLowerCase();
    return requirements.filter((r) => {
      const titleMatch = r.title.toLowerCase().includes(q);
      const locMatch = (r.location || '').toLowerCase().includes(q) || (r.city || '').toLowerCase().includes(q);
      const indMatch = (r.industry || '').toLowerCase().includes(q);
      const skillsMatch = Array.isArray(r.required_skills)
        ? r.required_skills.some((s) => s.toLowerCase().includes(q))
        : false;
      return titleMatch || locMatch || indMatch || skillsMatch;
    });
  }, [requirements, searchQuery]);

  // Metric Intelligence calculations
  const totalCount = requirements.length;
  const publishedCount = requirements.filter((r) => r.status === 'PUBLISHED').length;
  const totalApplicationsCount = requirements.reduce((acc, r) => acc + (r.applications_count || 0), 0);

  const getStatusBadgeClass = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'PUBLISHED') return 'reqs-badge--published';
    if (s === 'SELECTED') return 'reqs-badge--selected';
    if (s === 'CLOSED') return 'reqs-badge--closed';
    return 'reqs-badge--draft';
  };

  const getStatusBadgeLabel = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'PUBLISHED') return 'Published';
    if (s === 'SELECTED') return 'Contractor Selected';
    if (s === 'CLOSED') return 'Closed';
    return 'Draft';
  };

  const activeTabIndex = STATUS_TABS.findIndex((t) => t.value === activeStatus);

  return (
    <div className="reqs-page">
      {/* ── Hero Banner & Intelligence Header ────────────────────────── */}
      <div className="reqs-hero-banner">
        <div className="reqs-hero-top">
          <div className="reqs-hero-text">
            <span className="reqs-hero-badge">
              <IconBriefcase size={12} /> Enterprise Manpower Management
            </span>
            <h1>Manpower Requirements & Tenders</h1>
            <p>
              Post your workforce requirements, receive matching bids from verified industrial contractors,
              and manage proposals in real-time.
            </p>
          </div>

          <Link href="/business/requirements/new" className="reqs-hero-create-btn">
            <IconPlus size={16} /> Create Requirement
          </Link>
        </div>

        {/* 3-Metric Intelligence Row */}
        <div className="reqs-metrics-row">
          <div className="reqs-metric-card">
            <span className="reqs-metric-label">Total Requirements</span>
            <strong className="reqs-metric-val">{totalCount}</strong>
          </div>
          <div className="reqs-metric-card">
            <span className="reqs-metric-label">Active Published Tenders</span>
            <strong className="reqs-metric-val">{publishedCount}</strong>
          </div>
          <div className="reqs-metric-card">
            <span className="reqs-metric-label">Total Proposals Received</span>
            <strong className="reqs-metric-val reqs-metric-val--teal">{totalApplicationsCount}</strong>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ─────────────────────────────────── */}
      <div className="reqs-controls-bar">
        {/* Instant Search Field */}
        <div className="reqs-search-box">
          <IconSearch size={15} className="reqs-search-icon" />
          <input
            type="text"
            className="reqs-search-input"
            placeholder="Search requirements by trade, city, skills, or industry..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="reqs-search-clear"
              onClick={() => setSearchQuery('')}
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Tabs Bar */}
        <div className="reqs-tabs-container">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveStatus(tab.value)}
              className={`reqs-tab-item ${activeStatus === tab.value ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content Grid ─────────────────────────────────────────────── */}
      {loading ? (
        <LoadingState label="Loading manpower requirements…" />
      ) : error ? (
        <div className="reqs-error-banner">
          <IconAlertTriangle size={18} />
          <p>{error}</p>
          <button type="button" onClick={() => fetchRequirements(activeStatus)} className="reqs-retry-btn">
            Retry
          </button>
        </div>
      ) : filteredRequirements.length === 0 ? (
        <EmptyState
          title={searchQuery ? 'No matching requirements' : 'No requirements found'}
          subtitle={
            searchQuery
              ? `No requirements match "${searchQuery}". Try a different keyword.`
              : activeStatus
              ? `You have no requirements currently under '${STATUS_TABS.find((t) => t.value === activeStatus)?.label}'.`
              : 'Create your first workforce requirement to start receiving matched proposals from verified contractors.'
          }
          action={
            <Link href="/business/requirements/new" className="reqs-empty-create-btn">
              <IconPlus size={15} /> Create Requirement
            </Link>
          }
        />
      ) : (
        <div className="reqs-cards-grid">
          {filteredRequirements.map((req) => (
            <div key={req.id} className="reqs-grid-card">
              {/* Card Top: Badges & Title */}
              <div className="reqs-card-top">
                <div className="reqs-badge-row">
                  <span className={`reqs-status-badge ${getStatusBadgeClass(req.status)}`}>
                    <span className="reqs-status-dot" />
                    {getStatusBadgeLabel(req.status)}
                  </span>

                  {req.industry && (
                    <span className="reqs-industry-tag">
                      <IconBuilding size={11} /> {req.industry}
                    </span>
                  )}
                </div>

                <h3 className="reqs-card-title">
                  <Link href={`/business/requirements/${req.id}`}>
                    {req.title}
                  </Link>
                </h3>

                <div className="reqs-location-row">
                  <IconMapPin size={13} className="reqs-loc-icon" />
                  <span>{req.city ? `${req.city}, ${req.state || ''}` : req.location}</span>
                </div>
              </div>

              {/* Parameter Matrix: 4 Metrics Grid */}
              <div className="reqs-matrix-grid">
                <div className="reqs-matrix-cell">
                  <span className="reqs-matrix-label">Headcount</span>
                  <strong className="reqs-matrix-val">
                    <IconUsers size={14} /> {req.workers_required}
                  </strong>
                </div>

                <div className="reqs-matrix-cell">
                  <span className="reqs-matrix-label">Starts</span>
                  <span className="reqs-matrix-val">
                    <IconCalendar size={14} /> {new Date(req.start_date).toLocaleDateString()}
                  </span>
                </div>

                <div className="reqs-matrix-cell">
                  <span className="reqs-matrix-label">Duration</span>
                  <span className="reqs-matrix-val">
                    <IconClock size={14} /> {req.duration || 'Flexible'}
                  </span>
                </div>

                <div className="reqs-matrix-cell">
                  <span className="reqs-matrix-label">Daily Budget</span>
                  <span className="reqs-matrix-val reqs-matrix-val--budget">
                    <IconRupee size={13} /> {req.budget_min || req.budget_max ? `₹${Math.round(Number(req.budget_min || 0))}-${Math.round(Number(req.budget_max || 0))}` : 'Negotiable'}
                  </span>
                </div>
              </div>

              {/* Skills Pills */}
              {req.required_skills && req.required_skills.length > 0 && (
                <div className="reqs-skills-row">
                  {req.required_skills.slice(0, 3).map((skill, idx) => (
                    <span key={idx} className="reqs-skill-chip">
                      {skill}
                    </span>
                  ))}
                  {req.required_skills.length > 3 && (
                    <span className="reqs-skill-chip reqs-skill-chip--more">
                      +{req.required_skills.length - 3} more
                    </span>
                  )}
                </div>
              )}

              {/* Card Footer: Proposal count and Action Buttons */}
              <div className="reqs-card-bottom">
                <div className="reqs-proposals-pill">
                  <IconApplications size={14} />
                  <span>
                    <strong>{req.applications_count || 0}</strong> {req.applications_count === 1 ? 'Proposal' : 'Proposals'}
                  </span>
                </div>

                <div className="reqs-actions-group">
                  {req.status === 'DRAFT' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handlePublishDraft(req.id)}
                        disabled={actionId === req.id}
                        className="reqs-btn reqs-btn--publish"
                      >
                        {actionId === req.id ? 'Publishing…' : 'Publish'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteDraft(req.id)}
                        disabled={actionId === req.id}
                        className="reqs-btn reqs-btn--delete"
                      >
                        Delete
                      </button>
                    </>
                  )}

                  <Link
                    href={`/business/requirements/${req.id}`}
                    className="reqs-btn reqs-btn--detail"
                  >
                    Details
                  </Link>

                  <Link
                    href={`/business/requirements/${req.id}/applications`}
                    className="reqs-btn reqs-btn--primary"
                  >
                    Proposals ({req.applications_count || 0}) <IconArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
