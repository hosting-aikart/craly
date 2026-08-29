'use client';

import React, { useEffect, useState, FormEvent } from 'react';
import {
  getStaffContractorDocuments,
  uploadStaffContractorDocument,
  getStaffContractorDocumentSignedUrl,
  deleteStaffContractorDocument,
  type StaffContractorDocumentItem,
} from '@/lib/api/staff';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import './StaffContractorDocuments.css';

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  aadhaar: 'Aadhaar Card (Identity)',
  pan: 'PAN Card (Tax Registration)',
  business_registration: 'Business Registration / GST',
  industry_license: 'Industry / Trade License',
  safety_certification: 'Safety / ISO Certification',
  other_certificate: 'Other Certificate',
  verification_evidence: 'Verification Evidence',
};

interface StaffContractorDocumentsProps {
  contractorId: string;
  /** Fired after any successful upload/delete, so a parent can refresh other state (e.g. verification status). */
  onChange?: () => void;
}

/**
 * KYC / Documents section for a contractor, usable from BOTH the general
 * Contractors → [id] detail page and (in principle) the Verification
 * Review queue — reachable for newly created AND pre-existing
 * contractors alike. Reuses the same contractor_documents / R2 storage
 * as the contractor's own self-upload and the internal Ops Head tool;
 * see backend/src/controllers/documentController.ts.
 */
export default function StaffContractorDocuments({ contractorId, onChange }: StaffContractorDocumentsProps) {
  const [documents, setDocuments] = useState<StaffContractorDocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [documentType, setDocumentType] = useState('business_registration');
  const [file, setFile] = useState<File | null>(null);
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchDocs = () => {
    setLoading(true);
    getStaffContractorDocuments(contractorId)
      .then(({ data }) => { setDocuments(data || []); setLoadError(''); })
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Failed to load documents.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractorId]);

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
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

      await uploadStaffContractorDocument(contractorId, formData);
      setSuccessMsg('Document uploaded successfully.');
      setFile(null);
      setIssueDate('');
      setExpiryDate('');
      const input = document.getElementById(`staff-doc-file-${contractorId}`) as HTMLInputElement | null;
      if (input) input.value = '';
      fetchDocs();
      onChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  const handleView = async (documentId: string) => {
    try {
      const { data } = await getStaffContractorDocumentSignedUrl(contractorId, documentId, 'view');
      if (data?.url) window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to get document view URL.');
    }
  };

  const handleDelete = async (documentId: string, fileName: string) => {
    if (!confirm(`Delete "${fileName}"? This cannot be undone.`)) return;
    try {
      await deleteStaffContractorDocument(contractorId, documentId);
      fetchDocs();
      onChange?.();
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
    <div className="scd-section">
      <div className="scd-card">
        <div className="scd-card-header">
          <span className="scd-card-icon">📤</span>
          <h3>Upload KYC / Verification Document</h3>
        </div>
        <p className="scd-hint">Optional — documents can be added now or any time later from this same section.</p>

        {error && <div className="scd-alert scd-alert--error">{error}</div>}
        {successMsg && <div className="scd-alert scd-alert--success">{successMsg}</div>}

        <form onSubmit={handleUpload} className="scd-upload-form">
          <div className="scd-form-grid">
            <div className="scd-field">
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

            <div className="scd-field">
              <label>File (PDF, PNG, JPG) *</label>
              <input
                id={`staff-doc-file-${contractorId}`}
                type="file"
                required
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>

            <div className="scd-field">
              <label>Issue Date (Optional)</label>
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>

            <div className="scd-field">
              <label>Expiry Date (Optional)</label>
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
          </div>

          <div className="scd-form-actions">
            <button type="submit" className="scd-submit-btn" disabled={uploading}>
              {uploading ? 'Uploading…' : 'Upload Document'}
            </button>
          </div>
        </form>
      </div>

      <div className="scd-card">
        <div className="scd-card-header">
          <span className="scd-card-icon">📁</span>
          <h3>Uploaded Documents ({documents.length})</h3>
        </div>

        {loading ? (
          <LoadingState label="Loading documents…" />
        ) : loadError ? (
          <div className="scd-alert scd-alert--error">{loadError}</div>
        ) : documents.length === 0 ? (
          <EmptyState
            icon="📄"
            title="No Documents Yet"
            subtitle="This contractor has no KYC or verification documents uploaded yet. Add one above."
          />
        ) : (
          <div className="scd-table-wrapper">
            <table className="scd-table">
              <thead>
                <tr>
                  <th>Document Type</th>
                  <th>File Name</th>
                  <th>Size</th>
                  <th>Uploaded</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td><span className="scd-type-badge">{DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}</span></td>
                    <td className="scd-filename">{doc.file_name}</td>
                    <td>{formatSize(doc.size_bytes)}</td>
                    <td>{new Date(doc.created_at).toLocaleDateString()}</td>
                    <td><span className={`scd-item-status scd-item-status--${doc.status}`}>{doc.status.replace('_', ' ').toUpperCase()}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="scd-action-btns">
                        <button type="button" className="scd-action-btn scd-action-btn--view" onClick={() => handleView(doc.id)}>
                          View / Download
                        </button>
                        <button type="button" className="scd-action-btn scd-action-btn--delete" onClick={() => handleDelete(doc.id, doc.file_name)}>
                          Delete
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
