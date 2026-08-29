'use client';

import React, { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createStaffContractor } from '@/lib/api/staff';
import PhoneInput from '@/components/ui/PhoneInput';
import CustomSelect, { type SelectOption } from '@/components/ui/CustomSelect';
import { IconArrowLeft, IconCheck, IconAlertTriangle } from '@/components/ui/Icons';
import './staff-new-contractor.css';

const AVAILABILITY_OPTIONS: SelectOption[] = [
  { value: 'AVAILABLE', label: 'AVAILABLE' },
  { value: 'CURRENTLY_AT_CAPACITY', label: 'CURRENTLY AT CAPACITY' },
  { value: 'NOT_AVAILABLE', label: 'NOT AVAILABLE' },
  { value: 'PAUSED', label: 'PAUSED' },
  { value: 'SUSPENDED', label: 'SUSPENDED' },
];

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function AddContractorPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdId, setCreatedId] = useState('');

  // Form state
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(generateTempPassword());
  const [industry, setIndustry] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [workforceSize, setWorkforceSize] = useState<number | ''>('');
  const [yearsExperience, setYearsExperience] = useState<number | ''>('');
  const [skillsInput, setSkillsInput] = useState('');
  const [serviceAreasInput, setServiceAreasInput] = useState('');
  const [availability, setAvailability] = useState<'AVAILABLE' | 'CURRENTLY_AT_CAPACITY' | 'NOT_AVAILABLE' | 'PAUSED' | 'SUSPENDED'>('AVAILABLE');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError('Company name is required.');
      return;
    }
    if (!email.trim()) {
      setError('Email is required as it becomes the contractor\'s platform login.');
      return;
    }
    if (password.length < 8) {
      setError('Temporary password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const skills = skillsInput.split(',').map((s) => s.trim()).filter(Boolean);
      const serviceAreas = serviceAreasInput.split(',').map((s) => s.trim()).filter(Boolean);

      const res = await createStaffContractor({
        companyName,
        contactPerson: contactPerson || undefined,
        email,
        password,
        phone: phone || undefined,
        industry: industry || undefined,
        city: city || undefined,
        state: state || undefined,
        workforceSize: workforceSize === '' ? undefined : Number(workforceSize),
        yearsExperience: yearsExperience === '' ? undefined : Number(yearsExperience),
        skills: skills.length > 0 ? skills : undefined,
        serviceAreas: serviceAreas.length > 0 ? serviceAreas : undefined,
        availability,
        notes: notes || undefined,
      });

      setSuccess(res.message || 'Contractor profile created successfully!');
      setCreatedId(res.data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create contractor profile');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="staff-new-contractor-page">
      <Link href="/staff/contractors" className="staff-new-back-link">
        <IconArrowLeft size={15} style={{ marginRight: 6 }} /> Back to Contractors Directory
      </Link>

      <div className="staff-new-form-card">
        <div className="staff-new-form-card__header">
          <h2>Add New Contractor Profile</h2>
          <p>Manually provision a contractor entity for platform operations, verified directory, and match-making.</p>
        </div>

        {error && (
          <div className="staff-new-form-alert staff-new-form-alert--error">
            <IconAlertTriangle size={16} style={{ marginRight: 8, flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="staff-new-form-alert staff-new-form-alert--success">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconCheck size={18} />
              <strong>{success}</strong>
            </div>
            <div className="staff-new-credentials-box">
              <div><strong>Login Email:</strong> {email}</div>
              <div><strong>Initial Password:</strong> {password}</div>
            </div>
            <div style={{ marginTop: '14px' }}>
              <button
                type="button"
                className="staff-new-btn-submit"
                onClick={() => router.push(`/staff/contractors/${createdId}`)}
              >
                View Contractor Profile →
              </button>
            </div>
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="staff-new-contractor-form">
            <div className="staff-new-form-grid">
              <div className="staff-new-form-group staff-new-col-span-2">
                <label>Company / Organization Name *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Apex Industrial Workforce Solutions Pvt Ltd"
                />
              </div>

              <div className="staff-new-form-group">
                <label>Contact Person Name</label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="e.g. Rajesh Kumar"
                />
              </div>

              <div className="staff-new-form-group">
                <label>Contact Phone</label>
                <PhoneInput value={phone} onChange={setPhone} />
              </div>

              <div className="staff-new-form-group">
                <label>Login Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. contact@apexworkforce.com"
                />
                <p className="staff-new-form-hint">This will be the contractor's username on Craly.</p>
              </div>

              <div className="staff-new-form-group">
                <label>Temporary Initial Password *</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="staff-new-btn-regen"
                    onClick={() => setPassword(generateTempPassword())}
                  >
                    Regenerate
                  </button>
                </div>
                <p className="staff-new-form-hint">Share this initial credential securely with the contractor.</p>
              </div>

              <div className="staff-new-form-group">
                <label>Primary Industry / Trade Domain</label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. Heavy Manufacturing, Fabrication, CNC"
                />
              </div>

              <div className="staff-new-form-group">
                <label>City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Pune"
                />
              </div>

              <div className="staff-new-form-group">
                <label>State / Region</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Maharashtra"
                />
              </div>

              <div className="staff-new-form-group">
                <label>Workforce Size (Headcount)</label>
                <input
                  type="number"
                  min={1}
                  value={workforceSize}
                  onChange={(e) => setWorkforceSize(e.target.value ? Number(e.target.value) : '')}
                  placeholder="e.g. 50"
                />
              </div>

              <div className="staff-new-form-group">
                <label>Years in Operation</label>
                <input
                  type="number"
                  min={0}
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(e.target.value ? Number(e.target.value) : '')}
                  placeholder="e.g. 8"
                />
              </div>

              <div className="staff-new-form-group">
                <label>Initial Availability Status</label>
                <CustomSelect
                  options={AVAILABILITY_OPTIONS}
                  value={availability}
                  onChange={(val) => setAvailability(val as any)}
                />
              </div>

              <div className="staff-new-form-group staff-new-col-span-2">
                <label>Skills & Trades (Comma separated)</label>
                <input
                  type="text"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  placeholder="e.g. MIG Welding, CNC Milling, Assembly Fitting, Quality Inspection"
                />
              </div>

              <div className="staff-new-form-group staff-new-col-span-2">
                <label>Service Coverage Areas (Comma separated)</label>
                <input
                  type="text"
                  value={serviceAreasInput}
                  onChange={(e) => setServiceAreasInput(e.target.value)}
                  placeholder="e.g. Chakan, Talegaon, Pimpri-Chinchwad, Bhosari"
                />
              </div>

              <div className="staff-new-form-group staff-new-col-span-2">
                <label>Staff Internal Verification Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal audit notes, reference background, or operational remarks..."
                />
              </div>
            </div>

            <div className="staff-new-form-actions">
              <Link href="/staff/contractors" className="staff-new-btn-cancel">
                Cancel
              </Link>
              <button type="submit" className="staff-new-btn-submit" disabled={submitting}>
                {submitting ? 'Creating Contractor Profile…' : 'Create Contractor Profile'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
