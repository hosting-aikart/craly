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

const DEFAULT_INDUSTRIAL_CLUSTERS = [
  { name: 'Chakan', cluster: 'Pune industrial cluster' },
  { name: 'Talegaon', cluster: 'Pune industrial cluster' },
  { name: 'Ranjangaon', cluster: 'Pune industrial cluster' },
  { name: 'Pimpri-Chinchwad', cluster: 'Pune industrial cluster' },
  { name: 'Bhosari', cluster: 'Pune industrial cluster' },
  { name: 'Shikrapur', cluster: 'Pune industrial cluster' },
  { name: 'Pirangut', cluster: 'Pune industrial cluster' },
  { name: 'Hadapsar', cluster: 'Pune industrial cluster' },
  { name: 'Sanaswadi', cluster: 'Pune industrial cluster' },
  { name: 'Kurkumbh', cluster: 'Pune industrial cluster' },
  { name: 'Thane / Belapur', cluster: 'MMR industrial cluster' },
  { name: 'Navi Mumbai', cluster: 'MMR industrial cluster' },
  { name: 'Tarapur', cluster: 'MMR industrial cluster' },
  { name: 'Nashik', cluster: 'North Maharashtra cluster' },
  { name: 'Chhatrapati Sambhajinagar', cluster: 'Marathwada cluster' },
  { name: 'Kolhapur', cluster: 'South Maharashtra cluster' },
  { name: 'Nagpur', cluster: 'Vidarbha cluster' },
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

  // Coverage Modal states
  const [isCoverageModalOpen, setIsCoverageModalOpen] = useState(false);
  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);
  const [customClusterInput, setCustomClusterInput] = useState('');

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
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="contractor-header-icon-box">
                    <IconBuilding size={16} />
                  </div>
                  <h3 style={{ margin: 0 }}>Edit Business Identity</h3>
                </div>
              </div>
              <div className="contractor-form-grid">
                <div className="contractor-field">
                  <label>Legal / Trading Name *</label>
                  <input type="text" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                </div>
                <div className="contractor-field">
                  <label>Contact Phone *</label>
                  <PhoneInput value={phone} onChange={setPhone} required />
                </div>
                <div className="contractor-field">
                  <label>Industry *</label>
                  <input type="text" required value={industry} onChange={(e) => setIndustry(e.target.value)} />
                </div>
                <div className="contractor-field">
                  <label>Base City</label>
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="contractor-field">
                  <label>State</label>
                  <input type="text" value={state} onChange={(e) => setState(e.target.value)} />
                </div>
                <div className="contractor-field">
                  <label>Workforce Size (Headcount)</label>
                  <input type="number" value={workforceSize} onChange={(e) => setWorkforceSize(e.target.value ? Number(e.target.value) : '')} />
                </div>
              </div>
              <div className="contractor-form-actions">
                <button type="submit" className="contractor-btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
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
            <div>
              <span className="contractor-hero-badge">
                <IconBuilding size={12} /> Public Organization Identity
              </span>
              <h2>Detailed Company Profile</h2>
              <p>
                Maintain your business parameters and verified capabilities used by manufacturers during contractor discovery.
              </p>
            </div>
            <div className="contractor-hero-actions">
              <button type="button" className="contractor-hero-btn-sec" onClick={() => setEditMode(!editMode)}>
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
              <h2>Location & service coverage</h2>
              <p>Declare the base location and industrial clusters where your organization can mobilise manpower.</p>
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
                Edit Coverage
              </button>
            </div>
          </div>

          <div className="contractor-grid-2col">
            <div className="contractor-card">
              <div className="contractor-card-header">
                <div>
                  <h3>Operating clusters & cities</h3>
                  <p className="contractor-card-sub">Active industrial zones where you provide manpower.</p>
                </div>
                <span className="contractor-badge-pill contractor-badge-pill--green">
                  {declaredServiceAreas.length} {declaredServiceAreas.length === 1 ? 'Cluster' : 'Clusters'}
                </span>
              </div>

              {declaredServiceAreas.length > 0 ? (
                <div className="contractor-cluster-pill-grid">
                  {declaredServiceAreas.map((clusterName) => {
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
                        <span>{clusterName}</span>
                        {matchedPreset && (
                          <span style={{ fontSize: '11px', opacity: 0.8 }}>({matchedPreset.cluster.split(' ')[0]})</span>
                        )}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="contractor-card-sub" style={{ marginTop: '12px' }}>
                  No service areas or clusters declared yet. Click <strong>Edit Coverage</strong> to add industrial clusters.
                </p>
              )}
            </div>

            <div className="contractor-card">
              <h3>Base location</h3>
              <div className="contractor-trust-stats-list" style={{ marginTop: '12px' }}>
                <div className="contractor-trust-stat-row">
                  <span>State</span>
                  <strong>{profile.state || 'Maharashtra'}</strong>
                </div>
                <div className="contractor-trust-stat-row">
                  <span>Base City / Hub</span>
                  <strong>{profile.city || 'Pune'}</strong>
                </div>
                <div className="contractor-trust-stat-row">
                  <span>Total Coverage Clusters</span>
                  <strong>{declaredServiceAreas.length} Zones</strong>
                </div>
                <div className="contractor-trust-stat-row">
                  <span>Coverage Scope</span>
                  <strong style={{ color: '#059669' }}>Cluster + nearby industrial zones</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="contractor-card" style={{ marginTop: '24px' }}>
            <h3>How matching uses this</h3>
            <div className="contractor-rule-callout">
              Manpower requirements match your organization when their location falls within your base city, state, or any of your declared industrial coverage clusters.
            </div>
          </div>

          {/* ── Edit Service Coverage Modal ──────────────────────────────── */}
          {isCoverageModalOpen && (
            <div className="contractor-modal-overlay" onClick={() => setIsCoverageModalOpen(false)}>
              <div className="contractor-modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="contractor-modal-header">
                  <h3 className="contractor-modal-title">Edit Service Coverage</h3>
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
                  <p className="contractor-modal-subtext">
                    Select industrial clusters where you can mobilise manpower.
                  </p>

                  {/* Pre-defined Industrial Clusters Grid */}
                  <div className="contractor-cluster-grid">
                    {DEFAULT_INDUSTRIAL_CLUSTERS.map((item) => {
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
                          <input
                            type="checkbox"
                            className="contractor-cluster-checkbox"
                            checked={isSelected}
                            onChange={() => {}} // Handled by div container click
                          />
                          <div className="contractor-cluster-info">
                            <span className="contractor-cluster-name">{item.name}</span>
                            <span className="contractor-cluster-sub">{item.cluster}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Custom Industrial Clusters already added (not in preset list) */}
                  {selectedClusters.filter(
                    (sc) =>
                      !DEFAULT_INDUSTRIAL_CLUSTERS.some(
                        (d) => d.name.toLowerCase() === sc.toLowerCase()
                      )
                  ).length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                        Custom Locations Added:
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
                    <label>Add custom city or industrial cluster:</label>
                    <div className="contractor-custom-cluster-input-wrap">
                      <input
                        type="text"
                        className="contractor-custom-cluster-input"
                        placeholder="e.g. Sanand, Dahej, Sriperumbudur..."
                        value={customClusterInput}
                        onChange={(e) => setCustomClusterInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = customClusterInput.trim();
                            if (val && !selectedClusters.includes(val)) {
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
                          if (val && !selectedClusters.includes(val)) {
                            setSelectedClusters((prev) => [...prev, val]);
                            setCustomClusterInput('');
                          }
                        }}
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                </div>

                <div className="contractor-modal-footer">
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
