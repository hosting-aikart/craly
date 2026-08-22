'use client';

import React, { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createStaffContractor } from '@/lib/api/staff';
import './staff-new-contractor.css';

export default function AddContractorPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
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

    setSubmitting(true);
    setError('');

    try {
      const skills = skillsInput.split(',').map((s) => s.trim()).filter(Boolean);
      const serviceAreas = serviceAreasInput.split(',').map((s) => s.trim()).filter(Boolean);

      const res = await createStaffContractor({
        companyName,
        contactPerson: contactPerson || undefined,
        email: email || undefined,
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
      setTimeout(() => {
        router.push(`/staff/contractors/${res.data.id}`);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create contractor profile');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="staff-new-contractor-page">
      <Link href="/staff/contractors" className="back-link">
        ← Back to Contractors List
      </Link>

      <div className="form-card">
        <div className="form-card__header">
          <h2>+ Add New Contractor Profile</h2>
          <p>Manually provision a contractor entity for platform operations and match-making.</p>
        </div>

        {error && <div className="form-alert form-alert--error">{error}</div>}
        {success && <div className="form-alert form-alert--success">{success}</div>}

        <form onSubmit={handleSubmit} className="contractor-form">
          <div className="form-grid">
            <div className="form-group col-span-2">
              <label>Company Name *</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Workforce & Technical Services"
              />
            </div>

            <div className="form-group">
              <label>Contact Person Name</label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
              />
            </div>

            <div className="form-group">
              <label>Contact Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
              />
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. contact@acmeworkforce.com"
              />
            </div>

            <div className="form-group">
              <label>Primary Industry / Trade</label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. Manufacturing, Construction, Logistics"
              />
            </div>

            <div className="form-group">
              <label>City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Pune"
              />
            </div>

            <div className="form-group">
              <label>State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. Maharashtra"
              />
            </div>

            <div className="form-group">
              <label>Workforce Size (Workers Count)</label>
              <input
                type="number"
                min={1}
                value={workforceSize}
                onChange={(e) => setWorkforceSize(e.target.value ? Number(e.target.value) : '')}
                placeholder="e.g. 50"
              />
            </div>

            <div className="form-group">
              <label>Years of Experience</label>
              <input
                type="number"
                min={0}
                value={yearsExperience}
                onChange={(e) => setYearsExperience(e.target.value ? Number(e.target.value) : '')}
                placeholder="e.g. 5"
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
              <label>Skills & Trades (Comma separated)</label>
              <input
                type="text"
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                placeholder="e.g. Welding, Assembly, Fitting, Electrical, Quality Control"
              />
            </div>

            <div className="form-group col-span-2">
              <label>Service Areas / Regions (Comma separated)</label>
              <input
                type="text"
                value={serviceAreasInput}
                onChange={(e) => setServiceAreasInput(e.target.value)}
                placeholder="e.g. Chakan, Pimpri-Chinchwad, Bhosari, Talegaon"
              />
            </div>

            <div className="form-group col-span-2">
              <label>Staff Internal Notes</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal verification notes, background details, or staff observations..."
              />
            </div>
          </div>

          <div className="form-actions">
            <Link href="/staff/contractors" className="btn-cancel">
              Cancel
            </Link>
            <button type="submit" className="btn-submit" disabled={submitting}>
              {submitting ? 'Creating Contractor Profile…' : 'Create Contractor Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
