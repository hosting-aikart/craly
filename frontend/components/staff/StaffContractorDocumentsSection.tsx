'use client';

import React, { useEffect, useState, FormEvent } from 'react';
import {
  getStaffContractorDocuments,
  uploadStaffContractorDocument,
  deleteStaffContractorDocument,
  getStaffDocumentSignedUrl,
  type StaffVerificationDocumentItem,
} from '@/lib/api/staff';
import { CONTRACTOR_DOCUMENT_TYPE_LABELS } from '@/components/contractor/ContractorDocumentsSection';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import './StaffContractorDocumentsSection.css';

interface StaffContractorDocumentsSectionProps {
  contractorId: string;
  contractorName: string;
}

export default function StaffContractorDocumentsSection({
  contractorId,
  contractorName,
}: StaffContractorDocumentsSectionProps) {
  const [documents, setDocuments] = useState<StaffVerificationDocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload Form State
  const [documentType, setDocumentType] = useState('gst');
  const [file, setFile] = useState<File | null>(null);
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);

  const fetchDocs = () => {
    if (!contractorId) return;
    setLoading(true);
    getStaffContractorDocuments(contractorId)
      .then(({ data }) => setDocuments(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDocs();
  }, [contractorId]);

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

      await uploadStaffContractorDocument(contractorId, formData);
      setSuccessMsg('Document uploaded successfully to Cloudflare R2 on behalf of contractor!');
      setFile(null);
      setIssueDate('');
      setExpiryDate('');
      setShowUploadForm(false);
      fetchDocs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  const handleView = async (documentId: string) => {
    try {
      const { data } = await getStaffDocumentSignedUrl(contractorId, documentId, 'view');
      if (data?.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to generate document view URL.');
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document from the contractor record?')) return;
    try {
      await deleteStaffContractorDocument(contractorId, documentId);
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
    <div className="staff-docs-section">
      <div className="staff-docs-header">
        <div>
          <h3 className="staff-docs-title">Contractor Compliance & KYC Documents</h3>
          <p className="staff-docs-subtitle">
            Manage GST, PAN, Labour Licenses, EPF/ESIC, and Trade Certifications for {contractorName}.
          </p>
        </div>
        <button
          type="button"
          className="staff-docs-toggle-btn"
          onClick={() => setShowUploadForm(!showUploadForm)}
        >
          {showUploadForm ? 'Cancel Upload' : '+ Upload Document on Behalf of Contractor'}
        </button>
      </div>

      {error && <div className="staff-docs-alert staff-docs-alert--error">{error}</div>}
      {successMsg && <div className="staff-docs-alert staff-docs-alert--success">{successMsg}</div>}

      {/* Inline Upload Form */}
      {showUploadForm && (
        <div className="staff-docs-upload-card">
          <h4 className="staff-docs-upload-title">📤 Upload Document for {contractorName}</h4>
          <form onSubmit={handleUpload} className="staff-docs-form">
            <div className="staff-docs-form-grid">
              <div className="staff-docs-field">
                <label>Document Category *</label>
                <select value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
                  <option value="gst">GST Registration Certificate</option>
                  <option value="business_registration">Business / Company Registration</option>
                  <option value="pan">PAN Card (Tax Identification)</option>
                  <option value="aadhaar">Aadhaar Card (Authorized Signatory)</option>
                  <option value="labor_license">Labour License / Contract Labour Act</option>
                  <option value="msme">MSME / Udyam Registration</option>
                  <option value="pf_registration">EPF Registration Certificate</option>
                  <option value="esic_registration">ESIC Registration Certificate</option>
                  <option value="industry_license">Industry / Trade License</option>
                  <option value="safety_certification">Safety / ISO / Quality Certification</option>
                  <option value="compliance_certificate">Statutory Compliance Certificate</option>
                  <option value="other_certificate">Other Certificate</option>
                  <option value="other">Other Supporting Document</option>
                </select>
              </div>

              <div className="staff-docs-field">
                <label>Select File (PDF, PNG, JPG, WebP) *</label>
                <input
                  type="file"
                  required
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>

              <div className="staff-docs-field">
                <label>Issue Date (Optional)</label>
                <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
              </div>

              <div className="staff-docs-field">
                <label>Expiry Date (Optional)</label>
                <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
              </div>
            </div>

            <div className="staff-docs-form-actions">
              <button
                type="button"
                className="staff-docs-btn staff-docs-btn--cancel"
                onClick={() => setShowUploadForm(false)}
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="staff-docs-btn staff-docs-btn--submit"
                disabled={uploading}
              >
                {uploading ? 'Uploading to R2 Storage…' : 'Upload Document'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Documents List Table */}
      <div className="staff-docs-table-card">
        {loading ? (
          <LoadingState label="Loading contractor documents…" />
        ) : documents.length === 0 ? (
          <EmptyState
            icon="📄"
            title="No Documents on File"
            subtitle="No verification or compliance documents uploaded yet for this contractor. Use the button above to attach files."
          />
        ) : (
          <div className="staff-docs-table-wrapper">
            <table className="staff-docs-table">
              <thead>
                <tr>
                  <th>Document Type</th>
                  <th>File Name</th>
                  <th>Size</th>
                  <th>Issue Date</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <span className="staff-docs-type-badge">
                        {CONTRACTOR_DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
                      </span>
                    </td>
                    <td className="staff-docs-filename">{doc.file_name}</td>
                    <td>{formatSize(doc.size_bytes)}</td>
                    <td>{doc.issue_date || '—'}</td>
                    <td>{doc.expiry_date || '—'}</td>
                    <td>
                      <span className={`staff-docs-status-pill staff-docs-status-pill--${doc.status}`}>
                        {doc.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="staff-docs-actions">
                        <button
                          type="button"
                          className="staff-docs-action-btn staff-docs-action-btn--view"
                          onClick={() => handleView(doc.id)}
                          title="View / Download in new tab"
                        >
                          👁️ View
                        </button>
                        <button
                          type="button"
                          className="staff-docs-action-btn staff-docs-action-btn--delete"
                          onClick={() => handleDelete(doc.id)}
                          title="Delete document"
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
