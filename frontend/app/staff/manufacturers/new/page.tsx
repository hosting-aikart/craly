'use client';

import React, { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createStaffManufacturer } from '@/lib/api/staff';
import PhoneInput from '@/components/ui/PhoneInput';
import { validatePhoneNumber } from '@/lib/util/phoneValidation';
import IndianStateSelect from '@/components/ui/IndianStateSelect';
import { IconArrowLeft, IconCheck, IconAlertTriangle } from '@/components/ui/Icons';
import '@/app/staff/contractors/new/staff-new-contractor.css';

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function AddManufacturerPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdId, setCreatedId] = useState('');

  // Form state
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(generateTempPassword());
  const [phone, setPhone] = useState('');
  const [industry, setIndustry] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError('Company name is required.');
      return;
    }
    if (!email.trim()) {
      setError('Email is required as it becomes the manufacturer\'s platform login.');
      return;
    }
    if (password.length < 8) {
      setError('Temporary password must be at least 8 characters.');
      return;
    }
    if (phone.trim()) {
      const pCheck = validatePhoneNumber(phone);
      if (!pCheck.isValid) {
        setError(pCheck.error || 'Please enter a valid phone number.');
        return;
      }
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await createStaffManufacturer({
        companyName,
        email,
        password,
        phone: phone || undefined,
        industry: industry || undefined,
        city: city || undefined,
        state: state || undefined,
      });

      setSuccess(res.message || 'Manufacturer account created successfully!');
      setCreatedId(res.data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create manufacturer account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="staff-new-contractor-page">
      <Link href="/staff/manufacturers" className="staff-new-back-link">
        <IconArrowLeft size={15} style={{ marginRight: 6 }} /> Back to Manufacturers Directory
      </Link>

      <div className="staff-new-form-card">
        <div className="staff-new-form-card__header">
          <h2>Create Manufacturer Account</h2>
          <p>Provision a new enterprise manufacturer account. The manufacturer will be able to log in immediately, publish manpower requirements, and review contractor applications.</p>
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
              <div><strong>Role:</strong> Manufacturer (business)</div>
            </div>
            <div style={{ marginTop: '14px', display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="staff-new-btn-submit"
                onClick={() => router.push(`/staff/manufacturers/${createdId}`)}
              >
                View Manufacturer Details →
              </button>
              <button
                type="button"
                className="staff-new-btn-cancel"
                onClick={() => {
                  setSuccess('');
                  setCompanyName('');
                  setEmail('');
                  setPassword(generateTempPassword());
                  setPhone('');
                  setIndustry('');
                  setCity('');
                  setState('');
                }}
              >
                Create Another Manufacturer
              </button>
            </div>
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="staff-new-contractor-form">
            <div className="staff-new-form-grid">
              <div className="staff-new-form-group staff-new-col-span-2">
                <label>Company / Plant / Enterprise Name *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Tata Motors Ltd / Bharat Heavy Electricals"
                />
              </div>

              <div className="staff-new-form-group">
                <label>Login Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. plant.hr@enterprise.com"
                />
                <p className="staff-new-form-hint">This will be the manufacturer's username on Craly.</p>
              </div>

              <div className="staff-new-form-group">
                <label>Initial Temporary Password *</label>
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
                <p className="staff-new-form-hint">Share this initial credential securely with the manufacturer.</p>
              </div>

              <div className="staff-new-form-group">
                <label>Contact Phone Number</label>
                <PhoneInput value={phone} onChange={setPhone} />
              </div>

              <div className="staff-new-form-group">
                <label>Industry / Manufacturing Sector</label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. Automotive, Heavy Machinery, Textiles, Electronics"
                />
              </div>

              <div className="staff-new-form-group">
                <label>City / Industrial Hub</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Pune, Chennai, Ahmedabad"
                />
              </div>

              <div className="staff-new-form-group">
                <label>State / Region</label>
                <IndianStateSelect
                  value={state}
                  onChange={setState}
                  placeholder="Select State"
                />
              </div>
            </div>

            <div className="staff-new-form-actions">
              <Link href="/staff/manufacturers" className="staff-new-btn-cancel">
                Cancel
              </Link>
              <button type="submit" className="staff-new-btn-submit" disabled={submitting}>
                {submitting ? 'Creating Manufacturer…' : 'Create Manufacturer Account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
