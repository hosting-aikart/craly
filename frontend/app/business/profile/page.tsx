'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { getMyProfile, updateMyProfile, type BusinessProfile } from '@/lib/api/profile';
import { useAuth } from '@/lib/auth/useAuth';
import LoadingState from '@/components/ui/LoadingState';
import Button from '@/components/ui/Button';
import PhoneInput from '@/components/ui/PhoneInput';
import {
  IconBuilding,
  IconMapPin,
  IconShield,
  IconTarget,
  IconRequirements,
  IconUser,
} from '@/components/ui/Icons';
import './business-profile.css';

const INDUSTRY_SUGGESTIONS = [
  'EPC Construction',
  'Automotive Manufacturing',
  'Heavy Industrial',
  'Warehousing & Logistics',
  'Solar & Power Infrastructure',
  'Food & Beverages Processing',
  'Textile & Garments',
  'Chemicals & Pharmaceuticals',
];

export default function BusinessProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [industry, setIndustry] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [phone, setPhone] = useState('');

  const fetchProfile = () => {
    getMyProfile()
      .then(({ data }) => {
        if (data.role === 'business') {
          setProfile(data);
          setIndustry(data.industry ?? '');
          setCity(data.city ?? '');
          setState(data.state ?? '');
          setPhone(data.phone ?? '');
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await updateMyProfile({ industry, city, state, phone });
      setSuccess('Company profile details saved successfully!');
      // Update local profile object
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              industry: industry || null,
              city: city || null,
              state: state || null,
              phone: phone || null,
            }
          : prev
      );
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!profile) return;
    setIndustry(profile.industry ?? '');
    setCity(profile.city ?? '');
    setState(profile.state ?? '');
    setPhone(profile.phone ?? '');
    setError('');
    setSuccess('');
  };

  const hasChanges =
    profile &&
    (industry !== (profile.industry ?? '') ||
      city !== (profile.city ?? '') ||
      state !== (profile.state ?? '') ||
      phone !== (profile.phone ?? ''));

  return (
    <>
      <WorkspacePageHeader
        title="Company Profile"
        subtitle="Manage your business credentials, operating location, and contact parameters."
      />

      {loading ? (
        <LoadingState label="Loading profile…" />
      ) : profile && (
        <div className="bp-container">
          {/* Hero Banner */}
          <div className="bp-hero">
            <div className="bp-hero__left">
              <div className="bp-hero__avatar-wrap">
                <div className="bp-hero__avatar">
                  {profile.company_name.charAt(0).toUpperCase()}
                </div>
                <div className="bp-hero__badge-dot" title="Active Account" />
              </div>

              <div className="bp-hero__meta">
                <div className="bp-hero__title-row">
                  <h2 className="bp-hero__title">{profile.company_name}</h2>
                  <span className="bp-hero__tag">
                    <IconShield size={12} /> Verified Manufacturer
                  </span>
                </div>

                <p className="bp-hero__sub">
                  <span>Business Account</span>
                  {user?.email && (
                    <>
                      <span>•</span>
                      <span>{user.email}</span>
                    </>
                  )}
                  {(profile.city || profile.state) && (
                    <>
                      <span>•</span>
                      <span className="bp-hero__pill">
                        <IconMapPin size={13} />
                        {[profile.city, profile.state].filter(Boolean).join(', ')}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="bp-hero__right">
              <Link href="/business/requirements/new" className="bp-hero__action-btn">
                <IconRequirements size={15} /> + Post Requirement
              </Link>
            </div>
          </div>

          {/* Feedback Alerts */}
          {error && <div className="bp-alert bp-alert--error">⚠️ {error}</div>}
          {success && <div className="bp-alert bp-alert--success">✓ {success}</div>}

          {/* Main Grid */}
          <div className="bp-grid">
            {/* Left Column: Form Card */}
            <div className="bp-card">
              <div className="bp-card__header">
                <div className="bp-card__icon-box">
                  <IconBuilding size={20} />
                </div>
                <div>
                  <h3 className="bp-card__title">Company & Operating Details</h3>
                  <p className="bp-card__subtitle">
                    Keep your primary industry trade and contact phone updated for seamless matching.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSave} className="bp-form">
                {/* Industry Field with Quick Select Chips */}
                <div className="bp-form__field">
                  <label className="bp-form__label">
                    <IconTarget size={14} /> Industry / Trade Sector
                  </label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g. EPC Construction, Manufacturing, Logistics"
                    className="bp-form__input"
                  />
                  <div className="bp-chips-wrap">
                    {INDUSTRY_SUGGESTIONS.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        className={`bp-chip ${industry === sug ? 'bp-chip--active' : ''}`}
                        onClick={() => setIndustry(sug)}
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>

                {/* City & State Row */}
                <div className="bp-form__row">
                  <div className="bp-form__field">
                    <label className="bp-form__label">
                      <IconMapPin size={14} /> Base City
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Pune, Mumbai, Ahmedabad"
                      className="bp-form__input"
                    />
                  </div>

                  <div className="bp-form__field">
                    <label className="bp-form__label">
                      <IconMapPin size={14} /> State / Province
                    </label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="e.g. Maharashtra, Gujarat"
                      className="bp-form__input"
                    />
                  </div>
                </div>

                {/* Contact Phone */}
                <div className="bp-form__field">
                  <label className="bp-form__label">
                    <IconUser size={14} /> Contact Phone Number
                  </label>
                  <PhoneInput value={phone} onChange={setPhone} />
                  <div className="bp-privacy-note">
                    <div className="bp-privacy-note__icon">
                      <IconShield size={16} />
                    </div>
                    <p className="bp-privacy-note__text">
                      Only shared with Craly Staff after you select a contractor never with the contractor directly.
                    </p>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="bp-form__actions">
                  <Button type="submit" variant="primary" disabled={saving}>
                    {saving ? 'Saving Details…' : 'Save Company Profile'}
                  </Button>
                  {hasChanges && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="craly-btn craly-btn--ghost craly-btn--sm"
                      disabled={saving}
                    >
                      Reset
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Right Column: Account Meta & Security Card */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="bp-side-card">
                <div className="bp-side-card__header">
                  <h4 className="bp-side-card__title">Account Information</h4>
                  <span className="bp-side-card__badge">Active</span>
                </div>

                <div className="bp-side-list">
                  <div className="bp-side-item">
                    <span className="bp-side-item__label">Registered Organization</span>
                    <span className="bp-side-item__value">{profile.company_name}</span>
                  </div>

                  <div className="bp-side-item">
                    <span className="bp-side-item__label">Account Type</span>
                    <span className="bp-side-item__value">Manufacturer / Business</span>
                  </div>

                  {user?.email && (
                    <div className="bp-side-item">
                      <span className="bp-side-item__label">Login Email</span>
                      <span className="bp-side-item__value">{user.email}</span>
                    </div>
                  )}

                  <div className="bp-side-item">
                    <span className="bp-side-item__label">Platform Access</span>
                    <span className="bp-side-item__value">Verified B2B Workspace</span>
                  </div>
                </div>
              </div>

              {/* Trust & Data Privacy */}
              <div className="bp-side-card">
                <div className="bp-side-card__header">
                  <h4 className="bp-side-card__title">Security & Network</h4>
                </div>

                <div className="bp-side-trust-list">
                  <div className="bp-side-trust-item">
                    <span className="bp-side-trust-icon">✓</span>
                    <span>Direct-contact bypass protection</span>
                  </div>
                  <div className="bp-side-trust-item">
                    <span className="bp-side-trust-icon">✓</span>
                    <span>Managed contractor KYC verification</span>
                  </div>
                  <div className="bp-side-trust-item">
                    <span className="bp-side-trust-icon">✓</span>
                    <span>End-to-end requirement matchmaking</span>
                  </div>
                </div>

                <div className="bp-side-cta">
                  <h5 className="bp-side-cta__title">Need Labour Contractors?</h5>
                  <p className="bp-side-cta__desc">
                    Publish your job requirements to receive matched verified contractor proposals.
                  </p>
                  <Link href="/business/requirements/new" className="bp-side-cta__btn">
                    + Post New Requirement
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
