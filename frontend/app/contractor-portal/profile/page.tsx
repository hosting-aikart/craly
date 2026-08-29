'use client';

import React, { useEffect, useState, FormEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getMyProfile, updateMyProfile, type ContractorProfile } from '@/lib/api/profile';
import { computeProfileCompletion } from '@/lib/util/contractorProfileCompletion';
import LoadingState from '@/components/ui/LoadingState';
import PhoneInput from '@/components/ui/PhoneInput';
import ContractorDocumentsSection from '@/components/contractor/ContractorDocumentsSection';
import {
  IconShield,
  IconBuilding,
  IconUser,
  IconMapPin,
  IconCheck,
  IconLock,
  IconBriefcase,
  IconGlobe,
  IconTarget,
  IconUsers,
  IconZap,
  IconSearch,
  IconPlus,
  IconSparkle,
  IconRocket,
  IconTrash,
  IconAlertCircle,
  IconArrowRight,
  IconFolder,
  IconFile,
} from '@/components/ui/Icons';
import './contractor-profile.css';

// Predefined skill options for the profile's Skills & Specializations picker
// — a contractor selects from this list rather than free-typing, so
// declared skills stay consistent and reliably matchable against
// requirement.required_skills. Sorted alphabetically for the dropdown.
const COMMON_SKILLS = [
  'Arc Welder', 'Assembly Operator', 'Carpenter', 'CNC Operator', 'Crane Operator',
  'Electrician', 'Fabrication', 'Fitter', 'Forklift Operator', 'Helper / General Labour',
  'Housekeeping Staff', 'Hydraulic Technician', 'Instrumentation Technician',
  'Loader / Unloader', 'Machine Operator', 'Mason', 'MIG Welder', 'Packing Staff',
  'Painter', 'Pipe Fitter', 'Plumber', 'Quality Control (QC)', 'Rigger', 'Scaffolder',
  'Security Guard', 'Sheet Metal Worker', 'Supervisor', 'TIG Welder',
].sort();

export interface IndustrialClusterOption {
  name: string;
  cluster: string;
  region: 'pune' | 'mmr' | 'north' | 'marathwada' | 'south' | 'vidarbha' | 'gujarat' | 'south_india';
  regionLabel: string;
}

const DEFAULT_INDUSTRIAL_CLUSTERS: IndustrialClusterOption[] = [
  { name: 'Chakan', cluster: 'Auto & Heavy Engineering', region: 'pune', regionLabel: 'Pune Industrial Belt' },
  { name: 'Talegaon', cluster: 'Electronics & Component SEZ', region: 'pune', regionLabel: 'Pune Industrial Belt' },
  { name: 'Ranjangaon', cluster: 'Consumer Durables & Auto', region: 'pune', regionLabel: 'Pune Industrial Belt' },
  { name: 'Pimpri-Chinchwad', cluster: 'Automotive & Precision Tooling', region: 'pune', regionLabel: 'Pune Industrial Belt' },
  { name: 'Bhosari', cluster: 'MIDC Fabrication & Machinery', region: 'pune', regionLabel: 'Pune Industrial Belt' },
  { name: 'Shikrapur', cluster: 'Logistics & Warehousing Hub', region: 'pune', regionLabel: 'Pune Industrial Belt' },
  { name: 'Pirangut', cluster: 'Engineering & Manufacturing', region: 'pune', regionLabel: 'Pune Industrial Belt' },
  { name: 'Hadapsar', cluster: 'Industrial Estate & IT Parks', region: 'pune', regionLabel: 'Pune Industrial Belt' },
  { name: 'Sanaswadi', cluster: 'Heavy Fabrication & Steel', region: 'pune', regionLabel: 'Pune Industrial Belt' },
  { name: 'Kurkumbh', cluster: 'Chemical & Pharma Zone', region: 'pune', regionLabel: 'Pune Industrial Belt' },
  { name: 'Thane / Belapur', cluster: 'Chemical & Technology Corridor', region: 'mmr', regionLabel: 'MMR Corridor' },
  { name: 'Navi Mumbai', cluster: 'Port & Cold Storage Logistics', region: 'mmr', regionLabel: 'MMR Corridor' },
  { name: 'Tarapur', cluster: 'Specialty Chemicals & Textiles', region: 'mmr', regionLabel: 'MMR Corridor' },
  { name: 'Nashik', cluster: 'Automotive & Electrical Belt', region: 'north', regionLabel: 'North Maharashtra' },
  { name: 'Chhatrapati Sambhajinagar', cluster: 'Auto & Breweries Hub', region: 'marathwada', regionLabel: 'Marathwada Belt' },
  { name: 'Kolhapur', cluster: 'Foundry & Castings Industrial Cluster', region: 'south', regionLabel: 'South Maharashtra' },
  { name: 'Nagpur', cluster: 'MIHAN SEZ & Central Cargo Logistics', region: 'vidarbha', regionLabel: 'Vidarbha Corridor' },
  { name: 'Sanand', cluster: 'Automotive & Heavy Industry SEZ', region: 'gujarat', regionLabel: 'Gujarat Belt' },
  { name: 'Dahej', cluster: 'Petrochemical & PCPIR Mega Hub', region: 'gujarat', regionLabel: 'Gujarat Belt' },
  { name: 'Sriperumbudur', cluster: 'Automotive & Hardware Corridor', region: 'south_india', regionLabel: 'South India Corridor' },
];

export default function ContractorProfilePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawTab = searchParams?.get('tab') || 'kyc';
  const activeTab = ['kyc', 'profile', 'workforce', 'coverage', 'documents', 'verification'].includes(rawTab)
    ? rawTab
    : 'kyc';

  const [profile, setProfile] = useState<ContractorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Coverage Tab & Modal states
  const [isCoverageModalOpen, setIsCoverageModalOpen] = useState(false);
  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);
  const [customClusterInput, setCustomClusterInput] = useState('');
  const [coverageFilter, setCoverageFilter] = useState<'all' | 'pune' | 'mmr' | 'other' | 'custom'>('all');
  const [coverageSearch, setCoverageSearch] = useState('');
  const [inlineClusterInput, setInlineClusterInput] = useState('');
  const [modalSearch, setModalSearch] = useState('');
  const [modalRegionFilter, setModalRegionFilter] = useState<'all' | 'pune' | 'mmr' | 'other'>('all');

  // Sliding tab glider state & refs
  const coverageTabRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const [coverageGliderStyle, setCoverageGliderStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  useEffect(() => {
    const el = coverageTabRefs.current[coverageFilter];
    if (el) {
      setCoverageGliderStyle({
        left: el.offsetLeft,
        width: el.offsetWidth,
      });
    }
  }, [coverageFilter, profile?.service_areas?.length, activeTab]);

  // Form states
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [industry, setIndustry] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillToAdd, setSkillToAdd] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [serviceAreas, setServiceAreas] = useState('');
  const [yearsExperience, setYearsExperience] = useState<number | ''>('');
  const [workforceSize, setWorkforceSize] = useState<number | ''>('');
  const [availability, setAvailability] = useState('AVAILABLE');
  const [description, setDescription] = useState('');
  const [profilePicture, setProfilePicture] = useState<string>('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Profile picture must be smaller than 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setProfilePicture(base64);
      if (profile?.id) {
        localStorage.setItem(`contractor_avatar_${profile.id}`, base64);
      }
      setMessage({ type: 'success', text: 'Profile picture updated successfully!' });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setProfilePicture('');
    if (profile?.id) {
      localStorage.removeItem(`contractor_avatar_${profile.id}`);
    }
    setMessage({ type: 'success', text: 'Profile picture removed.' });
  };

  const loadProfile = () => {
    getMyProfile()
      .then(({ data }) => {
        if (data.role === 'contractor') {
          const cp = data as ContractorProfile;
          setProfile(cp);
          setCompanyName(cp.company_name || '');
          setPhone(cp.phone || '');
          setIndustry(cp.industry || '');
          setSkills(Array.isArray(cp.skills) ? cp.skills : []);
          setCity(cp.city || '');
          setState(cp.state || '');
          const areas = Array.isArray(cp.service_areas) ? cp.service_areas : [];
          setServiceAreas(areas.join(', '));
          setSelectedClusters(areas);
          setYearsExperience(cp.years_experience ?? '');
          setWorkforceSize(cp.workforce_size ?? '');
          setAvailability(cp.availability || 'AVAILABLE');
          setDescription(cp.description || '');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await updateMyProfile({
        companyName,
        phone: phone || undefined,
        industry: industry || undefined,
        skills,
        city: city || undefined,
        state: state || undefined,
        serviceAreas: serviceAreas || undefined,
        yearsExperience: yearsExperience === '' ? undefined : Number(yearsExperience),
        workforceSize: workforceSize === '' ? undefined : Number(workforceSize),
        availability,
        description: description || undefined,
      });

      setMessage({ type: 'success', text: 'Profile changes saved successfully!' });
      setEditMode(false);
      loadProfile();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update profile.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTabChange = (tabKey: string) => {
    setEditMode(false);
    router.push(`/contractor-portal/profile?tab=${tabKey}`);
  };

  if (loading || !profile) {
    return <LoadingState label="Loading Profile & KYC…" />;
  }

  const isVerified = profile.verification_status === 'verified';
  const { percent: completionPercent, items: checklist } = computeProfileCompletion(profile);
  const declaredSkills = profile.skills && profile.skills.length > 0 ? profile.skills : [];
  const declaredServiceAreas = profile.service_areas && profile.service_areas.length > 0 ? profile.service_areas : [];

  return (
    <div className="contractor-profile-container">
      {message && (
        <div className={`contractor-profile-alert contractor-profile-alert--${message.type}`}>
          {message.text}
        </div>
      )}

      {/* ── TAB 1: KYC & ONBOARDING ──────────────────────────────────── */}
      {activeTab === 'kyc' && (
        <div className="contractor-tab-view">
          <div className="contractor-hero-banner">
            <div>
              <span className="contractor-hero-badge">
                <IconShield size={12} /> Compliance & Verification
              </span>
              <h2>Contractor KYC & Onboarding</h2>
              <p>
                Business identity verified by Craly Operations for manufacturer trust and guaranteed project access.
              </p>
            </div>
            <div className="contractor-hero-actions">
              <button type="button" className="contractor-hero-btn-sec" onClick={() => setEditMode(!editMode)}>
                {editMode ? 'Close Edit' : 'Edit Details'}
              </button>
              <button type="button" className="contractor-hero-btn-prim" onClick={() => handleTabChange('documents')}>
                Submit / View Documents
              </button>
            </div>
          </div>

          {editMode ? (
            <form className="contractor-edit-card" onSubmit={handleSubmit}>
              <div className="contractor-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="contractor-header-icon-box">
                    <IconBuilding size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: 800 }}>Edit Business Identity</h3>
                    <p className="contractor-card-sub" style={{ margin: '2px 0 0 0' }}>
                      Update legal trading name, primary contact, and operational scale
                    </p>
                  </div>
                </div>
              </div>

              <div className="contractor-form-grid">
                <div className="contractor-field">
                  <label>Legal / Trading Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Engineering Works Pvt Ltd"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                  <span className="contractor-field-hint">Registered legal name as per government records</span>
                </div>

                <div className="contractor-field">
                  <label>Contact Phone *</label>
                  <PhoneInput value={phone} onChange={setPhone} required />
                  <span className="contractor-field-hint">Primary operational phone for verification & notifications</span>
                </div>

                <div className="contractor-field">
                  <label>Industry *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Construction & Infrastructure"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                  />
                  <span className="contractor-field-hint">Primary trade or manufacturing vertical</span>
                </div>

                <div className="contractor-field">
                  <label>Base City</label>
                  <input
                    type="text"
                    placeholder="e.g. Pune, Mumbai, Nashik"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                  <span className="contractor-field-hint">Headquarters or primary dispatch location</span>
                </div>

                <div className="contractor-field">
                  <label>State</label>
                  <input
                    type="text"
                    placeholder="e.g. Maharashtra"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                  <span className="contractor-field-hint">State jurisdiction for statutory compliance</span>
                </div>

                <div className="contractor-field">
                  <label>Workforce Size (Headcount)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 50"
                    value={workforceSize}
                    onChange={(e) => setWorkforceSize(e.target.value ? Number(e.target.value) : '')}
                  />
                  <span className="contractor-field-hint">Total registered workforce and skilled tradesmen pool</span>
                </div>
              </div>

              <div className="contractor-form-actions">
                <button
                  type="button"
                  className="contractor-form-cancel-btn"
                  onClick={() => setEditMode(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="contractor-btn-primary" disabled={saving}>
                  {saving ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="contractor-grid-2col">
              {/* Business Identity Card */}
              <div className="contractor-card">
                <div className="contractor-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="contractor-header-icon-box">
                      <IconBuilding size={16} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px' }}>Business Identity</h3>
                      <p className="contractor-card-sub" style={{ margin: 0 }}>Registered details captured during onboarding</p>
                    </div>
                  </div>
                  <span className={completionPercent === 100 ? 'contractor-tag-complete' : 'contractor-tag-missing'}>
                    {completionPercent}% Complete
                  </span>
                </div>

                <div className="contractor-kv-list">
                  <div className="contractor-kv-pill">
                    <span className="contractor-kv-pill__label">Company Name</span>
                    <span className="contractor-kv-pill__val">{profile.company_name}</span>
                  </div>
                  <div className="contractor-kv-pill">
                    <span className="contractor-kv-pill__label">Industry</span>
                    <span className="contractor-kv-pill__val">{profile.industry || 'Not declared'}</span>
                  </div>
                  <div className="contractor-kv-pill">
                    <span className="contractor-kv-pill__label">Registered Location</span>
                    <span className="contractor-kv-pill__val">
                      {[profile.city, profile.state].filter(Boolean).join(', ') || 'Not declared'}
                    </span>
                  </div>
                  <div className="contractor-kv-pill">
                    <span className="contractor-kv-pill__label">Contact Phone</span>
                    <span className="contractor-kv-pill__val">{profile.phone || 'Not set'}</span>
                  </div>
                  <div className="contractor-kv-pill">
                    <span className="contractor-kv-pill__label">Registered Email</span>
                    <span className="contractor-kv-pill__val">{profile.user_email || '—'}</span>
                  </div>
                  {profile.workforce_size ? (
                    <div className="contractor-kv-pill">
                      <span className="contractor-kv-pill__label">Headcount</span>
                      <span className="contractor-kv-pill__val">{profile.workforce_size} Workers</span>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Onboarding Checklist Card */}
              <div className="contractor-card">
                <div className="contractor-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="contractor-header-icon-box">
                      <IconShield size={16} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px' }}>Onboarding Checklist</h3>
                      <p className="contractor-card-sub" style={{ margin: 0 }}>Compliance & verification milestones</p>
                    </div>
                  </div>
                </div>

                <div className="contractor-chk-list">
                  {checklist.map((item) => (
                    <div key={item.label} className="contractor-chk-pill">
                      <span className="contractor-chk-pill__label">{item.label}</span>
                      <span className={item.complete ? 'contractor-tag-complete' : 'contractor-tag-missing'}>
                        {item.complete ? '✓ Complete' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Verification Status Card Banner */}
                <div className="contractor-case-banner">
                  <div className="contractor-case-banner__header">
                    <span className="contractor-case-banner__label">Verification Status</span>
                    <span className={`contractor-status-pill contractor-status-pill--${profile.verification_status}`}>
                      ● {profile.verification_status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  {profile.verification_note && (
                    <div className="contractor-case-banner__note">
                      <strong>Reviewer Note:</strong> {profile.verification_note}
                    </div>
                  )}
                  <p className="contractor-case-banner__desc">
                    Official verification is conducted by Craly Compliance Operations upon reviewing your uploaded GST & business registration documents.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: COMPANY PROFILE ──────────────────────────────────── */}
      {activeTab === 'profile' && (
        <div className="contractor-tab-view">
          <div className="contractor-hero-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
              <div className="contractor-avatar-preview-wrap">
                {profilePicture ? (
                  <img src={profilePicture} alt={profile.company_name} className="contractor-avatar-img" />
                ) : (
                  <div className="contractor-avatar-placeholder">
                    {profile.company_name ? profile.company_name.charAt(0).toUpperCase() : 'C'}
                  </div>
                )}
                <button
                  type="button"
                  className="contractor-avatar-upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload / Change Profile Picture"
                >
                  📷
                </button>
              </div>

              <div>
                <span className="contractor-hero-badge">
                  <IconBuilding size={12} /> Public Organization Identity
                </span>
                <h2>{profile.company_name || 'Detailed Company Profile'}</h2>
                <p>
                  Maintain your business parameters and verified capabilities used by manufacturers during contractor discovery.
                </p>
              </div>
            </div>

            <div className="contractor-hero-actions">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
              />
              <button
                type="button"
                className="contractor-hero-btn-sec"
                onClick={() => fileInputRef.current?.click()}
              >
                {profilePicture ? 'Change Photo' : 'Upload Photo'}
              </button>
              {profilePicture && (
                <button
                  type="button"
                  className="contractor-hero-btn-sec"
                  style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#fca5a5' }}
                  onClick={handleRemoveAvatar}
                >
                  Remove Photo
                </button>
              )}
              <button type="button" className="contractor-hero-btn-prim" onClick={() => setEditMode(!editMode)}>
                {editMode ? 'Close Edit' : 'Edit Profile'}
              </button>
            </div>
          </div>

          {editMode ? (
            <form className="contractor-edit-card" onSubmit={handleSubmit}>
              <div className="contractor-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="contractor-header-icon-box">
                    <IconBuilding size={16} />
                  </div>
                  <h3 style={{ margin: 0 }}>Edit Company Profile Details</h3>
                </div>
              </div>
              <div className="contractor-form-grid">
                <div className="contractor-field contractor-field--full" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 18px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div className="contractor-avatar-preview-wrap" style={{ width: '60px', height: '60px' }}>
                    {profilePicture ? (
                      <img src={profilePicture} alt="Avatar" className="contractor-avatar-img" />
                    ) : (
                      <div className="contractor-avatar-placeholder" style={{ fontSize: '22px' }}>
                        {companyName ? companyName.charAt(0).toUpperCase() : 'C'}
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Company Profile Picture / Logo</label>
                    <p style={{ margin: '2px 0 8px 0', fontSize: '12px', color: '#64748b' }}>PNG, JPG or WEBP under 5MB</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="contractor-custom-cluster-btn"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {profilePicture ? 'Change Image' : 'Upload Image'}
                      </button>
                      {profilePicture && (
                        <button
                          type="button"
                          className="contractor-btn-cancel"
                          style={{ padding: '6px 14px', fontSize: '12px' }}
                          onClick={handleRemoveAvatar}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="contractor-field">
                  <label>Company Name *</label>
                  <input type="text" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                </div>
                <div className="contractor-field">
                  <label>Contact Phone</label>
                  <PhoneInput value={phone} onChange={setPhone} />
                </div>
                <div className="contractor-field">
                  <label>Industry</label>
                  <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)} />
                </div>
                <div className="contractor-field">
                  <label>Workforce Size (Headcount)</label>
                  <input type="number" value={workforceSize} onChange={(e) => setWorkforceSize(e.target.value ? Number(e.target.value) : '')} />
                </div>
                <div className="contractor-field">
                  <label>Years of Experience</label>
                  <input type="number" value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value ? Number(e.target.value) : '')} />
                </div>
                <div className="contractor-field">
                  <label>Availability Status</label>
                  <select value={availability} onChange={(e) => setAvailability(e.target.value)}>
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="CURRENTLY_AT_CAPACITY">CURRENTLY AT CAPACITY</option>
                    <option value="NOT_AVAILABLE">NOT AVAILABLE</option>
                    <option value="PAUSED">PAUSED</option>
                  </select>
                </div>
                <div className="contractor-field contractor-field--full">
                  <label>Skills & Specializations (Opportunity Matching)</label>
                  <div className="contractor-custom-cluster-input-wrap">
                    <select
                      className="contractor-custom-cluster-input"
                      value={skillToAdd}
                      onChange={(e) => setSkillToAdd(e.target.value)}
                    >
                      <option value="">Select a skill to add…</option>
                      {COMMON_SKILLS.filter((s) => !skills.includes(s)).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="contractor-custom-cluster-btn"
                      disabled={!skillToAdd}
                      onClick={() => {
                        if (skillToAdd && !skills.includes(skillToAdd)) {
                          setSkills((prev) => [...prev, skillToAdd]);
                        }
                        setSkillToAdd('');
                      }}
                    >
                      + Add
                    </button>
                  </div>
                  
                  {/* Preset Quick Add Skill Chips */}
                  <div style={{ marginTop: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Popular Skills (Click to add):
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                      {COMMON_SKILLS.filter((s) => !skills.includes(s)).slice(0, 14).map((s) => (
                        <button
                          key={s}
                          type="button"
                          className="cp-preset-chip"
                          onClick={() => setSkills((prev) => [...prev, s])}
                        >
                          <span className="cp-plus-icon">+</span> {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {skills.length > 0 ? (
                    <div className="contractor-cluster-pill-grid" style={{ marginTop: '12px' }}>
                      {skills.map((s) => (
                        <span key={s} className="contractor-cluster-pill-tag contractor-cluster-pill-tag--custom">
                          <span>{s}</span>
                          <span
                            className="contractor-cluster-pill-remove"
                            onClick={() => setSkills((prev) => prev.filter((x) => x !== s))}
                          >
                            ×
                          </span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="contractor-card-sub" style={{ marginTop: '8px' }}>No skills selected yet pick from the dropdown or quick chips above.</p>
                  )}
                </div>
              </div>
              <div className="contractor-field contractor-field--full" style={{ marginTop: '14px' }}>
                <label>Company Overview / Profile Summary</label>
                <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Provide a brief summary of your track record and strengths..." />
              </div>
              <div className="contractor-form-actions">
                <button type="submit" className="contractor-btn-primary" disabled={saving}>
                  {saving ? 'Saving Changes…' : 'Save Changes'}
                </button>
                <button type="button" className="contractor-btn-cancel" onClick={() => setEditMode(false)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="contractor-grid-2col">
              {/* Left Card: Core Business Parameters */}
              <div className="contractor-card">
                <div className="contractor-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="contractor-header-icon-box">
                      <IconBuilding size={16} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px' }}>Business Information</h3>
                      <p className="contractor-card-sub" style={{ margin: 0 }}>Operational capacity & availability</p>
                    </div>
                  </div>
                  <span className="contractor-tag-published">● Active</span>
                </div>

                <div className="contractor-kv-list">
                  <div className="contractor-kv-pill">
                    <span className="contractor-kv-pill__label">Company Name</span>
                    <span className="contractor-kv-pill__val">{profile.company_name}</span>
                  </div>
                  <div className="contractor-kv-pill">
                    <span className="contractor-kv-pill__label">Industry Sector</span>
                    <span className="contractor-kv-pill__val">{profile.industry || '—'}</span>
                  </div>
                  <div className="contractor-kv-pill">
                    <span className="contractor-kv-pill__label">Workforce Capacity</span>
                    <span className="contractor-kv-pill__val">{profile.workforce_size ? `${profile.workforce_size} Workers` : '—'}</span>
                  </div>
                  <div className="contractor-kv-pill">
                    <span className="contractor-kv-pill__label">Experience</span>
                    <span className="contractor-kv-pill__val">{profile.years_experience ? `${profile.years_experience} Years` : '—'}</span>
                  </div>
                  <div className="contractor-kv-pill">
                    <span className="contractor-kv-pill__label">Contact Phone</span>
                    <span className="contractor-kv-pill__val">{profile.phone || '—'}</span>
                  </div>
                  <div className="contractor-kv-pill">
                    <span className="contractor-kv-pill__label">Availability</span>
                    <span className="contractor-kv-pill__val" style={{ color: profile.availability === 'AVAILABLE' ? '#059669' : '#b45309' }}>
                      ● {profile.availability?.replace('_', ' ') || 'AVAILABLE'}
                    </span>
                  </div>
                </div>

                {profile.description && (
                  <div style={{ marginTop: '8px', padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--craly-text-muted)', display: 'block', marginBottom: '4px' }}>
                      Profile Summary
                    </span>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--craly-navy)', lineHeight: 1.55 }}>
                      {profile.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Right Card: Declared Skills & Capabilities */}
              <div className="contractor-card">
                <div className="contractor-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="contractor-header-icon-box">
                      <IconBriefcase size={16} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px' }}>Declared Capabilities</h3>
                      <p className="contractor-card-sub" style={{ margin: 0 }}>Specializations matched with requirements</p>
                    </div>
                  </div>
                  <span className="contractor-tag-complete">
                    {declaredSkills.length} Skills
                  </span>
                </div>

                {declaredSkills.length > 0 ? (
                  <>
                    <div className="contractor-chip-list" style={{ marginTop: '4px' }}>
                      {declaredSkills.map((s, i) => (
                        <span className="contractor-chip" key={`${s}-${i}`}>
                          <span style={{ color: 'var(--craly-teal)', fontWeight: 700 }}>✓</span> {s}
                        </span>
                      ))}
                    </div>
                    <div style={{ marginTop: '8px', padding: '12px 14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', color: 'var(--craly-text-muted)', lineHeight: 1.45 }}>
                      💡 These skills are automatically matched with manufacturer requirements in your service areas.
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '20px 16px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                      No capabilities declared yet. Add skills via <strong>Edit Profile</strong> to improve your requirement matching.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: WORKFORCE & SKILLS ────────────────────────────────── */}
      {activeTab === 'workforce' && (
        <div className="contractor-tab-view">
          <div className="contractor-hero-banner">
            <div>
              <span className="contractor-hero-badge">
                <IconUser size={12} /> Workforce & Capacity
              </span>
              <h2>Workforce & Skill Distribution</h2>
              <p>
                Your declared workforce capacity and verified skill sets drive automated matching against published manufacturer requirements.
              </p>
            </div>
            <div className="contractor-hero-actions">
              <button type="button" className="contractor-hero-btn-sec" onClick={() => handleTabChange('profile')}>
                Edit in Company Profile
              </button>
            </div>
          </div>

          {/* 3 Metric Cards */}
          <div className="contractor-metrics-3row">
            <div className="contractor-metric-card">
              <div className="contractor-metric-body">
                <span className="contractor-metric-lbl">Total Workforce</span>
                <div className="contractor-metric-val">{profile.workforce_size ? `${profile.workforce_size}` : '—'}</div>
                <span className="contractor-metric-sub">Active Deployable Headcount</span>
              </div>
              <div className="contractor-metric-icon-box">
                <IconUser size={20} />
              </div>
            </div>

            <div className="contractor-metric-card">
              <div className="contractor-metric-body">
                <span className="contractor-metric-lbl">Skills Declared</span>
                <div className="contractor-metric-val">{declaredSkills.length}</div>
                <span className="contractor-metric-sub">Active Matching Specializations</span>
              </div>
              <div className="contractor-metric-icon-box">
                <IconBriefcase size={20} />
              </div>
            </div>

            <div className="contractor-metric-card">
              <div className="contractor-metric-body">
                <span className="contractor-metric-lbl">Industry Experience</span>
                <div className="contractor-metric-val">{profile.years_experience ? `${profile.years_experience} Years` : '—'}</div>
                <span className="contractor-metric-sub">
                  ● {profile.availability?.replace('_', ' ') || 'AVAILABLE'}
                </span>
              </div>
              <div className="contractor-metric-icon-box">
                <IconShield size={20} />
              </div>
            </div>
          </div>

          {/* 2-Column Dashboard: Skills List & Matching Intelligence */}
          <div className="contractor-grid-2col">
            <div className="contractor-card">
              <div className="contractor-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="contractor-header-icon-box">
                    <IconBriefcase size={16} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px' }}>Declared Capabilities</h3>
                    <p className="contractor-card-sub" style={{ margin: 0 }}>Specializations matched with requirements</p>
                  </div>
                </div>
                <span className="contractor-tag-complete">
                  {declaredSkills.length} Skills
                </span>
              </div>

              {declaredSkills.length > 0 ? (
                <div className="contractor-chip-list">
                  {declaredSkills.map((s, i) => (
                    <span className="contractor-chip" key={`${s}-${i}`}>
                      <span style={{ color: 'var(--craly-teal)', fontWeight: 700 }}>✓</span> {s}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '24px 16px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                    No skills declared yet. Add skills via <strong>Company Profile</strong> to receive matching opportunities.
                  </p>
                </div>
              )}
            </div>

            <div className="contractor-card">
              <div className="contractor-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="contractor-header-icon-box">
                    <IconTarget size={16} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px' }}>Match Intelligence</h3>
                    <p className="contractor-card-sub" style={{ margin: 0 }}>How Craly matches you with manufacturers</p>
                  </div>
                </div>
              </div>

              <div className="contractor-intel-list">
                <div className="contractor-intel-item">
                  <span className="contractor-intel-icon"><IconTarget size={16} /></span>
                  <div className="contractor-intel-text">
                    <strong>Skill Overlap Matching</strong>
                    Opportunities only appear when your declared specializations directly overlap with required project roles.
                  </div>
                </div>

                <div className="contractor-intel-item">
                  <span className="contractor-intel-icon"><IconUsers size={16} /></span>
                  <div className="contractor-intel-text">
                    <strong>Headcount Demand Filter</strong>
                    Requirements with headcount requests within your total workforce capacity are prioritized for you.
                  </div>
                </div>

                <div className="contractor-intel-item">
                  <span className="contractor-intel-icon"><IconZap size={16} /></span>
                  <div className="contractor-intel-text">
                    <strong>Immediate Dispatch Availability</strong>
                    Keeping status as <em>AVAILABLE</em> provides top visibility in contractor search results.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: COVERAGE ──────────────────────────────────────────── */}
      {activeTab === 'coverage' && (
        <div className="contractor-tab-view">
          <div className="contractor-hero-banner">
            <div>
              <span className="contractor-hero-badge">
                <IconMapPin size={12} /> Geo-Coverage & Industrial Hubs
              </span>
              <h2>Location & Service Coverage</h2>
              <p>
                Declare your deployment clusters and industrial corridors. Craly Smart Matching Engine prioritizes your profile for nearby manufacturing & infrastructure requirements.
              </p>
            </div>
            <div className="contractor-hero-actions">
              <button
                type="button"
                className="contractor-hero-btn-sec"
                onClick={() => {
                  setSelectedClusters(declaredServiceAreas);
                  setIsCoverageModalOpen(true);
                }}
              >
                + Manage All Clusters
              </button>
              <button
                type="button"
                className="contractor-hero-btn-prim"
                onClick={() => {
                  setSelectedClusters(declaredServiceAreas);
                  setIsCoverageModalOpen(true);
                }}
              >
                Edit Coverage
              </button>
            </div>
          </div>

          {/* Top Metrics Row */}
          <div className="contractor-metrics-3row">
            <div className="contractor-metric-card">
              <div className="contractor-metric-body">
                <span className="contractor-metric-lbl">Primary Base Hub</span>
                <span className="contractor-metric-val">{profile.city || 'Pune'}, {profile.state || 'Maharashtra'}</span>
                <span className="contractor-metric-sub">Registered Operations HQ</span>
              </div>
              <div className="contractor-metric-icon-box">
                <IconBuilding size={20} />
              </div>
            </div>

            <div className="contractor-metric-card">
              <div className="contractor-metric-body">
                <span className="contractor-metric-lbl">Active Mobilization Zones</span>
                <span className="contractor-metric-val">{declaredServiceAreas.length} {declaredServiceAreas.length === 1 ? 'Cluster' : 'Clusters'}</span>
                <span className="contractor-metric-sub">
                  {declaredServiceAreas.length > 0 ? 'Multi-zone industrial reach' : 'No clusters declared'}
                </span>
              </div>
              <div className="contractor-metric-icon-box">
                <IconMapPin size={20} />
              </div>
            </div>

            <div className="contractor-metric-card">
              <div className="contractor-metric-body">
                <span className="contractor-metric-lbl">Matching Readiness</span>
                <span className="contractor-metric-val" style={{ color: declaredServiceAreas.length > 0 ? '#047857' : '#b45309' }}>
                  {declaredServiceAreas.length >= 4 ? 'High Priority' : declaredServiceAreas.length >= 1 ? 'Moderate Reach' : 'Action Needed'}
                </span>
                <span className="contractor-metric-sub">
                  {declaredServiceAreas.length >= 1 ? 'Active tender notifications' : 'Add clusters to unlock tenders'}
                </span>
              </div>
              <div className="contractor-metric-icon-box">
                <IconZap size={20} />
              </div>
            </div>
          </div>

          <div className="contractor-grid-2col">
            {/* Left Card: Operating Clusters with Search and Quick Actions */}
            <div className="contractor-card">
              <div className="contractor-card-header">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="contractor-header-icon-box">
                      <IconMapPin size={16} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '16px' }}>Declared Service Clusters</h3>
                  </div>
                  <p className="contractor-card-sub" style={{ marginTop: '4px' }}>
                    Active industrial zones where your workforce can be mobilised.
                  </p>
                </div>
                <span className="contractor-badge-pill contractor-badge-pill--green">
                  {declaredServiceAreas.length} {declaredServiceAreas.length === 1 ? 'Zone' : 'Zones'} Active
                </span>
              </div>

              {/* Filter Tabs & Search */}
              {declaredServiceAreas.length > 0 && (
                <div className="contractor-coverage-filter-bar">
                  <div className="contractor-coverage-tabs">
                    {coverageGliderStyle.width > 0 && (
                      <div
                        className="contractor-coverage-tab-glider"
                        style={{
                          left: `${coverageGliderStyle.left}px`,
                          width: `${coverageGliderStyle.width}px`,
                        }}
                      />
                    )}
                    <button
                      ref={(el) => { coverageTabRefs.current['all'] = el; }}
                      type="button"
                      className={`contractor-coverage-tab-btn ${coverageFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setCoverageFilter('all')}
                    >
                      All ({declaredServiceAreas.length})
                    </button>
                    <button
                      ref={(el) => { coverageTabRefs.current['pune'] = el; }}
                      type="button"
                      className={`contractor-coverage-tab-btn ${coverageFilter === 'pune' ? 'active' : ''}`}
                      onClick={() => setCoverageFilter('pune')}
                    >
                      Pune Belt
                    </button>
                    <button
                      ref={(el) => { coverageTabRefs.current['mmr'] = el; }}
                      type="button"
                      className={`contractor-coverage-tab-btn ${coverageFilter === 'mmr' ? 'active' : ''}`}
                      onClick={() => setCoverageFilter('mmr')}
                    >
                      MMR
                    </button>
                    <button
                      ref={(el) => { coverageTabRefs.current['other'] = el; }}
                      type="button"
                      className={`contractor-coverage-tab-btn ${coverageFilter === 'other' ? 'active' : ''}`}
                      onClick={() => setCoverageFilter('other')}
                    >
                      Other
                    </button>
                  </div>

                  <div className="contractor-coverage-search-wrap">
                    <IconSearch size={14} className="contractor-search-icon" />
                    <input
                      type="text"
                      className="contractor-coverage-search-input"
                      placeholder="Filter declared clusters..."
                      value={coverageSearch}
                      onChange={(e) => setCoverageSearch(e.target.value)}
                    />
                    {coverageSearch && (
                      <button
                        type="button"
                        className="contractor-search-clear-btn"
                        onClick={() => setCoverageSearch('')}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Cluster Badges List */}
              {declaredServiceAreas.length > 0 ? (
                <div className="contractor-cluster-pill-grid">
                  {declaredServiceAreas
                    .filter((name) => {
                      if (coverageSearch && !name.toLowerCase().includes(coverageSearch.toLowerCase())) {
                        return false;
                      }
                      const matched = DEFAULT_INDUSTRIAL_CLUSTERS.find(
                        (c) => c.name.toLowerCase() === name.toLowerCase()
                      );
                      if (coverageFilter === 'pune') return matched?.region === 'pune';
                      if (coverageFilter === 'mmr') return matched?.region === 'mmr';
                      if (coverageFilter === 'other') return !matched || (matched.region !== 'pune' && matched.region !== 'mmr');
                      return true;
                    })
                    .map((clusterName) => {
                      const matchedPreset = DEFAULT_INDUSTRIAL_CLUSTERS.find(
                        (c) => c.name.toLowerCase() === clusterName.toLowerCase()
                      );
                      return (
                        <span
                          key={clusterName}
                          className={`contractor-cluster-pill-tag ${
                            matchedPreset ? '' : 'contractor-cluster-pill-tag--custom'
                          }`}
                        >
                          <span className="contractor-cluster-pill-name">{clusterName}</span>
                          {matchedPreset ? (
                            <span className="contractor-cluster-pill-sub">
                              {matchedPreset.region === 'pune' ? 'Pune Belt' : matchedPreset.region === 'mmr' ? 'MMR' : matchedPreset.regionLabel.split(' ')[0]}
                            </span>
                          ) : (
                            <span className="contractor-cluster-pill-sub">Custom Zone</span>
                          )}
                          <button
                            type="button"
                            className="contractor-cluster-pill-remove"
                            title={`Remove ${clusterName}`}
                            onClick={async (e) => {
                              e.stopPropagation();
                              const updated = declaredServiceAreas.filter((c) => c !== clusterName);
                              try {
                                await updateMyProfile({
                                  serviceAreas: updated,
                                });
                                setServiceAreas(updated.join(', '));
                                setSelectedClusters(updated);
                                setMessage({ type: 'success', text: `Removed ${clusterName} from coverage.` });
                                loadProfile();
                              } catch {
                                setMessage({ type: 'error', text: `Failed to remove ${clusterName}.` });
                              }
                            }}
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                </div>
              ) : (
                <div className="contractor-empty-clusters-box">
                  <div className="contractor-empty-icon-wrap">
                    <IconMapPin size={28} />
                  </div>
                  <h4>No industrial clusters declared yet</h4>
                  <p>
                    Adding service areas allows the Craly matching engine to pair your agency with local manufacturer requirements.
                  </p>
                  <button
                    type="button"
                    className="contractor-btn-primary"
                    style={{ marginTop: '12px' }}
                    onClick={() => {
                      setSelectedClusters(declaredServiceAreas);
                      setIsCoverageModalOpen(true);
                    }}
                  >
                    <IconPlus size={14} /> Add Industrial Clusters
                  </button>
                </div>
              )}

              {/* Quick Inline Add Form */}
              <div className="contractor-quick-add-cluster-box">
                <label className="contractor-quick-add-label">Quick add location or industrial zone:</label>
                <div className="contractor-quick-add-row">
                  <input
                    type="text"
                    className="contractor-quick-add-input"
                    placeholder="e.g. Supa MIDC, Shirwal, Waluj..."
                    value={inlineClusterInput}
                    onChange={(e) => setInlineClusterInput(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = inlineClusterInput.trim();
                        if (val && !declaredServiceAreas.includes(val)) {
                          const updated = [...declaredServiceAreas, val];
                          try {
                            await updateMyProfile({ serviceAreas: updated });
                            setServiceAreas(updated.join(', '));
                            setSelectedClusters(updated);
                            setInlineClusterInput('');
                            setMessage({ type: 'success', text: `Added ${val} to service coverage!` });
                            loadProfile();
                          } catch {
                            setMessage({ type: 'error', text: `Failed to add ${val}.` });
                          }
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="contractor-quick-add-btn"
                    onClick={async () => {
                      const val = inlineClusterInput.trim();
                      if (val && !declaredServiceAreas.includes(val)) {
                        const updated = [...declaredServiceAreas, val];
                        try {
                          await updateMyProfile({ serviceAreas: updated });
                          setServiceAreas(updated.join(', '));
                          setSelectedClusters(updated);
                          setInlineClusterInput('');
                          setMessage({ type: 'success', text: `Added ${val} to service coverage!` });
                          loadProfile();
                        } catch {
                          setMessage({ type: 'error', text: `Failed to add ${val}.` });
                        }
                      }
                    }}
                  >
                    + Add
                  </button>
                </div>
              </div>
            </div>

            {/* Right Card: Mobility Logistics & HQ Readiness */}
            <div className="contractor-card">
              <div className="contractor-card-header">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="contractor-header-icon-box">
                      <IconBuilding size={16} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '16px' }}>Deployment Logistics</h3>
                  </div>
                  <p className="contractor-card-sub" style={{ marginTop: '4px' }}>
                    Mobility parameters used by manufacturers when scoring proposals.
                  </p>
                </div>
              </div>

              <div className="contractor-kv-list" style={{ marginTop: '8px' }}>
                <div className="contractor-kv-pill">
                  <span className="contractor-kv-pill__label">Registered State</span>
                  <span className="contractor-kv-pill__val">{profile.state || 'Maharashtra'}</span>
                </div>
                <div className="contractor-kv-pill">
                  <span className="contractor-kv-pill__label">Base City / Hub</span>
                  <span className="contractor-kv-pill__val">{profile.city || 'Pune'}</span>
                </div>
                <div className="contractor-kv-pill">
                  <span className="contractor-kv-pill__label">Active Coverage Zones</span>
                  <span className="contractor-kv-pill__val" style={{ color: '#0f8b82' }}>
                    {declaredServiceAreas.length} Industrial Zones
                  </span>
                </div>
                <div className="contractor-kv-pill">
                  <span className="contractor-kv-pill__label">Mobilization Lead Time</span>
                  <span className="contractor-kv-pill__val">24 - 48 Hours On-site</span>
                </div>
                <div className="contractor-kv-pill">
                  <span className="contractor-kv-pill__label">Logistics Support</span>
                  <span className="contractor-kv-pill__val">Local Worker Transit Ready</span>
                </div>
              </div>

              <div className="contractor-coverage-tip-box" style={{ marginTop: '16px' }}>
                <div className="contractor-coverage-tip-icon">
                  <IconSparkle size={16} />
                </div>
                <div className="contractor-coverage-tip-text">
                  <strong>Expand your reach:</strong> Contractors covering 3+ industrial clusters receive 3.4x more interview requests and contract invitations on Craly.
                </div>
              </div>
            </div>
          </div>

          {/* Smart Matching Feature Showcase */}
          <div className="contractor-card" style={{ marginTop: '24px' }}>
            <div className="contractor-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="contractor-header-icon-box">
                  <IconRocket size={16} />
                </div>
                <h3 style={{ margin: 0, fontSize: '16px' }}>How Craly Smart Matching Works</h3>
              </div>
            </div>

            <div className="contractor-matching-steps-grid">
              <div className="contractor-matching-step-item">
                <div className="contractor-step-number">1</div>
                <div className="contractor-step-content">
                  <h4>Cluster Geofencing</h4>
                  <p>When a plant posts a requirement in Chakan, Bhosari, or MMR, contractors mapped to those zones get instant priority alerts.</p>
                </div>
              </div>

              <div className="contractor-matching-step-item">
                <div className="contractor-step-number">2</div>
                <div className="contractor-step-content">
                  <h4>Skill & Capacity Pairing</h4>
                  <p>Requirements are paired against your declared trade specializations and workforce headcount for optimal contract fits.</p>
                </div>
              </div>

              <div className="contractor-matching-step-item">
                <div className="contractor-step-number">3</div>
                <div className="contractor-step-content">
                  <h4>Verified Rapid Dispatch</h4>
                  <p>Verified contractors with established regional clusters get the Craly Fast-Track badge for direct interview scheduling.</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Edit Service Coverage Modal ──────────────────────────────── */}
          {isCoverageModalOpen && (
            <div className="contractor-modal-overlay" onClick={() => setIsCoverageModalOpen(false)}>
              <div className="contractor-modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="contractor-modal-header">
                  <div>
                    <h3 className="contractor-modal-title">Edit Service Coverage</h3>
                    <p className="contractor-modal-subtext" style={{ margin: '4px 0 0 0' }}>
                      Select the industrial clusters where your agency can supply and manage manpower.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="contractor-modal-close"
                    onClick={() => setIsCoverageModalOpen(false)}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                <div className="contractor-modal-body">
                  {/* Modal Search and Filter Controls */}
                  <div className="contractor-modal-toolbar">
                    <div className="contractor-modal-search-wrap">
                      <IconSearch size={15} className="contractor-search-icon" />
                      <input
                        type="text"
                        className="contractor-modal-search-input"
                        placeholder="Search clusters (e.g., Chakan, Thane, Tarapur, Nashik)..."
                        value={modalSearch}
                        onChange={(e) => setModalSearch(e.target.value)}
                      />
                      {modalSearch && (
                        <button
                          type="button"
                          className="contractor-search-clear-btn"
                          onClick={() => setModalSearch('')}
                        >
                          ×
                        </button>
                      )}
                    </div>

                    <div className="contractor-modal-region-tabs">
                      <button
                        type="button"
                        className={`contractor-modal-region-btn ${modalRegionFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setModalRegionFilter('all')}
                      >
                        All Zones
                      </button>
                      <button
                        type="button"
                        className={`contractor-modal-region-btn ${modalRegionFilter === 'pune' ? 'active' : ''}`}
                        onClick={() => setModalRegionFilter('pune')}
                      >
                        Pune Belt
                      </button>
                      <button
                        type="button"
                        className={`contractor-modal-region-btn ${modalRegionFilter === 'mmr' ? 'active' : ''}`}
                        onClick={() => setModalRegionFilter('mmr')}
                      >
                        MMR Region
                      </button>
                      <button
                        type="button"
                        className={`contractor-modal-region-btn ${modalRegionFilter === 'other' ? 'active' : ''}`}
                        onClick={() => setModalRegionFilter('other')}
                      >
                        Other Belts
                      </button>
                    </div>
                  </div>

                  {/* Pre-defined Industrial Clusters Grid */}
                  <div className="contractor-cluster-grid">
                    {DEFAULT_INDUSTRIAL_CLUSTERS.filter((item) => {
                      if (modalSearch && !item.name.toLowerCase().includes(modalSearch.toLowerCase()) && !item.cluster.toLowerCase().includes(modalSearch.toLowerCase())) {
                        return false;
                      }
                      if (modalRegionFilter === 'pune') return item.region === 'pune';
                      if (modalRegionFilter === 'mmr') return item.region === 'mmr';
                      if (modalRegionFilter === 'other') return item.region !== 'pune' && item.region !== 'mmr';
                      return true;
                    }).map((item) => {
                      const isSelected = selectedClusters.some(
                        (sc) => sc.toLowerCase() === item.name.toLowerCase()
                      );
                      return (
                        <div
                          key={item.name}
                          className={`contractor-cluster-card ${
                            isSelected ? 'contractor-cluster-card--selected' : ''
                          }`}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedClusters((prev) =>
                                prev.filter((sc) => sc.toLowerCase() !== item.name.toLowerCase())
                              );
                            } else {
                              setSelectedClusters((prev) => [...prev, item.name]);
                            }
                          }}
                        >
                          <div className="contractor-cluster-card-check">
                            <input
                              type="checkbox"
                              className="contractor-cluster-checkbox"
                              checked={isSelected}
                              onChange={() => {}} // Handled by container
                            />
                          </div>
                          <div className="contractor-cluster-info">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                              <span className="contractor-cluster-name">{item.name}</span>
                              <span className="contractor-cluster-region-pill">{item.regionLabel.split(' ')[0]}</span>
                            </div>
                            <span className="contractor-cluster-sub">{item.cluster}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Custom Industrial Clusters already added */}
                  {selectedClusters.filter(
                    (sc) =>
                      !DEFAULT_INDUSTRIAL_CLUSTERS.some(
                        (d) => d.name.toLowerCase() === sc.toLowerCase()
                      )
                  ).length > 0 && (
                    <div className="contractor-custom-clusters-added-box">
                      <label className="contractor-custom-clusters-heading">
                        Custom Locations Selected:
                      </label>
                      <div className="contractor-cluster-pill-grid">
                        {selectedClusters
                          .filter(
                            (sc) =>
                              !DEFAULT_INDUSTRIAL_CLUSTERS.some(
                                (d) => d.name.toLowerCase() === sc.toLowerCase()
                              )
                          )
                          .map((sc) => (
                            <span key={sc} className="contractor-cluster-pill-tag contractor-cluster-pill-tag--custom">
                              <span>{sc}</span>
                              <span
                                className="contractor-cluster-pill-remove"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedClusters((prev) => prev.filter((c) => c !== sc));
                                }}
                              >
                                ×
                              </span>
                            </span>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Add Custom Location Section */}
                  <div className="contractor-custom-cluster-section">
                    <label>Add custom city, industrial zone, or MIDC cluster:</label>
                    <div className="contractor-custom-cluster-input-wrap">
                      <input
                        type="text"
                        className="contractor-custom-cluster-input"
                        placeholder="e.g. Sanand SEZ, Dahej, Sriperumbudur..."
                        value={customClusterInput}
                        onChange={(e) => setCustomClusterInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = customClusterInput.trim();
                            if (val && !selectedClusters.some((sc) => sc.toLowerCase() === val.toLowerCase())) {
                              setSelectedClusters((prev) => [...prev, val]);
                              setCustomClusterInput('');
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="contractor-custom-cluster-btn"
                        onClick={() => {
                          const val = customClusterInput.trim();
                          if (val && !selectedClusters.some((sc) => sc.toLowerCase() === val.toLowerCase())) {
                            setSelectedClusters((prev) => [...prev, val]);
                            setCustomClusterInput('');
                          }
                        }}
                      >
                        + Add Custom
                      </button>
                    </div>
                  </div>
                </div>

                <div className="contractor-modal-footer">
                  <div className="contractor-modal-selected-summary">
                    <strong>{selectedClusters.length}</strong> {selectedClusters.length === 1 ? 'cluster' : 'clusters'} selected
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      className="contractor-btn-cancel"
                      onClick={() => setIsCoverageModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="contractor-btn-save"
                      disabled={saving}
                      onClick={async () => {
                        setSaving(true);
                        setMessage(null);
                        try {
                          await updateMyProfile({
                            city: city || undefined,
                            state: state || undefined,
                            serviceAreas: selectedClusters,
                          });
                          setServiceAreas(selectedClusters.join(', '));
                          setMessage({ type: 'success', text: 'Coverage updated successfully!' });
                          setIsCoverageModalOpen(false);
                          loadProfile();
                        } catch (err) {
                          setMessage({
                            type: 'error',
                            text: err instanceof Error ? err.message : 'Failed to update coverage.',
                          });
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      {saving ? 'Saving...' : 'Save Coverage'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 5 & 6: DOCUMENTS & VERIFICATION ─────────────────────── */}
      {(activeTab === 'documents' || activeTab === 'verification') && (
        <ContractorDocumentsSection
          verificationStatus={profile.verification_status}
          verificationNote={profile.verification_note}
        />
      )}
    </div>
  );
}
