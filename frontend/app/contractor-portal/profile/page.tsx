'use client';

import React, { useEffect, useState, FormEvent } from 'react';
import { getMyProfile, updateMyProfile, type ContractorProfile } from '@/lib/api/profile';
import LoadingState from '@/components/ui/LoadingState';
import ListedBadge from '@/components/ui/ListedBadge';
import './contractor-profile.css';

export default function ContractorProfilePage() {
  const [profile, setProfile] = useState<ContractorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [companyName, setCompanyName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [yearsExperience, setYearsExperience] = useState<number | ''>('');
  const [workforceSize, setWorkforceSize] = useState<number | ''>('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    getMyProfile()
      .then(({ data }) => {
        if (data.role === 'contractor') {
          setProfile(data as ContractorProfile);
          setCompanyName(data.company_name || '');
          setCity(data.city || '');
          setState(data.state || '');
          setYearsExperience(data.years_experience ?? '');
          setWorkforceSize(data.workforce_size ?? '');
          setDescription(data.description || '');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await updateMyProfile({
        companyName,
        city: city || undefined,
        state: state || undefined,
        yearsExperience: yearsExperience === '' ? undefined : Number(yearsExperience),
        workforceSize: workforceSize === '' ? undefined : Number(workforceSize),
        description: description || undefined,
      });

      setMessage({ type: 'success', text: 'Company profile updated successfully!' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update profile. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile) {
    return <LoadingState label="Loading Profile…" />;
  }

  return (
    <div className="contractor-profile-page">
      <div className="contractor-profile-header">
        <div>
          <h1 className="contractor-profile-title">Company Profile</h1>
          <p className="contractor-profile-subtitle">
            Update your workforce details and operational information.
          </p>
        </div>
        <ListedBadge />
      </div>

      {message && (
        <div className={`contractor-profile-alert contractor-profile-alert--${message.type}`}>
          {message.text}
        </div>
      )}

      <form className="contractor-profile-form" onSubmit={handleSubmit}>
        <div className="contractor-profile-card">
          <h3 className="contractor-profile-section-title">Basic Information</h3>
          
          <div className="contractor-profile-form-grid">
            <div className="contractor-profile-field">
              <label>Company / Contractor Name</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Apex Manpower Services"
              />
            </div>

            <div className="contractor-profile-field">
              <label>City / Base Location</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Pune"
              />
            </div>

            <div className="contractor-profile-field">
              <label>State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. Maharashtra"
              />
            </div>

            <div className="contractor-profile-field">
              <label>Workforce Size (Total Workers)</label>
              <input
                type="number"
                min={0}
                value={workforceSize}
                onChange={(e) => setWorkforceSize(e.target.value ? Number(e.target.value) : '')}
                placeholder="e.g. 50"
              />
            </div>

            <div className="contractor-profile-field">
              <label>Years of Experience</label>
              <input
                type="number"
                min={0}
                value={yearsExperience}
                onChange={(e) => setYearsExperience(e.target.value ? Number(e.target.value) : '')}
                placeholder="e.g. 8"
              />
            </div>
          </div>

          <div className="contractor-profile-field contractor-profile-field--full" style={{ marginTop: '16px' }}>
            <label>Company Description / Overview</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your specialization, skilled trades available, past projects..."
            />
          </div>
        </div>

        <div className="contractor-profile-actions">
          <button type="submit" className="contractor-profile-save-btn" disabled={saving}>
            {saving ? 'Saving Changes...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
