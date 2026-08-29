'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { apiGet, apiPatch } from '@/lib/api';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import {
  IconArrowLeft,
  IconCheck,
  IconAlertTriangle,
  IconX,
  IconMapPin,
  IconShield,
  IconBuilding,
  IconUsers,
} from '@/components/ui/Icons';
import './admin-verification-review.css';

interface ContractorReviewDetail {
  id: string;
  company_name: string;
  city: string | null;
  state: string | null;
  years_experience: number | null;
  workforce_size: number | null;
  verification_status: string;
  verification_note: string | null;
  created_at: string;
  email: string;
  description: string | null;
}

export default function AdminVerificationReviewPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const router = useRouter();

  const [contractor, setContractor] = useState<ContractorReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');

  const [checklist, setChecklist] = useState({
    identityVerified: false,
    businessDetailsVerified: false,
    documentsReviewed: false,
    experienceReviewed: false,
    workforceReviewed: false,
    contactVerified: false,
  });

  useEffect(() => {
    if (!id) return;
    apiGet<{ data: any }>('/admin/verification')
      .then(({ data }) => {
        const item = data.find((c: any) => c.id === id);
        if (item) {
          setContractor(item);
          setNote(item.verification_note || '');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleReviewAction = async (status: 'verified' | 'pending' | 'rejected') => {
    setSaving(true);
    try {
      await apiPatch(`/admin/verification/${id}`, {
        status,
        note,
        checklist,
      });
      router.push('/admin/verification');
    } catch (err) {
      console.error('Failed to submit verification action', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleCheck = (key: keyof typeof checklist) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'verified') {
      return (
        <span className="admin-verif-badge admin-verif-badge--verified">
          <IconShield size={11} /> Verified
        </span>
      );
    }
    if (s === 'rejected') {
      return (
        <span className="admin-verif-badge admin-verif-badge--rejected">
          <IconX size={11} /> Rejected
        </span>
      );
    }
    return (
      <span className="admin-verif-badge admin-verif-badge--pending">
        <IconAlertTriangle size={11} /> Pending KYC Review
      </span>
    );
  };

  return (
    <div className="admin-verif-review-page">
      <WorkspacePageHeader
        title="Contractor Verification Review"
        subtitle={contractor ? `Compliance checklist and credential verification for ${contractor.company_name}` : 'Verification Checklist'}
      />

      <Link href="/admin/verification" className="admin-verif-back">
        <IconArrowLeft size={14} /> Back to Verification Queue
      </Link>

      {loading ? (
        <LoadingState label="Loading contractor verification details…" />
      ) : !contractor ? (
        <EmptyState title="Contractor not found" subtitle="The requested contractor record was not found." />
      ) : (
        <>
          {/* Hero Profile Card */}
          <div className="admin-verif-hero">
            <div className="admin-verif-hero-left">
              <div className="admin-verif-large-avatar">
                {contractor.company_name.charAt(0).toUpperCase()}
              </div>
              <div className="admin-verif-hero-info">
                <h2 className="admin-verif-hero-name">{contractor.company_name}</h2>
                <span className="admin-verif-hero-sub">
                  <IconMapPin size={13} style={{ marginRight: 4, color: 'var(--craly-teal, #0f8b82)' }} />
                  {[contractor.city, contractor.state].filter(Boolean).join(', ') || 'Location Unspecified'}
                  <span style={{ margin: '0 8px', color: '#cbd5e1' }}>•</span>
                  {contractor.email}
                </span>
              </div>
            </div>

            <div>{getStatusBadge(contractor.verification_status)}</div>
          </div>

          {/* Details & Checklist Grid */}
          <div className="admin-verif-grid">
            {/* Left: Submitted Contractor Details */}
            <div className="admin-verif-card">
              <div className="admin-verif-card__header">
                <h3 className="admin-verif-card__title">Contractor Submitted Details</h3>
              </div>

              <div className="admin-verif-meta-list">
                <div className="admin-verif-meta-item">
                  <span className="admin-verif-meta-label">Company / Legal Entity</span>
                  <strong className="admin-verif-meta-value">{contractor.company_name}</strong>
                </div>

                <div className="admin-verif-meta-item">
                  <span className="admin-verif-meta-label">Contact Email</span>
                  <span className="admin-verif-meta-value">{contractor.email}</span>
                </div>

                <div className="admin-verif-meta-item">
                  <span className="admin-verif-meta-label">Operating Location</span>
                  <span className="admin-verif-meta-value">
                    {[contractor.city, contractor.state].filter(Boolean).join(', ') || 'Not specified'}
                  </span>
                </div>

                <div className="admin-verif-meta-item">
                  <span className="admin-verif-meta-label">Workforce Capacity</span>
                  <span className="admin-verif-meta-value">
                    {contractor.workforce_size ? `${contractor.workforce_size} Workers Available` : 'Unspecified'}
                  </span>
                </div>

                <div className="admin-verif-meta-item">
                  <span className="admin-verif-meta-label">Industry Experience</span>
                  <span className="admin-verif-meta-value">
                    {contractor.years_experience ? `${contractor.years_experience} Years in Operation` : 'Unspecified'}
                  </span>
                </div>

                {contractor.description && (
                  <div className="admin-verif-meta-item">
                    <span className="admin-verif-meta-label">Company Overview / Bio</span>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>
                      {contractor.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Verification Checklist & Action Controls */}
            <div className="admin-verif-card">
              <div className="admin-verif-card__header">
                <h3 className="admin-verif-card__title">Verification Compliance Checklist</h3>
              </div>

              <div className="admin-checklist-group">
                {[
                  { key: 'identityVerified', label: 'Identity & Director Identification Verified' },
                  { key: 'businessDetailsVerified', label: 'Business Registration & GST/PAN Verified' },
                  { key: 'documentsReviewed', label: 'Proof of Incorporation / Trade License Reviewed' },
                  { key: 'experienceReviewed', label: 'Past Track Record & Experience Evaluated' },
                  { key: 'workforceReviewed', label: 'Workforce Size & Capacity Confirmed' },
                  { key: 'contactVerified', label: 'Direct Phone & Email Communication Verified' },
                ].map((item) => (
                  <label key={item.key} className="admin-check-label">
                    <input
                      type="checkbox"
                      checked={checklist[item.key as keyof typeof checklist]}
                      onChange={() => toggleCheck(item.key as keyof typeof checklist)}
                      className="admin-check-input"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>

              <div className="admin-verif-notes-group">
                <label className="admin-verif-notes-label">
                  Verification Notes / Contractor Feedback
                </label>
                <textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Enter audit notes, verification remarks, or feedback..."
                  className="admin-verif-textarea"
                />
              </div>

              <div className="admin-verif-actions">
                <button
                  type="button"
                  onClick={() => handleReviewAction('verified')}
                  disabled={saving}
                  className="admin-btn-approve"
                >
                  <IconCheck size={14} /> Approve Verification
                </button>
                <button
                  type="button"
                  onClick={() => handleReviewAction('pending')}
                  disabled={saving}
                  className="admin-btn-request"
                >
                  <IconAlertTriangle size={14} /> Request Changes
                </button>
                <button
                  type="button"
                  onClick={() => handleReviewAction('rejected')}
                  disabled={saving}
                  className="admin-btn-reject"
                >
                  <IconX size={14} /> Reject
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
