'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import {
  getBusinessRequirementById,
  publishBusinessRequirement,
  deleteBusinessRequirement,
  type RequirementItem,
} from '@/lib/api/businessPortal';
import LoadingState from '@/components/ui/LoadingState';
import {
  IconUsers,
  IconMapPin,
  IconCalendar,
  IconRupee,
  IconBriefcase,
  IconTarget,
  IconTools,
  IconClock,
  IconShield,
  IconArrowLeft,
  IconCheck,
  IconAlertTriangle,
  IconBuilding,
  IconApplications,
} from '@/components/ui/Icons';
import './requirement-detail.css';

export default function RequirementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [requirement, setRequirement] = useState<RequirementItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchRequirement = () => {
    setLoading(true);
    getBusinessRequirementById(id)
      .then(({ data }) => setRequirement(data))
      .catch((err) => setError(err.message || 'Failed to load requirement details'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequirement();
  }, [id]);

  const handlePublish = async () => {
    setPublishing(true);
    setError('');
    try {
      const res = await publishBusinessRequirement(id);
      setSuccessMsg(res.message || 'Requirement published successfully!');
      fetchRequirement();
    } catch (err: any) {
      setError(err.message || 'Failed to publish requirement');
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this draft requirement?')) return;
    setDeleting(true);
    setError('');
    try {
      await deleteBusinessRequirement(id);
      router.push('/business/requirements');
    } catch (err: any) {
      setError(err.message || 'Failed to delete requirement');
      setDeleting(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading requirement details…" />;
  }

  if (error || !requirement) {
    return (
      <div className="req-detail-page">
        <div style={{ padding: '24px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '14px', fontWeight: 600 }}>
          ⚠️ {error || 'Requirement not found'}
        </div>
      </div>
    );
  }

  const isDraft = requirement.status === 'DRAFT';

  return (
    <div className="req-detail-page">
      {/* ── Top-Right Back Navigation ───────────────────────────────── */}
      <div className="req-breadcrumb-bar">
        <Link href="/business/requirements" className="req-back-link">
          <IconArrowLeft size={13} /> Back to Requirements
        </Link>
      </div>

      {successMsg && (
        <div style={{ padding: '14px 20px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', borderRadius: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconCheck size={16} /> {successMsg}
        </div>
      )}

      {/* ── Hero Banner Card ─────────────────────────────────────────── */}
      <div className="req-detail-hero">
        <div className="req-detail-hero-left">
          <div className="req-detail-badge-row">
            <span className={`req-status-pill req-status-pill--${requirement.status.toLowerCase()}`}>
              <span className="req-status-dot" />
              {requirement.status.replace('_', ' ')}
            </span>
            <span className="req-id-pill">ID: {requirement.id.slice(0, 8)}</span>
          </div>

          <h1 className="req-detail-title">{requirement.title}</h1>

          <div className="req-detail-meta-row">
            {requirement.industry && (
              <span className="req-meta-item">
                <IconBuilding size={14} /> {requirement.industry}
              </span>
            )}
            <span className="req-meta-item">
              <IconMapPin size={14} /> {requirement.location}
            </span>
            <span className="req-meta-item">
              <IconCalendar size={14} /> Starts {new Date(requirement.start_date).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Lower-Right Action Controls */}
        <div className="req-detail-hero-actions">
          {isDraft && (
            <>
              <button
                type="button"
                className="req-hero-btn req-hero-btn--primary"
                onClick={handlePublish}
                disabled={publishing || deleting}
              >
                {publishing ? 'Publishing…' : 'Publish Requirement →'}
              </button>

              <button
                type="button"
                className="req-hero-btn req-hero-btn--delete"
                onClick={handleDelete}
                disabled={publishing || deleting}
              >
                {deleting ? 'Deleting…' : 'Delete Draft'}
              </button>
            </>
          )}

          <Link
            href={`/business/requirements/${requirement.id}/applications`}
            className="req-hero-btn req-hero-btn--view-apps"
          >
            <IconApplications size={15} /> View Proposals ({requirement.applications_count || 0}) →
          </Link>
        </div>
      </div>

      {/* ── Structured Cards Section ─────────────────────────────────── */}
      <div className="req-cards-container">
        {/* Card 1: Key Commercial & Operational Parameters */}
        <div className="req-card">
          <div className="req-card-header">
            <div className="req-card-icon-box req-card-icon-box--teal">
              <IconTarget size={18} />
            </div>
            <div>
              <h3 className="req-card-title">Key Commercial & Deployment Parameters</h3>
              <p className="req-card-subtitle">Operational requirements for contractor workforce dispatch</p>
            </div>
          </div>

          <div className="req-params-grid">
            <div className="req-param-tile">
              <div className="req-param-icon req-param-icon--teal">
                <IconUsers size={18} />
              </div>
              <div className="req-param-info">
                <span className="req-param-label">Workforce Headcount</span>
                <strong className="req-param-val">{requirement.workers_required} Workers</strong>
              </div>
            </div>

            <div className="req-param-tile">
              <div className="req-param-icon req-param-icon--blue">
                <IconMapPin size={18} />
              </div>
              <div className="req-param-info">
                <span className="req-param-label">Location / Hub</span>
                <span className="req-param-val">{requirement.city ? `${requirement.city}, ${requirement.state || ''}` : requirement.location}</span>
              </div>
            </div>

            <div className="req-param-tile">
              <div className="req-param-icon req-param-icon--amber">
                <IconClock size={18} />
              </div>
              <div className="req-param-info">
                <span className="req-param-label">Duration</span>
                <span className="req-param-val">{requirement.duration || 'Flexible'}</span>
              </div>
            </div>

            <div className="req-param-tile">
              <div className="req-param-icon req-param-icon--purple">
                <IconRupee size={18} />
              </div>
              <div className="req-param-info">
                <span className="req-param-label">Daily Budget Bracket</span>
                <span className="req-param-val req-param-val--budget">
                  {requirement.budget_min || requirement.budget_max
                    ? `₹${Math.round(Number(requirement.budget_min || 0))} - ${Math.round(Number(requirement.budget_max || 0))} / day`
                    : 'Negotiable'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Required Trade Skills */}
        {requirement.required_skills && requirement.required_skills.length > 0 && (
          <div className="req-card">
            <div className="req-card-header">
              <div className="req-card-icon-box req-card-icon-box--green">
                <IconTools size={18} />
              </div>
              <div>
                <h3 className="req-card-title">Required Trade Skills & Certifications</h3>
                <p className="req-card-subtitle">Mandatory skillsets expected from candidate tradesmen</p>
              </div>
            </div>

            <div className="req-skills-wrap">
              {requirement.required_skills.map((skill, idx) => (
                <span key={idx} className="req-skill-pill">
                  <IconCheck size={13} /> {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Card 3: Scope of Work & Facility Specifications */}
        {requirement.description && (
          <div className="req-card">
            <div className="req-card-header">
              <div className="req-card-icon-box req-card-icon-box--blue">
                <IconBriefcase size={18} />
              </div>
              <div>
                <h3 className="req-card-title">Scope of Work & Facility Specifications</h3>
                <p className="req-card-subtitle">Detailed shifts, safety gear requirements, and site guidelines</p>
              </div>
            </div>

            <div className="req-desc-text">
              {requirement.description}
            </div>
          </div>
        )}

        {/* Card 4: Audit & Status Metadata */}
        <div className="req-card req-card--meta">
          <div className="req-audit-item">
            <span className="req-audit-label">Created At</span>
            <span className="req-audit-val">{new Date(requirement.created_at).toLocaleString()}</span>
          </div>

          {requirement.published_at && (
            <div className="req-audit-item">
              <span className="req-audit-label">Published At</span>
              <span className="req-audit-val">{new Date(requirement.published_at).toLocaleString()}</span>
            </div>
          )}

          <div className="req-audit-item">
            <span className="req-audit-label">Proposals Received</span>
            <span className="req-audit-val req-audit-val--teal">
              {requirement.applications_count || 0} Submitted Applications
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
