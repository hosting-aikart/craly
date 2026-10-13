'use client';

import React, { useState, FormEvent } from 'react';
import { updateMyProfile, type ContractorProfile } from '@/lib/api/profile';
import PhoneInput from '@/components/ui/PhoneInput';
import { validatePhoneNumber } from '@/lib/util/phoneValidation';
import IndianStateSelect from '@/components/ui/IndianStateSelect';
import SkillMultiSelect from '@/components/ui/SkillMultiSelect';
import IndustrySelect from '@/components/ui/IndustrySelect';
import AvailabilitySelect from '@/components/ui/AvailabilitySelect';
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
  
  // Skills list state as an array of tags/chips
  const [skillsList, setSkillsList] = useState<string[]>(() => {
    if (Array.isArray(initialProfile?.skills)) return initialProfile.skills;
    if (typeof initialProfile?.skills === 'string') {
      return (initialProfile.skills as string).split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
  });

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
      setError('Please select or enter your Industry');
      return;
    }
    if (phone.trim()) {
      const pCheck = validatePhoneNumber(phone);
      if (!pCheck.isValid) {
        setError(pCheck.error || 'Please enter a valid contact phone number.');
        return;
      }
    }

    setSaving(true);
    setError('');

    try {
      await updateMyProfile({
        companyName: companyName.trim(),
        phone: phone.trim() || undefined,
        workforceSize: Number(workforceSize),
        industry: industry.trim(),
        skills: skillsList,
        city: city.trim(),
        state: state.trim(),
        serviceAreas: serviceAreas.trim(),
        yearsExperience: yearsExperience === '' ? undefined : Number(yearsExperience),
        availability,
        description: description.trim() || undefined,
      });

      onComplete();
    } catch (err) {
      // User-friendly error message format
      let friendlyMsg = 'Failed to save contractor profile. Please check your details and try again.';
      if (err instanceof Error && err.message) {
        if (err.message.includes('CASE types') || err.message.includes('PostgresError') || err.message.includes('500')) {
          friendlyMsg = 'Database processing error occurred. Our team has been notified. Please try again.';
        } else {
          friendlyMsg = err.message;
        }
      }
      setError(friendlyMsg);
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
              <PhoneInput value={phone} onChange={setPhone} />
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
              <IndustrySelect
                value={industry}
                onChange={setIndustry}
                placeholder="Select or search industry sector"
                required
              />
            </div>

            <div className="cp-modal-field">
              <label>Availability *</label>
              <AvailabilitySelect
                value={availability}
                onChange={setAvailability}
                required
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

            {/* ── Skills & Specializations Picker ─────────────────── */}
            <div className="cp-modal-field cp-modal-field--full">
              <label>Skills & Specializations (Select multiple)</label>
              <SkillMultiSelect
                value={skillsList}
                onChange={setSkillsList}
                placeholder="Search & select trade skills…"
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
              <IndianStateSelect
                value={state}
                onChange={setState}
                placeholder="Select State"
              />
            </div>

            <div className="cp-modal-field cp-modal-field--full">
              <label>Service Areas (Comma separated)</label>
              <input
                type="text"
                value={serviceAreas}
                onChange={(e) => setServiceAreas(e.target.value)}
                placeholder="e.g. Pune, Pimpri-Chinchwad, Chakan, Talegaon"
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

