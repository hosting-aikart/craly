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
      {/* ── Breadcrumb Back Navigation ──────────────────────────────── */}
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

      {/* ── Hero Banner ──────────────────────────────────────────────── */}
      <div className="req-detail-hero">
        <div className="req-detail-hero-left">
          <div className="req-detail-badge-row">
            <span className={`req-status-pill req-status-pill--${requirement.status.toLowerCase()}`}>
              {requirement.status.replace('_', ' ')}
            </span>
            <span className="req-id-pill">ID: {requirement.id.slice(0, 8)}</span>
          </div>

          <h1 className="req-detail-title">{requirement.title}</h1>

          <div className="req-detail-meta-row">
            {requirement.industry && (
              <span className="req-meta-item">
                <IconBriefcase size={14} /> {requirement.industry}
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

        {/* Action Controls in Hero */}
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
            <IconUsers size={15} /> View Proposals ({requirement.applications_count}) →
          </Link>
        </div>
      </div>

      {/* ── Key Parameters 4-Grid ────────────────────────────────────── */}
      <div className="req-params-grid">
        <div className="req-param-card">
          <div className="req-param-icon req-param-icon--teal">
            <IconUsers size={20} />
          </div>
          <div className="req-param-info">
            <span className="req-param-label">Workforce Needed</span>
            <span className="req-param-val">{requirement.workers_required} Workers</span>
          </div>
        </div>

        <div className="req-param-card">
          <div className="req-param-icon req-param-icon--blue">
            <IconMapPin size={20} />
          </div>
          <div className="req-param-info">
            <span className="req-param-label">City Hub / Zone</span>
            <span className="req-param-val">{requirement.city || requirement.location}</span>
          </div>
        </div>

        <div className="req-param-card">
          <div className="req-param-icon req-param-icon--amber">
            <IconClock size={20} />
          </div>
          <div className="req-param-info">
            <span className="req-param-label">Duration</span>
            <span className="req-param-val">{requirement.duration || 'Flexible'}</span>
          </div>
        </div>

        <div className="req-param-card">
          <div className="req-param-icon req-param-icon--purple">
            <IconRupee size={20} />
          </div>
          <div className="req-param-info">
            <span className="req-param-label">Daily Rate Budget</span>
            <span className="req-param-val">
              {requirement.budget_min || requirement.budget_max
                ? `₹${requirement.budget_min || 0} - ₹${requirement.budget_max || 'N/A'}`
                : 'Negotiable'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Content & Scope Card ─────────────────────────────────────── */}
      <div className="req-content-card">
        {/* Description / Scope */}
        {requirement.description && (
          <div className="req-content-block">
            <h3 className="req-block-heading">
              <IconTarget size={18} /> Detailed Scope & Facility Specifications
            </h3>
            <p className="req-desc-text">{requirement.description}</p>
          </div>
        )}

        {/* Required Skills */}
        {requirement.required_skills && requirement.required_skills.length > 0 && (
          <div className="req-content-block">
            <h3 className="req-block-heading">
              <IconTools size={18} /> Required Trade Skills & Certifications
            </h3>
            <div className="req-skills-wrap">
              {requirement.required_skills.map((skill, idx) => (
                <span key={idx} className="req-skill-pill">
                  <IconCheck size={13} /> {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Audit Timestamps */}
        <div className="req-footer-audit">
          <span>📅 Created On: {new Date(requirement.created_at).toLocaleString()}</span>
          {requirement.published_at && (
            <span>🚀 Published On: {new Date(requirement.published_at).toLocaleString()}</span>
          )}
        </div>
      </div>
    </div>
  );
}
