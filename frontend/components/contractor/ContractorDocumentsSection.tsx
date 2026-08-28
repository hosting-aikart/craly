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
import { IconUpload, IconFolder, IconFile } from '@/components/ui/Icons';
import './ContractorDocumentsSection.css';

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  aadhaar: 'Aadhaar Card (Identity)',
  pan: 'PAN Card (Tax Registration)',
  business_registration: 'Business Registration / GST',
  industry_license: 'Industry / Trade License',
  safety_certification: 'Safety / ISO Certification',
  other_certificate: 'Other Certificate',
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
  const [file, setFile] = useState<File | null>(null);
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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
      setError('Please select a file to upload');
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
      setSuccessMsg('Document uploaded successfully to Cloudflare R2!');
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

  return (
    <div className="cp-docs-section">
      {/* Verification Banner */}
      <div className="cp-docs-status-card">
        <div className="cp-docs-status-header">
          <div>
            <span className="cp-docs-subtitle">KYC & Verification Lifecycle</span>
            <h3>Account Verification Status</h3>
          </div>
          <span className={`cp-docs-status-pill cp-docs-status-pill--${verificationStatus}`}>
            {verificationStatus.replace('_', ' ').toUpperCase()}
          </span>
        </div>
        <p className="cp-docs-status-desc">
          {verificationStatus === 'verified'
            ? 'Your profile and verification documents have been reviewed and approved by Craly Operations.'
            : verificationStatus === 'needs_changes'
            ? 'Craly Operations requested updates to your verification documents. Please review feedback and upload revised documents below.'
            : 'Upload your business registration, PAN/Aadhaar, and trade licenses below. Craly Operations will review your documents.'}
        </p>
        {verificationNote && (
          <div className="cp-docs-note">
            <strong>Reviewer Note:</strong> {verificationNote}
          </div>
        )}
      </div>

      {/* Upload Form Card */}
      <div className="cp-docs-card">
        <div className="cp-docs-card-header">
          <span className="cp-docs-card-icon"><IconUpload size={18} /></span>
          <h3>Upload Verification / KYC Document</h3>
        </div>

        {error && <div className="cp-docs-alert cp-docs-alert--error">{error}</div>}
        {successMsg && <div className="cp-docs-alert cp-docs-alert--success">{successMsg}</div>}

        <form onSubmit={handleUpload} className="cp-docs-upload-form">
          <div className="cp-docs-form-grid">
            <div className="cp-docs-field">
              <label>Document Type *</label>
              <select value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
                <option value="business_registration">Business Registration / GST</option>
                <option value="industry_license">Industry / Trade License</option>
                <option value="safety_certification">Safety / ISO Certification</option>
                <option value="pan">PAN Card (Tax Registration)</option>
                <option value="aadhaar">Aadhaar Card (Identity)</option>
                <option value="other_certificate">Other Certificate</option>
              </select>
            </div>

            <div className="cp-docs-field">
              <label>Select Document File (PDF, PNG, JPG, WebP) *</label>
              <input
                type="file"
                required
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>

            <div className="cp-docs-field">
              <label>Issue Date (Optional)</label>
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>

            <div className="cp-docs-field">
              <label>Expiry Date (Optional)</label>
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
          </div>

          <div className="cp-docs-form-actions">
            <button type="submit" className="cp-docs-submit-btn" disabled={uploading}>
              {uploading ? 'Uploading to R2 Storage…' : 'Upload Document'}
            </button>
          </div>
        </form>
      </div>

      {/* Uploaded Documents List Card */}
      <div className="cp-docs-card">
        <div className="cp-docs-card-header">
          <span className="cp-docs-card-icon"><IconFolder size={18} /></span>
          <h3>Uploaded Verification Documents ({documents.length})</h3>
        </div>

        {loading ? (
          <LoadingState label="Loading documents…" />
        ) : documents.length === 0 ? (
          <EmptyState
            icon={<IconFile size={24} />}
            title="No Documents Uploaded Yet"
            subtitle="Upload your business registration, PAN/Aadhaar, or industry licenses above to initiate verification."
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
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <span className="cp-docs-type-badge">
                        {DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
                      </span>
                    </td>
                    <td className="cp-docs-filename">{doc.file_name}</td>
                    <td>{formatSize(doc.size_bytes)}</td>
                    <td>{new Date(doc.created_at).toLocaleDateString()}</td>
                    <td>
                      <span className={`cp-docs-item-status cp-docs-item-status--${doc.status}`}>
                        {doc.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="cp-docs-action-btns">
                        <button
                          type="button"
                          className="cp-docs-action-btn cp-docs-action-btn--view"
                          onClick={() => handleView(doc.id)}
                        >
                          👁️ View / Download
                        </button>
                        <button
                          type="button"
                          className="cp-docs-action-btn cp-docs-action-btn--delete"
                          onClick={() => handleDelete(doc.id)}
                        >
                          🗑️ Delete
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
    </div>
  );
}
