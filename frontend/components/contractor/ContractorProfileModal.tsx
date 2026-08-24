'use client';

import React, { useState, FormEvent } from 'react';
import { updateMyProfile, type ContractorProfile } from '@/lib/api/profile';
import './ContractorProfileModal.css';

interface ContractorProfileModalProps {
  initialProfile?: ContractorProfile | null;
  onComplete: () => void;
  allowClose?: boolean;
}

export default function ContractorProfileModal({
  initialProfile,
  onComplete,
  allowClose = false,
}: ContractorProfileModalProps) {
  const [companyName, setCompanyName] = useState(initialProfile?.company_name || '');
  const [phone, setPhone] = useState(initialProfile?.phone || '');
  const [workforceSize, setWorkforceSize] = useState<number | ''>(
    initialProfile?.workforce_size !== null && initialProfile?.workforce_size !== undefined
      ? initialProfile.workforce_size
      : '',
  );
  const [industry, setIndustry] = useState(initialProfile?.industry || '');
  const [skills, setSkills] = useState(
    Array.isArray(initialProfile?.skills) ? initialProfile.skills.join(', ') : '',
  );
  const [city, setCity] = useState(initialProfile?.city || '');
  const [state, setState] = useState(initialProfile?.state || '');
  const [serviceAreas, setServiceAreas] = useState(
    Array.isArray(initialProfile?.service_areas) ? initialProfile.service_areas.join(', ') : '',
  );
  const [yearsExperience, setYearsExperience] = useState<number | ''>(
    initialProfile?.years_experience !== null && initialProfile?.years_experience !== undefined
      ? initialProfile.years_experience
      : '',
  );
  const [availability, setAvailability] = useState(initialProfile?.availability || 'AVAILABLE');
  const [description, setDescription] = useState(initialProfile?.description || '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError('Company name is required');
      return;
    }
    if (workforceSize === '' || Number(workforceSize) < 0) {
      setError('Valid workforce size is required');
      return;
    }
    if (!industry.trim()) {
      setError('Industry is required for opportunity matching');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await updateMyProfile({
        companyName: companyName.trim(),
        phone: phone.trim() || undefined,
        workforceSize: Number(workforceSize),
        industry: industry.trim(),
        skills: skills.trim(),
        city: city.trim(),
        state: state.trim(),
        serviceAreas: serviceAreas.trim(),
        yearsExperience: yearsExperience === '' ? undefined : Number(yearsExperience),
        availability,
        description: description.trim() || undefined,
      });

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save contractor profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cp-modal-backdrop">
      <div className="cp-modal-content">
        <div className="cp-modal-header">
          <div className="cp-modal-header__info">
            <span className="cp-modal-badge">Profile Setup Required</span>
            <h2>Create Contractor Profile</h2>
            <p>
              Complete your company profile to start viewing and applying to matching manpower opportunities.
            </p>
          </div>
          {allowClose && (
            <button type="button" className="cp-modal-close" onClick={onComplete}>
              ×
            </button>
          )}
        </div>

        {error && <div className="cp-modal-error">{error}</div>}

        <form onSubmit={handleSubmit} className="cp-modal-form">
          <div className="cp-modal-grid">
            <div className="cp-modal-field">
              <label>Company Name *</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Apex Engineering Services"
              />
            </div>

            <div className="cp-modal-field">
              <label>Contact Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 9876543210"
              />
            </div>

            <div className="cp-modal-field">
              <label>Workforce Size (Workers Count) *</label>
              <input
                type="number"
                required
                min={0}
                value={workforceSize}
                onChange={(e) => setWorkforceSize(e.target.value ? Number(e.target.value) : '')}
                placeholder="e.g. 25"
              />
            </div>

            <div className="cp-modal-field">
              <label>Industry *</label>
              <input
                type="text"
                required
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. Automotive, Manufacturing, Construction"
              />
            </div>

            <div className="cp-modal-field">
              <label>Availability *</label>
              <select value={availability} onChange={(e) => setAvailability(e.target.value)}>
                <option value="AVAILABLE">AVAILABLE (Open for work)</option>
                <option value="CURRENTLY_AT_CAPACITY">CURRENTLY AT CAPACITY</option>
                <option value="NOT_AVAILABLE">NOT AVAILABLE</option>
                <option value="PAUSED">PAUSED</option>
              </select>
            </div>

            <div className="cp-modal-field cp-modal-field--full">
              <label>Skills & Specializations (Comma separated)</label>
              <input
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="e.g. Welding, Assembly, Electrical, CNC Operation"
              />
            </div>

            <div className="cp-modal-field">
              <label>City / Base Location</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Pune"
              />
            </div>

            <div className="cp-modal-field">
              <label>State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. Maharashtra"
              />
            </div>

            <div className="cp-modal-field">
              <label>Service Areas (Comma separated)</label>
              <input
                type="text"
                value={serviceAreas}
                onChange={(e) => setServiceAreas(e.target.value)}
                placeholder="e.g. Pune, Pimpri-Chinchwad, Chakan, Talegaon"
              />
            </div>

            <div className="cp-modal-field">
              <label>Years of Experience</label>
              <input
                type="number"
                min={0}
                value={yearsExperience}
                onChange={(e) => setYearsExperience(e.target.value ? Number(e.target.value) : '')}
                placeholder="e.g. 5"
              />
            </div>
          </div>

          <div className="cp-modal-field" style={{ marginTop: '14px' }}>
            <label>Company Description / Overview</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief overview of your workforce services and operational capabilities..."
            />
          </div>

          <div className="cp-modal-actions">
            <button type="submit" className="cp-modal-submit-btn" disabled={saving}>
              {saving ? 'Saving Profile…' : 'Save & View Matching Opportunities'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
