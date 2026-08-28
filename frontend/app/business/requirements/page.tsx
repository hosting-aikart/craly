'use client';

import React, { useEffect, useState } from 'react';
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

  const hasRequirements = requirements.length > 0;

  return (
    <div className="reqs-page">
      <WorkspacePageHeader
        title="Manpower Requirements"
        subtitle="Post your workforce needs and track contractor applications in real time."
      />

      {/* Top Controls Bar */}
      <div className="reqs-header-bar">
        {/* Status Filter Tabs */}
        <div className="reqs-filter-bar">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveStatus(tab.value)}
              className={`reqs-tab-btn ${activeStatus === tab.value ? 'reqs-tab-btn--active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Top-Right Create Requirement Button: ONLY shown when requirements exist */}
        {!loading && hasRequirements && (
          <Button
            variant="primary"
            onClick={() => router.push('/business/requirements/new')}
            className="reqs-create-top-btn"
          >
            <IconPlus size={16} />
            Create Requirement
          </Button>
        )}
      </div>

      {/* Content Area */}
      {loading ? (
        <LoadingState label="Loading manpower requirements…" />
      ) : error ? (
        <div className="reqs-error-banner">
          <p>{error}</p>
          <button type="button" onClick={() => fetchRequirements(activeStatus)} className="reqs-retry-btn">
            Retry
          </button>
        </div>
      ) : !hasRequirements ? (
        <EmptyState
          title="No requirements found"
          subtitle={
            activeStatus
              ? `You have no requirements currently under '${STATUS_TABS.find((t) => t.value === activeStatus)?.label}'.`
              : 'Create your first workforce requirement to start receiving matched proposals from verified contractors.'
          }
          action={
            <Button variant="primary" onClick={() => router.push('/business/requirements/new')}>
              + Create Requirement
            </Button>
          }
        />
      ) : (
        <div className="reqs-list">
          {requirements.map((req) => (
            <div key={req.id} className="reqs-card">
              {/* Card Header: Title & Status Badge */}
              <div className="reqs-card__header">
                <div>
                  <h3 className="reqs-card__title">
                    <Link href={`/business/requirements/${req.id}`}>
                      {req.title}
                    </Link>
                  </h3>
                  {/* Essential Info Row */}
                  <div className="reqs-card__meta-row">
                    <span className="reqs-card__meta-item">
                      <IconMapPin size={14} />
                      {req.location}
                    </span>
                    <span className="reqs-card__meta-item">
                      <IconUsers size={14} />
                      <strong>{req.workers_required} Workers</strong>
                    </span>
                    <span className="reqs-card__meta-item">
                      <IconClock size={14} />
                      Starts {new Date(req.start_date).toLocaleDateString()}
                    </span>
                    {req.industry && (
                      <span className="reqs-card__meta-item">
                        <IconBuilding size={14} />
                        {req.industry}
                      </span>
                    )}

                  </div>
                </div>

                <span className={`reqs-badge ${getStatusBadgeClass(req.status)}`}>
                  {getStatusBadgeLabel(req.status)}
                </span>
              </div>

              {/* Skills Tags (Only top 3 for clean view) */}
              {req.required_skills && req.required_skills.length > 0 && (
                <div className="reqs-skills">
                  {req.required_skills.slice(0, 4).map((skill, idx) => (
                    <span key={idx} className="reqs-skill-pill">
                      {skill}
                    </span>
                  ))}
                  {req.required_skills.length > 4 && (
                    <span className="reqs-skill-pill reqs-skill-pill--more">
                      +{req.required_skills.length - 4} more
                    </span>
                  )}
                </div>
              )}

              {/* Card Footer: Proposals count and Clean Action Buttons */}
              <div className="reqs-card__footer">
                <span className="reqs-app-count">
                  <IconApplications size={15} />
                  <strong>{req.applications_count || 0}</strong> {req.applications_count === 1 ? 'Proposal' : 'Proposals'} Received
                </span>

                <div className="reqs-actions">
                  {req.status === 'DRAFT' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handlePublishDraft(req.id)}
                        disabled={actionId === req.id}
                        className="reqs-btn-action reqs-btn-action--publish"
                      >
                        {actionId === req.id ? 'Publishing…' : 'Publish Now'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteDraft(req.id)}
                        disabled={actionId === req.id}
                        className="reqs-btn-action reqs-btn-action--delete"
                      >
                        Delete Draft
                      </button>
                    </>
                  )}

                  <Link
                    href={`/business/requirements/${req.id}`}
                    className="reqs-btn-action reqs-btn-action--outline"
                  >
                    View Details
                  </Link>

                  <Link
                    href={`/business/requirements/${req.id}/applications`}
                    className="reqs-btn-action reqs-btn-action--primary"
                  >
                    Review Proposals ({req.applications_count || 0})
                    <IconArrowRight size={14} />
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
