'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import {
  getStaffVerificationContractorById,
  getStaffDocumentSignedUrl,
  reviewStaffDocument,
  updateStaffContractorVerificationStatus,
  type StaffVerificationDetail,
  type StaffVerificationDocumentItem,
} from '@/lib/api/staff';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import './staff-verification-detail.css';

const DOC_TYPE_LABELS: Record<string, string> = {
  aadhaar: 'Aadhaar Card (Identity)',
  pan: 'PAN Card (Tax Registration)',
  business_registration: 'Business Registration / GST',
  industry_license: 'Industry / Trade License',
  safety_certification: 'Safety / ISO Certification',
  other_certificate: 'Other Certificate',
};

export default function StaffVerificationDetailPage() {
  const params = useParams<{ id: string }>();
  const contractorId = params?.id ?? '';

  const [data, setData] = useState<StaffVerificationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Review Modal / Inline Action State for individual document
  const [reviewingDoc, setReviewingDoc] = useState<StaffVerificationDocumentItem | null>(null);
  const [decision, setDecision] = useState<'approved' | 'rejected' | 'replacement_requested'>('approved');
  const [note, setNote] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');

  // Overall Status Update Modal State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [overallStatus, setOverallStatus] = useState('verified');
  const [overallNote, setOverallNote] = useState('');
  const [submittingOverall, setSubmittingOverall] = useState(false);

  const fetchDetail = () => {
    if (!contractorId) return;
    setLoading(true);
    getStaffVerificationContractorById(contractorId)
      .then(({ data }) => {
        setData(data);
        if (data?.contractor?.verification_status) {
          setOverallStatus(data.contractor.verification_status);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load contractor verification detail'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDetail();
  }, [contractorId]);

  const handleViewSignedUrl = async (documentId: string) => {
    try {
      const res = await getStaffDocumentSignedUrl(contractorId, documentId, 'view');
      if (res.data?.url) {
        window.open(res.data.url, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to generate signed document URL');
    }
  };

  const openReviewModal = (doc: StaffVerificationDocumentItem, targetDecision: 'approved' | 'rejected' | 'replacement_requested') => {
    setReviewingDoc(doc);
    setDecision(targetDecision);
    setNote('');
    setReviewError('');
  };

  const submitDocReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingDoc) return;

    if (decision !== 'approved' && !note.trim()) {
      setReviewError('A reason/note is required when rejecting or requesting replacement.');
      return;
    }

    setSubmittingReview(true);
    setReviewError('');
    setActionSuccess('');

    try {
      await reviewStaffDocument(contractorId, reviewingDoc.id, decision, note.trim() || undefined);
      setActionSuccess(`Document "${reviewingDoc.file_name}" set to ${decision.replace('_', ' ').toUpperCase()}`);
      setReviewingDoc(null);
      fetchDetail();
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Failed to submit document review decision');
    } finally {
      setSubmittingReview(false);
    }
  };

  const submitOverallStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingOverall(true);
    setActionSuccess('');

    try {
      await updateStaffContractorVerificationStatus(contractorId, overallStatus, overallNote.trim() || undefined);
      setActionSuccess(`Contractor verification status updated to ${overallStatus.toUpperCase()}`);
      setShowStatusModal(false);
      fetchDetail();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update overall status');
    } finally {
      setSubmittingOverall(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (loading) {
    return <LoadingState label="Loading contractor KYC details…" />;
  }

  if (error || !data) {
    return (
      <div className="staff-vd-container">
        <EmptyState icon="⚠️" title="Contractor Not Found" subtitle={error || 'Unable to locate contractor.'} />
      </div>
    );
  }

  const { contractor, documents, reviewHistory } = data;

  return (
    <div className="staff-vd-container">
      <Link href="/staff/verification" className="staff-vd-back-link">
        ← Back to Verification Queue
      </Link>

      <WorkspacePageHeader
        title={`Verification Review: ${contractor.company_name}`}
        subtitle="Inspect uploaded KYC documents via Cloudflare R2 signed URLs and submit verification decisions."
      />

      {actionSuccess && <div className="staff-vd-alert staff-vd-alert--success">{actionSuccess}</div>}

      {/* Contractor Information Summary Card */}
      <div className="staff-vd-card">
        <div className="staff-vd-card-header">
          <div>
            <span className="staff-vd-card-sub">Contractor Profile Summary</span>
            <h2 className="staff-vd-card-title">{contractor.company_name}</h2>
          </div>
          <div className="staff-vd-status-box">
            <span className={`staff-vd-status-pill staff-vd-status-pill--${contractor.verification_status}`}>
              {contractor.verification_status.replace('_', ' ').toUpperCase()}
            </span>
            <button
              type="button"
              className="staff-vd-status-edit-btn"
              onClick={() => setShowStatusModal(true)}
            >
              Update Overall Status
            </button>
          </div>
        </div>

        <div className="staff-vd-info-grid">
          <div className="staff-vd-info-item">
            <label>Industry</label>
            <span>{contractor.industry || 'Not specified'}</span>
          </div>
          <div className="staff-vd-info-item">
            <label>Workforce Size</label>
            <span>{contractor.workforce_size !== null ? `${contractor.workforce_size} Workers` : 'Unspecified'}</span>
          </div>
          <div className="staff-vd-info-item">
            <label>Location</label>
            <span>{[contractor.city, contractor.state].filter(Boolean).join(', ') || 'Unmapped'}</span>
          </div>
          <div className="staff-vd-info-item">
            <label>Phone / Email</label>
            <span>{contractor.phone || 'No phone'} | {contractor.user_email || 'No email'}</span>
          </div>
          <div className="staff-vd-info-item">
            <label>Experience</label>
            <span>{contractor.years_experience !== null ? `${contractor.years_experience} Years` : '—'}</span>
          </div>
          <div className="staff-vd-info-item">
            <label>Last Verified</label>
            <span>{contractor.last_verified_at ? new Date(contractor.last_verified_at).toLocaleDateString() : 'Never'}</span>
          </div>
        </div>

        {contractor.verification_note && (
          <div className="staff-vd-note-box">
            <strong>Current Verification Note:</strong> {contractor.verification_note}
          </div>
        )}
      </div>

      {/* KYC Documents Section */}
      <div className="staff-vd-card">
        <div className="staff-vd-card-header">
          <h3>Uploaded KYC & Verification Documents ({documents.length})</h3>
        </div>

        {documents.length === 0 ? (
          <EmptyState
            icon="📄"
            title="No Documents Uploaded"
            subtitle="This contractor has not uploaded any KYC or verification documents yet."
          />
        ) : (
          <div className="staff-vd-table-wrapper">
            <table className="staff-vd-table">
              <thead>
                <tr>
                  <th>Document Type</th>
                  <th>File Name</th>
                  <th>Size</th>
                  <th>Uploaded Date</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                  <th>Reviewer Note</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <span className="staff-vd-type-tag">
                        {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                      </span>
                    </td>
                    <td className="staff-vd-filename">{doc.file_name}</td>
                    <td>{formatSize(doc.size_bytes)}</td>
                    <td>{new Date(doc.created_at).toLocaleDateString()}</td>
                    <td>{doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString() : '—'}</td>
                    <td>
                      <span className={`staff-vd-doc-status staff-vd-doc-status--${doc.status}`}>
                        {doc.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="staff-vd-note-col">{doc.reviewer_note || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="staff-vd-doc-actions">
                        <button
                          type="button"
                          className="staff-vd-btn staff-vd-btn--view"
                          onClick={() => handleViewSignedUrl(doc.id)}
                          title="View private object via short-lived signed R2 URL"
                        >
                          👁️ View
                        </button>
                        <button
                          type="button"
                          className="staff-vd-btn staff-vd-btn--approve"
                          onClick={() => openReviewModal(doc, 'approved')}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="staff-vd-btn staff-vd-btn--replace"
                          onClick={() => openReviewModal(doc, 'replacement_requested')}
                        >
                          Replace
                        </button>
                        <button
                          type="button"
                          className="staff-vd-btn staff-vd-btn--reject"
                          onClick={() => openReviewModal(doc, 'rejected')}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Verification History Section */}
      <div className="staff-vd-card">
        <div className="staff-vd-card-header">
          <h3>Verification Audit & Review History</h3>
        </div>

        {reviewHistory.length === 0 ? (
          <p className="staff-vd-empty-text">No past verification reviews recorded for this contractor.</p>
        ) : (
          <div className="staff-vd-timeline">
            {reviewHistory.map((h) => (
              <div key={h.id} className="staff-vd-timeline-item">
                <div className="staff-vd-timeline-marker" />
                <div className="staff-vd-timeline-content">
                  <div className="staff-vd-timeline-header">
                    <span className={`staff-vd-doc-status staff-vd-doc-status--${h.status}`}>
                      {h.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="staff-vd-timeline-time">
                      {new Date(h.created_at).toLocaleString()} by {h.reviewer_email || 'Staff'}
                    </span>
                  </div>
                  {h.notes && <p className="staff-vd-timeline-note">Reason / Note: {h.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal for Individual Document */}
      {reviewingDoc && (
        <div className="staff-vd-modal-overlay">
          <div className="staff-vd-modal">
            <h3>
              {decision === 'approved'
                ? 'Approve Document'
                : decision === 'rejected'
                ? 'Reject Document'
                : 'Request Document Replacement'}
            </h3>
            <p className="staff-vd-modal-sub">
              Target Document: <strong>{reviewingDoc.file_name}</strong> ({DOC_TYPE_LABELS[reviewingDoc.document_type]})
            </p>

            {reviewError && <div className="staff-vd-alert staff-vd-alert--error">{reviewError}</div>}

            <form onSubmit={submitDocReview}>
              <div className="staff-vd-field">
                <label>
                  Reviewer Reason / Feedback Note {decision !== 'approved' ? '*' : '(Optional)'}
                </label>
                <textarea
                  rows={3}
                  required={decision !== 'approved'}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={
                    decision === 'approved'
                      ? 'Optional approval note...'
                      : decision === 'rejected'
                      ? 'Specify exact reason for document rejection...'
                      : 'Specify why replacement document is required...'
                  }
                />
              </div>

              <div className="staff-vd-modal-actions">
                <button
                  type="button"
                  className="staff-vd-btn-sec"
                  onClick={() => setReviewingDoc(null)}
                  disabled={submittingReview}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`staff-vd-btn-prim staff-vd-btn-prim--${decision}`}
                  disabled={submittingReview}
                >
                  {submittingReview ? 'Submitting…' : `Confirm ${decision.replace('_', ' ').toUpperCase()}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Overall Verification Status Modal */}
      {showStatusModal && (
        <div className="staff-vd-modal-overlay">
          <div className="staff-vd-modal">
            <h3>Update Overall Contractor Verification Status</h3>
            <form onSubmit={submitOverallStatusUpdate}>
              <div className="staff-vd-field">
                <label>Verification Status</label>
                <select value={overallStatus} onChange={(e) => setOverallStatus(e.target.value)}>
                  <option value="pending">PENDING</option>
                  <option value="under_review">UNDER REVIEW</option>
                  <option value="verified">VERIFIED</option>
                  <option value="needs_changes">NEEDS CHANGES</option>
                  <option value="rejected">REJECTED</option>
                </select>
              </div>

              <div className="staff-vd-field">
                <label>Verification Note / Feedback</label>
                <textarea
                  rows={3}
                  value={overallNote}
                  onChange={(e) => setOverallNote(e.target.value)}
                  placeholder="Optional overall verification feedback..."
                />
              </div>

              <div className="staff-vd-modal-actions">
                <button
                  type="button"
                  className="staff-vd-btn-sec"
                  onClick={() => setShowStatusModal(false)}
                  disabled={submittingOverall}
                >
                  Cancel
                </button>
                <button type="submit" className="staff-vd-btn-prim" disabled={submittingOverall}>
                  {submittingOverall ? 'Updating…' : 'Save Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
