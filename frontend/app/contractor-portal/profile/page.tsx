'use client';

import React, { useEffect, useState, FormEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getMyProfile, updateMyProfile, type ContractorProfile } from '@/lib/api/profile';
import { computeProfileCompletion } from '@/lib/util/contractorProfileCompletion';
import LoadingState from '@/components/ui/LoadingState';
import PhoneInput from '@/components/ui/PhoneInput';
import ContractorDocumentsSection from '@/components/contractor/ContractorDocumentsSection';
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
      {/* ── Sub Navigation Tabs ──────────────────────────────────────── */}
      <div className="contractor-nav-subtabs">
        <button
          type="button"
          className={`contractor-subtab-btn ${activeTab === 'kyc' ? 'contractor-subtab-btn--active' : ''}`}
          onClick={() => handleTabChange('kyc')}
        >
          KYC & Onboarding
        </button>
        <button
          type="button"
          className={`contractor-subtab-btn ${activeTab === 'profile' ? 'contractor-subtab-btn--active' : ''}`}
          onClick={() => handleTabChange('profile')}
        >
          Company Profile
        </button>
        <button
          type="button"
          className={`contractor-subtab-btn ${activeTab === 'workforce' ? 'contractor-subtab-btn--active' : ''}`}
          onClick={() => handleTabChange('workforce')}
        >
          Workforce & Skills
        </button>
        <button
          type="button"
          className={`contractor-subtab-btn ${activeTab === 'coverage' ? 'contractor-subtab-btn--active' : ''}`}
          onClick={() => handleTabChange('coverage')}
        >
          Coverage
        </button>
        <button
          type="button"
          className={`contractor-subtab-btn ${activeTab === 'documents' || activeTab === 'verification' ? 'contractor-subtab-btn--active' : ''}`}
          onClick={() => handleTabChange('documents')}
        >
          Documents & Verification
        </button>
      </div>

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
              <h2>Contractor KYC & onboarding</h2>
              <p>Business identity captured at signup, plus the documents Craly Operations reviews to verify your account.</p>
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
              <h3>Edit Business Identity Information</h3>
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
                  <div>
                    <h3>Business identity</h3>
                    <p className="contractor-card-sub">Captured at signup and kept current here.</p>
                  </div>
                  <span className={completionPercent === 100 ? 'contractor-tag-complete' : 'contractor-tag-missing'}>
                    {completionPercent}% complete
                  </span>
                </div>

                <div className="contractor-progress-bar-wrap">
                  <div className="contractor-progress-bar-fill" style={{ width: `${completionPercent}%` }} />
                </div>

                <div className="contractor-kv-grid">
                  <div className="contractor-kv-item">
                    <label>Company name</label>
                    <span>{profile.company_name}</span>
                  </div>
                  <div className="contractor-kv-item">
                    <label>Industry</label>
                    <span>{profile.industry || 'Not declared'}</span>
                  </div>
                  <div className="contractor-kv-item contractor-kv-item--full">
                    <label>Registered location</label>
                    <span>{[profile.city, profile.state].filter(Boolean).join(', ') || 'Not declared'}</span>
                  </div>
                  <div className="contractor-kv-item">
                    <label>Contact phone</label>
                    <span>{profile.phone || 'Not set'}</span>
                  </div>
                  <div className="contractor-kv-item">
                    <label>Registered email</label>
                    <span>{profile.user_email || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Onboarding Checklist Card */}
              <div className="contractor-card">
                <div className="contractor-card-header">
                  <h3>Onboarding checklist</h3>
                </div>

                <div className="contractor-chk-list">
                  {checklist.map((item) => (
                    <div key={item.label} className="contractor-chk-row">
                      <span>{item.label}</span>
                      <span className={item.complete ? 'contractor-tag-complete' : 'contractor-tag-missing'}>
                        {item.complete ? '✓ Complete' : 'Missing'}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="contractor-case-info">
                  <div className="contractor-trust-stat-row">
                    <span>Verification status</span>
                    <strong style={{ color: isVerified ? '#059669' : '#b45309' }}>
                      {profile.verification_status.replace('_', ' ').toUpperCase()}
                    </strong>
                  </div>
                  {profile.verification_note && (
                    <div className="contractor-trust-stat-row">
                      <span>Reviewer note</span>
                      <strong>{profile.verification_note}</strong>
                    </div>
                  )}
                  <p className="contractor-case-sub">
                    Verification is decided by Craly Operations after reviewing your uploaded documents — see the Documents & Verification tab.
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
              <h2>Detailed contractor profile</h2>
              <p>Maintain the organization profile used by businesses during contractor discovery and evaluation.</p>
            </div>
            <div className="contractor-hero-actions">
              <button type="button" className="contractor-hero-btn-sec" onClick={() => setEditMode(!editMode)}>
                {editMode ? 'Close Edit' : 'Edit Profile'}
              </button>
            </div>
          </div>

          {editMode ? (
            <form className="contractor-edit-card" onSubmit={handleSubmit}>
              <h3>Edit Company Profile Details</h3>
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
                  <label>Workforce Size</label>
                  <input type="number" value={workforceSize} onChange={(e) => setWorkforceSize(e.target.value ? Number(e.target.value) : '')} />
                </div>
                <div className="contractor-field">
                  <label>Years of Experience</label>
                  <input type="number" value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value ? Number(e.target.value) : '')} />
                </div>
                <div className="contractor-field">
                  <label>Availability</label>
                  <select value={availability} onChange={(e) => setAvailability(e.target.value)}>
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="CURRENTLY_AT_CAPACITY">CURRENTLY AT CAPACITY</option>
                    <option value="NOT_AVAILABLE">NOT AVAILABLE</option>
                    <option value="PAUSED">PAUSED</option>
                  </select>
                </div>
                <div className="contractor-field contractor-field--full">
                  <label>Skills & Specializations — used for opportunity matching</label>
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
                  
                  {/* Preset Quick Add Skill Chips with + Icons */}
                  <div style={{ marginTop: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Popular Skills (Click '+' to add):
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
                    <p className="contractor-card-sub" style={{ marginTop: '8px' }}>No skills selected yet — pick from the dropdown or quick chips above.</p>
                  )}
                </div>
              </div>
              <div className="contractor-field contractor-field--full" style={{ marginTop: '14px' }}>
                <label>Overview / Description</label>
                <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="contractor-form-actions">
                <button type="submit" className="contractor-btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          ) : (
            <div className="contractor-grid-2col">
              <div className="contractor-card">
                <div className="contractor-card-header">
                  <div>
                    <h3>{profile.company_name}</h3>
                    <p className="contractor-card-sub">
                      {[profile.industry, profile.years_experience != null ? `${profile.years_experience} years in business` : null]
                        .filter(Boolean)
                        .join(' • ') || 'Industry and experience not declared'}
                    </p>
                  </div>
                  <span className="contractor-tag-published">● {profile.availability?.replace('_', ' ') || 'AVAILABLE'}</span>
                </div>

                <p className="contractor-profile-desc">
                  {profile.description || 'No company overview provided yet.'}
                </p>

                <div className="contractor-divider" />

                <div className="contractor-kv-grid">
                  <div className="contractor-kv-item">
                    <label>Contact phone</label>
                    <span>{profile.phone || 'Not set'}</span>
                  </div>
                  <div className="contractor-kv-item">
                    <label>Registered email</label>
                    <span>{profile.user_email || '—'}</span>
                  </div>
                  <div className="contractor-kv-item contractor-kv-item--full">
                    <label>Base location</label>
                    <span>{[profile.city, profile.state].filter(Boolean).join(', ') || 'Not declared'}</span>
                  </div>
                </div>
              </div>

              {/* Profile Completion Overview */}
              <div className="contractor-card">
                <div className="contractor-card-header">
                  <h3>Profile completion</h3>
                </div>

                <div className="contractor-big-percent">{completionPercent}%</div>
                <div className="contractor-progress-bar-wrap">
                  <div className="contractor-progress-bar-fill" style={{ width: `${completionPercent}%` }} />
                </div>

                <div className="contractor-trust-stats-list" style={{ marginTop: '16px' }}>
                  <div className="contractor-trust-stat-row">
                    <span>Onboarding</span>
                    <strong>{profile.onboarding_complete ? 'Complete' : 'Incomplete'}</strong>
                  </div>
                  <div className="contractor-trust-stat-row">
                    <span>Verification</span>
                    <strong style={{ color: isVerified ? '#059669' : '#b45309' }}>
                      {isVerified ? 'Verified' : profile.verification_status.replace('_', ' ')}
                    </strong>
                  </div>
                  <div className="contractor-trust-stat-row">
                    <span>Verified on</span>
                    <strong>{profile.last_verified_at ? new Date(profile.last_verified_at).toLocaleDateString() : 'Not yet verified'}</strong>
                  </div>
                  <div className="contractor-trust-stat-row">
                    <span>Data freshness</span>
                    <strong>{profile.updated_at ? `Updated ${new Date(profile.updated_at).toLocaleDateString()}` : '—'}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Declared skills — real data, editable above */}
          <div className="contractor-card" style={{ marginTop: '24px' }}>
            <h3>Declared skills</h3>
            {declaredSkills.length > 0 ? (
              <div className="contractor-chip-list">
                {declaredSkills.map((s) => (
                  <span className="contractor-chip" key={s}>{s}</span>
                ))}
              </div>
            ) : (
              <p className="contractor-card-sub">No skills declared yet — add them via Edit Profile so businesses can find you in matching.</p>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: WORKFORCE & SKILLS ────────────────────────────────── */}
      {activeTab === 'workforce' && (
        <div className="contractor-tab-view">
          <div className="contractor-hero-banner">
            <div>
              <h2>Workforce & skills</h2>
              <p>Your declared workforce size and skills are what Craly matches against published manpower requirements.</p>
            </div>
            <div className="contractor-hero-actions">
              <button type="button" className="contractor-hero-btn-sec" onClick={() => handleTabChange('profile')}>Edit in Company Profile</button>
            </div>
          </div>

          <div className="contractor-metrics-3row">
            <div className="contractor-metric-card">
              <div className="contractor-metric-body">
                <span className="contractor-metric-lbl">Total Workforce</span>
                <div className="contractor-metric-val">{profile.workforce_size ?? '—'}</div>
                <span className="contractor-metric-sub">Declared headcount</span>
              </div>
              <div className="contractor-metric-icon-box contractor-metric-icon-box--green">▲</div>
            </div>

            <div className="contractor-metric-card">
              <div className="contractor-metric-body">
                <span className="contractor-metric-lbl">Skills Declared</span>
                <div className="contractor-metric-val">{declaredSkills.length}</div>
                <span className="contractor-metric-sub">Used for opportunity matching</span>
              </div>
              <div className="contractor-metric-icon-box contractor-metric-icon-box--emerald">🎯</div>
            </div>

            <div className="contractor-metric-card">
              <div className="contractor-metric-body">
                <span className="contractor-metric-lbl">Years of Experience</span>
                <div className="contractor-metric-val">{profile.years_experience ?? '—'}</div>
                <span className="contractor-metric-sub">Availability: {profile.availability?.replace('_', ' ') || 'AVAILABLE'}</span>
              </div>
              <div className="contractor-metric-icon-box contractor-metric-icon-box--mint">🔄</div>
            </div>
          </div>

          <div className="contractor-card" style={{ marginTop: '24px' }}>
            <h3>Declared skills</h3>
            {declaredSkills.length > 0 ? (
              <div className="contractor-chip-list">
                {declaredSkills.map((s) => (
                  <span className="contractor-chip" key={s}>{s}</span>
                ))}
              </div>
            ) : (
              <p className="contractor-card-sub">No skills declared yet.</p>
            )}
            <div className="contractor-rule-callout" style={{ marginTop: '16px' }}>
              Only requirements whose required skills overlap with your declared skills — and whose headcount is within
              your declared workforce size — appear in your Opportunities list.
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
