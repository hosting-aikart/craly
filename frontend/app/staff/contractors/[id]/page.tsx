'use client';

import React, { useEffect, useState, FormEvent, use } from 'react';
import Link from 'next/link';
import { getStaffContractorById, updateStaffContractor, updateStaffContractorListingStatus, type StaffContractorDetail } from '@/lib/api/staff';
import LoadingState from '@/components/ui/LoadingState';
import PhoneInput from '@/components/ui/PhoneInput';
import UnlistContractorModal from '@/components/staff/UnlistContractorModal';
import StaffContractorDocumentsSection from '@/components/staff/StaffContractorDocumentsSection';
import './staff-contractor-detail.css';

export default function StaffContractorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [contractor, setContractor] = useState<StaffContractorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Unlist modal state
  const [modalOpen, setModalOpen] = useState(false);

  // Editable state
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [workforceSize, setWorkforceSize] = useState<number | ''>('');
  const [yearsExperience, setYearsExperience] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [availability, setAvailability] = useState<'AVAILABLE' | 'CURRENTLY_AT_CAPACITY' | 'NOT_AVAILABLE' | 'PAUSED' | 'SUSPENDED'>('AVAILABLE');
  const [availabilityNote, setAvailabilityNote] = useState('');
  const [serviceAreasInput, setServiceAreasInput] = useState('');

  useEffect(() => {
    getStaffContractorById(resolvedParams.id)
      .then(({ data }) => {
        setContractor(data);
        setCompanyName(data.company_name);
        setPhone(data.phone || '');
        setCity(data.city || '');
        setState(data.state || '');
        setWorkforceSize(data.workforce_size || '');
        setYearsExperience(data.years_experience || '');
        setDescription(data.description || '');
        setAvailability((data.availability as any) || 'AVAILABLE');
        setAvailabilityNote(data.availability_note || '');
        setServiceAreasInput((data.service_areas || []).join(', '));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Contractor not found'))
      .finally(() => setLoading(false));
  }, [resolvedParams.id]);

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const serviceAreas = serviceAreasInput.split(',').map((s) => s.trim()).filter(Boolean);

      const res = await updateStaffContractor(resolvedParams.id, {
        companyName,
        phone,
        city,
        state,
        workforceSize: workforceSize === '' ? undefined : Number(workforceSize),
        yearsExperience: yearsExperience === '' ? undefined : Number(yearsExperience),
        description,
        availability,
        availabilityNote,
        serviceAreas,
      });

      setContractor(res.data);
      setSuccess('Contractor profile updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update contractor');
    } finally {
      setSaving(false);
    }
  };

  const handleListingUpdateSuccess = (isUnlisted: boolean, reason?: string) => {
    if (!contractor) return;
    setContractor({
      ...contractor,
      is_unlisted: isUnlisted,
      unlisted_reason: isUnlisted ? (reason || null) : null,
      unlisted_at: isUnlisted ? new Date().toISOString() : null,
    });
    setSuccess(isUnlisted ? 'Contractor unlisted from public directory.' : 'Contractor relisted to public directory.');
  };

  if (loading) {
    return <LoadingState label="Loading Contractor Profile…" />;
  }

  if (error && !contractor) {
    return (
      <div className="staff-contractor-detail-page">
        <Link href="/staff/contractors" className="back-link">
          ← Back to Contractors
        </Link>
        <div className="error-card">{error}</div>
      </div>
    );
  }

  if (!contractor) return null;

  return (
    <div className="staff-contractor-detail-page">
      <Link href="/staff/contractors" className="back-link">
        ← Back to Contractors List
      </Link>

      {contractor.is_unlisted && (
        <div className="listing-banner-unlisted">
          <div style={{ fontSize: '20px', lineHeight: 1 }}>🚫</div>
          <div>
            <strong>This contractor profile is currently UNLISTED.</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
              It is hidden from the public directory, marketplace search, and direct links.
              {contractor.unlisted_reason && <> <strong>Reason:</strong> {contractor.unlisted_reason}.</>}
              {contractor.unlisted_at && <> (Unlisted on {new Date(contractor.unlisted_at).toLocaleDateString()})</>}
            </p>
          </div>
        </div>
      )}

      <div className="profile-header-card">
        <div>
          <span className="profile-id-tag">ID: {contractor.id}</span>
          <h1 className="profile-title">{contractor.company_name}</h1>
          <p className="profile-meta">
            Added on {new Date(contractor.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="profile-status-box">
          <span className={`status-pill status-pill--${contractor.availability.toLowerCase()}`}>
            {contractor.availability.replace(/_/g, ' ')}
          </span>
          <span className="verification-label">
            Verification: <strong>{contractor.verification_status.toUpperCase()}</strong>
          </span>
          <span className={`listing-badge ${contractor.is_unlisted ? 'listing-badge--unlisted' : 'listing-badge--listed'}`}>
            {contractor.is_unlisted ? '🚫 Unlisted' : '🌐 Publicly Listed'}
          </span>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className={`btn-listing-action ${contractor.is_unlisted ? 'btn-listing-action--relist' : 'btn-listing-action--unlist'}`}
          >
            {contractor.is_unlisted ? 'Relist Profile' : 'Unlist Profile'}
          </button>
        </div>
      </div>

      {error && <div className="form-alert form-alert--error">{error}</div>}
      {success && <div className="form-alert form-alert--success">{success}</div>}

      <div className="profile-edit-card">
        <h3 className="section-title">Edit Contractor Profile</h3>

        <form onSubmit={handleUpdate} className="edit-form">
          <div className="form-grid">
            <div className="form-group col-span-2">
              <label>Company Name *</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Contact Phone</label>
              <PhoneInput value={phone} onChange={setPhone} />
            </div>

            <div className="form-group">
              <label>City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Workforce Size (Workers Count)</label>
              <input
                type="number"
                min={0}
                value={workforceSize}
                onChange={(e) => setWorkforceSize(e.target.value ? Number(e.target.value) : '')}
              />
            </div>

            <div className="form-group">
              <label>Years of Experience</label>
              <input
                type="number"
                min={0}
                value={yearsExperience}
                onChange={(e) => setYearsExperience(e.target.value ? Number(e.target.value) : '')}
              />
            </div>

            <div className="form-group">
              <label>Availability Status</label>
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value as any)}
              >
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="CURRENTLY_AT_CAPACITY">CURRENTLY AT CAPACITY</option>
                <option value="NOT_AVAILABLE">NOT AVAILABLE</option>
                <option value="PAUSED">PAUSED</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
            </div>

            <div className="form-group col-span-2">
              <label>Industry / Trade Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="form-group col-span-2">
              <label>Service Areas / Clusters (Comma separated)</label>
              <input
                type="text"
                value={serviceAreasInput}
                onChange={(e) => setServiceAreasInput(e.target.value)}
              />
            </div>

            <div className="form-group col-span-2">
              <label>Staff Internal Notes / Availability Note</label>
              <textarea
                rows={3}
                value={availabilityNote}
                onChange={(e) => setAvailabilityNote(e.target.value)}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? 'Saving Changes…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      <StaffContractorDocumentsSection
        contractorId={contractor.id}
        contractorName={contractor.company_name}
      />

      <UnlistContractorModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        contractorId={contractor.id}
        companyName={contractor.company_name}
        currentlyUnlisted={!!contractor.is_unlisted}
        currentReason={contractor.unlisted_reason}
        onSuccess={handleListingUpdateSuccess}
        apiUpdateFn={updateStaffContractorListingStatus}
      />
    </div>
  );
}
