'use client';

import React, { useState } from 'react';
import './UnlistContractorModal.css';

interface UnlistContractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractorId: string;
  companyName: string;
  currentlyUnlisted: boolean;
  currentReason?: string | null;
  onSuccess: (isUnlisted: boolean, reason?: string) => void;
  apiUpdateFn: (id: string, isUnlisted: boolean, reason?: string) => Promise<any>;
}

export default function UnlistContractorModal({
  isOpen,
  onClose,
  contractorId,
  companyName,
  currentlyUnlisted,
  currentReason,
  onSuccess,
  apiUpdateFn,
}: UnlistContractorModalProps) {
  const [reason, setReason] = useState(currentReason || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const willUnlist = !currentlyUnlisted;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await apiUpdateFn(contractorId, willUnlist, willUnlist ? reason.trim() : undefined);
      onSuccess(willUnlist, willUnlist ? reason.trim() : undefined);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update contractor listing status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="unlist-modal-backdrop" onClick={onClose}>
      <div className="unlist-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="unlist-modal-header">
          <div className="unlist-modal-icon-badge" data-action={willUnlist ? 'unlist' : 'relist'}>
            {willUnlist ? '🚫' : '🌐'}
          </div>
          <div>
            <h2 className="unlist-modal-title">
              {willUnlist ? 'Unlist Contractor Profile' : 'Relist Contractor Profile'}
            </h2>
            <p className="unlist-modal-subtitle">{companyName}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="unlist-modal-body">
            {willUnlist ? (
              <div className="unlist-modal-alert unlist-modal-alert--warning">
                <strong>Important:</strong> Unlisting will immediately hide this contractor from the public directory, search results, and direct discovery links. Existing bookings and internal staff records remain intact.
              </div>
            ) : (
              <div className="unlist-modal-alert unlist-modal-alert--success">
                Relisting will restore this contractor&apos;s visibility on the public directory, allowing businesses to discover and reach out to them.
              </div>
            )}

            {willUnlist && (
              <div className="unlist-modal-field">
                <label htmlFor="unlist-reason">
                  Reason for Unlisting <span className="optional-tag">(Optional)</span>
                </label>
                <textarea
                  id="unlist-reason"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. License renewal pending, Temporary administrative review, Inactive contact..."
                  disabled={loading}
                />
              </div>
            )}

            {error && <div className="unlist-modal-error">{error}</div>}
          </div>

          <div className="unlist-modal-footer">
            <button
              type="button"
              className="unlist-modal-btn unlist-modal-btn--secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`unlist-modal-btn ${willUnlist ? 'unlist-modal-btn--danger' : 'unlist-modal-btn--primary'}`}
              disabled={loading}
            >
              {loading
                ? (willUnlist ? 'Unlisting...' : 'Relisting...')
                : (willUnlist ? 'Confirm Unlist' : 'Confirm Relist')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
