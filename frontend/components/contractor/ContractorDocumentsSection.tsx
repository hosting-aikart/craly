'use client';

import React, { useEffect, useState, FormEvent } from 'react';
import {
  getMyDocuments,
  uploadMyDocument,
  getMyDocumentSignedUrl,
  deleteMyDocument,
  type ContractorDocumentItem,
} from '@/lib/api/contractorPortal';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import {
  IconUpload,
  IconFolder,
  IconFile,
  IconShield,
  IconCheck,
  IconLock,
  IconEye,
  IconTrash,
  IconAlertTriangle,
  IconSparkle,
  IconChevronDown,
} from '@/components/ui/Icons';
import './ContractorDocumentsSection.css';

export const CONTRACTOR_DOCUMENT_TYPE_LABELS: Record<string, string> = {
  gst: 'GST Registration Certificate',
  business_registration: 'Business / Company Registration',
  pan: 'PAN Card (Tax Identification)',
  aadhaar: 'Aadhaar Card (Authorized Signatory)',
  labor_license: 'Labour License / Contract Labour Act',
  msme: 'MSME / Udyam Registration',
  pf_registration: 'EPF Registration Certificate',
  esic_registration: 'ESIC Registration Certificate',
  industry_license: 'Trade / Industry License',
  safety_certification: 'Safety / ISO / Quality Certification',
  compliance_certificate: 'Statutory Compliance Certificate',
  other_certificate: 'Other Certificate',
  other: 'Other Supporting Document',
};

const DOCUMENT_OPTIONS = [
  {
    value: 'gst',
    label: 'GST Registration Certificate',
    badge: 'Required',
    badgeType: 'required',
    category: 'Statutory',
  },
  {
    value: 'business_registration',
    label: 'Business Registration / Certificate',
    badge: 'Required',
    badgeType: 'required',
    category: 'Statutory',
  },
  {
    value: 'pan',
    label: 'PAN Card (Company / Proprietor)',
    badge: 'Required',
    badgeType: 'required',
    category: 'Tax ID',
  },
  {
    value: 'aadhaar',
    label: 'Aadhaar Card (Authorized Signatory)',
    badge: 'Required',
    badgeType: 'required',
    category: 'Identity',
  },
  {
    value: 'labor_license',
    label: 'Labour License (Contract Labour Act)',
    badge: 'Recommended',
    badgeType: 'recommended',
    category: 'Licensing',
  },
  {
    value: 'msme',
    label: 'MSME / Udyam Registration',
    badge: 'Optional',
    badgeType: 'optional',
    category: 'Statutory',
  },
  {
    value: 'pf_registration',
    label: 'EPF Registration Certificate',
    badge: 'Recommended',
    badgeType: 'recommended',
    category: 'Compliance',
  },
  {
    value: 'esic_registration',
    label: 'ESIC Registration Certificate',
    badge: 'Recommended',
    badgeType: 'recommended',
    category: 'Compliance',
  },
  {
    value: 'industry_license',
    label: 'Trade / Industry License',
    badge: 'Recommended',
    badgeType: 'recommended',
    category: 'Licensing',
  },
  {
    value: 'safety_certification',
    label: 'Safety / ISO / Quality Certification',
    badge: 'Optional',
    badgeType: 'optional',
    category: 'Compliance',
  },
  {
    value: 'compliance_certificate',
    label: 'Statutory Compliance Certificate',
    badge: 'Optional',
    badgeType: 'optional',
    category: 'Compliance',
  },
  {
    value: 'other_certificate',
    label: 'Other Certificate / Award',
    badge: 'Optional',
    badgeType: 'optional',
    category: 'Supplemental',
  },
  {
    value: 'other',
    label: 'Other Supporting Document',
    badge: 'Optional',
    badgeType: 'optional',
    category: 'Supplemental',
  },
] as const;

const DOCUMENT_TYPE_LABELS: Record<string, { label: string; category: string }> = {
  gst: { label: 'GST Registration Certificate', category: 'Statutory' },
  business_registration: { label: 'Business Registration / GST', category: 'Statutory' },
  pan: { label: 'PAN Card (Company / Proprietor)', category: 'Tax ID' },
  aadhaar: { label: 'Aadhaar Card (Authorized Signatory)', category: 'Identity' },
  labor_license: { label: 'Labour License', category: 'Licensing' },
  msme: { label: 'MSME / Udyam Registration', category: 'Statutory' },
  pf_registration: { label: 'EPF Registration', category: 'Compliance' },
  esic_registration: { label: 'ESIC Registration', category: 'Compliance' },
  industry_license: { label: 'Industry / Trade License', category: 'Licensing' },
  safety_certification: { label: 'Safety / ISO Certification', category: 'Compliance' },
  compliance_certificate: { label: 'Compliance Certificate', category: 'Compliance' },
  other_certificate: { label: 'Other Certificate / Award', category: 'Supplemental' },
  other: { label: 'Other Supporting Document', category: 'Supplemental' },
};

interface ContractorDocumentsSectionProps {
  verificationStatus?: string;
  verificationNote?: string | null;
}

export default function ContractorDocumentsSection({
  verificationStatus = 'pending',
  verificationNote,
}: ContractorDocumentsSectionProps) {
  const [documents, setDocuments] = useState<ContractorDocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload Form state
  const [documentType, setDocumentType] = useState('business_registration');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const fetchDocs = () => {
    getMyDocuments()
      .then(({ data }) => setDocuments(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a document file to upload');
      return;
    }

    setUploading(true);
    setError('');
    setSuccessMsg('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);
      if (issueDate) formData.append('issueDate', issueDate);
      if (expiryDate) formData.append('expiryDate', expiryDate);

      await uploadMyDocument(formData);
      setSuccessMsg('Document uploaded successfully and queued for verification!');
      setFile(null);
      setIssueDate('');
      setExpiryDate('');
      fetchDocs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  const handleView = async (documentId: string) => {
    try {
      const { data } = await getMyDocumentSignedUrl(documentId, 'view');
      if (data?.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to get document view URL.');
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await deleteMyDocument(documentId);
      fetchDocs();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete document.');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const hasBusinessReg = documents.some((d) => d.document_type === 'business_registration');
  const hasPan = documents.some((d) => d.document_type === 'pan');
  const hasAadhaar = documents.some((d) => d.document_type === 'aadhaar');
  const hasLicense = documents.some((d) => d.document_type === 'industry_license');

  return (
    <div className="cp-docs-section">
      {/* ── KYC Status & Hero Banner ─────────────────────────────────── */}
      <div className="contractor-hero-banner cp-docs-hero-override">
        <div className="cp-docs-hero-left">
          <span className="contractor-hero-badge">
            <IconShield size={12} /> Compliance & Trust Verification
          </span>
          <h2>KYC & Statutory Verification</h2>
          <p>
            Upload statutory registrations and trade licenses to gain verified status, unlock enterprise tenders, and build instant trust with industrial clients.
          </p>

          {/* 3-Step Lifecycle Indicator */}
          <div className="cp-docs-lifecycle-bar">
            <div className={`cp-docs-lifecycle-step ${documents.length > 0 ? 'completed' : 'active'}`}>
              <span className="cp-docs-step-bubble">
                {documents.length > 0 ? <IconCheck size={12} /> : '1'}
              </span>
              <div className="cp-docs-step-info">
                <span className="cp-docs-step-title">1. Document Upload</span>
                <span className="cp-docs-step-sub">{documents.length} Submitted</span>
              </div>
            </div>
            <div className="cp-docs-lifecycle-divider" />
            <div className={`cp-docs-lifecycle-step ${verificationStatus === 'verified' ? 'completed' : verificationStatus === 'under_review' || documents.length > 0 ? 'active' : ''}`}>
              <span className="cp-docs-step-bubble">
                {verificationStatus === 'verified' ? <IconCheck size={12} /> : '2'}
              </span>
              <div className="cp-docs-step-info">
                <span className="cp-docs-step-title">2. Craly Operations Review</span>
                <span className="cp-docs-step-sub">{verificationStatus === 'verified' ? 'Approved' : 'In Progress'}</span>
              </div>
            </div>
            <div className="cp-docs-lifecycle-divider" />
            <div className={`cp-docs-lifecycle-step ${verificationStatus === 'verified' ? 'completed' : ''}`}>
              <span className="cp-docs-step-bubble">
                {verificationStatus === 'verified' ? <IconCheck size={12} /> : '3'}
              </span>
              <div className="cp-docs-step-info">
                <span className="cp-docs-step-title">3. Verified Badge Active</span>
                <span className="cp-docs-step-sub">{verificationStatus === 'verified' ? 'Unlocked' : 'Locked'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="cp-docs-status-pill-wrap">
          <span className={`cp-docs-status-pill cp-docs-status-pill--${verificationStatus}`}>
            <span className="cp-docs-status-dot" />
            {verificationStatus === 'verified'
              ? 'Verified Contractor'
              : verificationStatus === 'needs_changes'
              ? 'Action Required'
              : 'Under Review'}
          </span>
        </div>
      </div>

      {verificationNote && (
        <div className="cp-docs-note">
          <IconAlertTriangle size={16} />
          <div>
            <strong>Reviewer Feedback:</strong> {verificationNote}
          </div>
        </div>
      )}

      {/* ── Document Checklist Quick Bar ─────────────────────────────── */}
      <div className="cp-docs-checklist-card">
        <div className="cp-docs-checklist-header">
          <span className="cp-docs-checklist-heading">Statutory Compliance Checklist:</span>
          <span className="cp-docs-checklist-sub">Essential credentials for verified contractor status</span>
        </div>
        <div className="cp-docs-checklist-items">
          <span className={`cp-docs-check-tag ${hasBusinessReg ? 'checked' : 'missing'}`}>
            {hasBusinessReg ? <IconCheck size={13} /> : '○'} Business Reg / GST
          </span>
          <span className={`cp-docs-check-tag ${hasPan ? 'checked' : 'missing'}`}>
            {hasPan ? <IconCheck size={13} /> : '○'} PAN Card
          </span>
          <span className={`cp-docs-check-tag ${hasAadhaar ? 'checked' : 'missing'}`}>
            {hasAadhaar ? <IconCheck size={13} /> : '○'} Aadhaar ID
          </span>
          <span className={`cp-docs-check-tag ${hasLicense ? 'checked' : 'optional'}`}>
            {hasLicense ? <IconCheck size={13} /> : '+'} Trade License
          </span>
        </div>
      </div>

      {/* ── Upload Form Card ─────────────────────────────────────────── */}
      <div className="contractor-card">
        <div className="contractor-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="contractor-header-icon-box">
              <IconUpload size={16} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px' }}>Upload KYC / Verification Document</h3>
              <p className="contractor-card-sub" style={{ marginTop: '2px' }}>
                Files are securely encrypted and stored on enterprise Cloudflare R2 vault.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="cp-docs-alert cp-docs-alert--error">
            <IconAlertTriangle size={15} /> {error}
          </div>
        )}
        {successMsg && (
          <div className="cp-docs-alert cp-docs-alert--success">
            <IconCheck size={15} /> {successMsg}
          </div>
        )}

        <form onSubmit={handleUpload} className="cp-docs-upload-form">
          <div className="cp-docs-form-grid">
            <div className="cp-docs-field" ref={dropdownRef}>
              <label>Document Type *</label>
              <div className="cp-custom-select-wrap">
                <button
                  type="button"
                  className={`cp-custom-select-trigger ${isDropdownOpen ? 'open' : ''}`}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  aria-haspopup="listbox"
                  aria-expanded={isDropdownOpen}
                >
                  <div className="cp-custom-select-val">
                    <span className="cp-custom-select-text">
                      {DOCUMENT_OPTIONS.find((o) => o.value === documentType)?.label || 'Select Document Type'}
                    </span>
                    {(() => {
                      const opt = DOCUMENT_OPTIONS.find((o) => o.value === documentType);
                      return opt ? (
                        <span className={`cp-option-badge cp-option-badge--${opt.badgeType}`}>
                          {opt.badge}
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <IconChevronDown size={15} className={`cp-select-chevron ${isDropdownOpen ? 'open' : ''}`} />
                </button>

                {isDropdownOpen && (
                  <div className="cp-custom-select-menu" role="listbox">
                    {DOCUMENT_OPTIONS.map((opt) => {
                      const isSelected = opt.value === documentType;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          className={`cp-custom-select-option ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            setDocumentType(opt.value);
                            setIsDropdownOpen(false);
                          }}
                          role="option"
                          aria-selected={isSelected}
                        >
                          <div className="cp-option-left">
                            <span className="cp-option-category">{opt.category}</span>
                            <span className="cp-option-label">{opt.label}</span>
                          </div>
                          <div className="cp-option-right">
                            <span className={`cp-option-badge cp-option-badge--${opt.badgeType}`}>
                              {opt.badge}
                            </span>
                            {isSelected && <IconCheck size={14} className="cp-option-check" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="cp-docs-field">
              <label>Document File (PDF, PNG, JPG, WebP - max 10MB) *</label>
              <div className="cp-docs-file-dropzone">
                <input
                  type="file"
                  id="cp-file-input"
                  required
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="cp-docs-file-input"
                />
                <label htmlFor="cp-file-input" className="cp-docs-file-drop-label">
                  <IconUpload size={18} className="cp-drop-icon" />
                  {file ? (
                    <span className="cp-drop-filename">
                      <strong>Selected:</strong> {file.name} ({formatSize(file.size)})
                    </span>
                  ) : (
                    <span className="cp-drop-text">
                      <strong>Click to browse</strong> or drag and drop document
                    </span>
                  )}
                </label>
              </div>
            </div>

            <div className="cp-docs-field">
              <label>Issue Date (Optional)</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="cp-docs-input"
              />
            </div>

            <div className="cp-docs-field">
              <label>Expiry / Renewal Date (Optional)</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="cp-docs-input"
              />
            </div>
          </div>

          <div className="cp-docs-form-footer">
            <span className="cp-docs-security-note">
              <IconLock size={13} /> 256-bit AES Cloudflare R2 Encrypted Storage
            </span>
            <button type="submit" className="contractor-hero-btn-prim" disabled={uploading} style={{ padding: '9px 24px', fontSize: '13px' }}>
              {uploading ? (
                <>Uploading Document…</>
              ) : (
                <>
                  <IconUpload size={14} /> Upload & Verify Document
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── Uploaded Documents List Card ─────────────────────────────── */}
      <div className="contractor-card">
        <div className="contractor-card-header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="contractor-header-icon-box">
              <IconFolder size={16} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px' }}>Uploaded Verification Documents</h3>
              <p className="contractor-card-sub" style={{ marginTop: '2px' }}>
                Active documents stored in your compliance repository.
              </p>
            </div>
          </div>
          <span className="contractor-badge-pill contractor-badge-pill--green">
            {documents.length} {documents.length === 1 ? 'Document' : 'Documents'}
          </span>
        </div>

        {loading ? (
          <LoadingState label="Loading documents…" />
        ) : documents.length === 0 ? (
          <EmptyState
            icon={<IconFile size={28} />}
            title="No Documents Uploaded Yet"
            subtitle="Upload your Business Registration / GST, PAN, or Aadhaar above to initiate verification and unlock high-value employer tenders."
          />
        ) : (
          <div className="cp-docs-table-wrapper">
            <table className="cp-docs-table">
              <thead>
                <tr>
                  <th>Document Type</th>
                  <th>File Name</th>
                  <th>Size</th>
                  <th>Uploaded Date</th>
                  <th>Verification Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => {
                  const typeMeta = DOCUMENT_TYPE_LABELS[doc.document_type] || {
                    label: CONTRACTOR_DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type,
                    category: 'Document',
                  };
                  return (
                    <tr key={doc.id}>
                      <td>
                        <div className="cp-docs-type-cell">
                          <span className="cp-docs-type-badge">{typeMeta.label}</span>
                          <span className="cp-docs-type-category">{typeMeta.category}</span>
                        </div>
                      </td>
                      <td className="cp-docs-filename-cell">
                        <IconFile size={15} className="cp-file-icon" />
                        <span className="cp-docs-filename" title={doc.file_name}>
                          {doc.file_name}
                        </span>
                      </td>
                      <td className="cp-docs-size-cell">{formatSize(doc.size_bytes)}</td>
                      <td className="cp-docs-date-cell">
                        {new Date(doc.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td>
                        <span className={`cp-docs-item-status cp-docs-item-status--${doc.status}`}>
                          <span className="cp-docs-status-micro-dot" />
                          {doc.status === 'approved'
                            ? 'VERIFIED'
                            : doc.status === 'rejected'
                            ? 'REJECTED'
                            : doc.status === 'replacement_requested'
                            ? 'NEEDS UPDATE'
                            : 'UNDER REVIEW'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="cp-docs-action-btns">
                          <button
                            type="button"
                            className="cp-docs-action-btn cp-docs-action-btn--view"
                            onClick={() => handleView(doc.id)}
                            title="View / Download Document"
                          >
                            <IconEye size={13} /> View
                          </button>
                          <button
                            type="button"
                            className="cp-docs-action-btn cp-docs-action-btn--delete"
                            onClick={() => handleDelete(doc.id)}
                            title="Delete Document"
                          >
                            <IconTrash size={13} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

