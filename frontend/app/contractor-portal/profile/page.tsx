'use client';

import React, { useEffect, useState, FormEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getMyProfile, updateMyProfile, type ContractorProfile } from '@/lib/api/profile';
import { computeProfileCompletion } from '@/lib/util/contractorProfileCompletion';
import LoadingState from '@/components/ui/LoadingState';
import ContractorDocumentsSection from '@/components/contractor/ContractorDocumentsSection';
import './contractor-profile.css';

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

  // Form states
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [industry, setIndustry] = useState('');
  const [skills, setSkills] = useState('');
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
          setSkills(Array.isArray(cp.skills) ? cp.skills.join(', ') : '');
          setCity(cp.city || '');
          setState(cp.state || '');
          setServiceAreas(Array.isArray(cp.service_areas) ? cp.service_areas.join(', ') : '');
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
        skills: skills || undefined,
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
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
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
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
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
                  <label>Skills & Specializations (comma separated) — used for opportunity matching</label>
                  <input type="text" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="e.g. CNC Operator, MIG Welder, Assembly Operator" />
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
              <p>Declare the base location and service areas where your organization can mobilise manpower.</p>
            </div>
            <div className="contractor-hero-actions">
              <button type="button" className="contractor-hero-btn-sec" onClick={() => setEditMode(!editMode)}>
                {editMode ? 'Close Edit' : 'Edit Coverage'}
              </button>
            </div>
          </div>

          {editMode ? (
            <form className="contractor-edit-card" onSubmit={handleSubmit}>
              <h3>Edit Coverage</h3>
              <div className="contractor-form-grid">
                <div className="contractor-field">
                  <label>Base City</label>
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="contractor-field">
                  <label>State</label>
                  <input type="text" value={state} onChange={(e) => setState(e.target.value)} />
                </div>
                <div className="contractor-field contractor-field--full">
                  <label>Service areas (comma separated) — used for opportunity matching</label>
                  <input
                    type="text"
                    value={serviceAreas}
                    onChange={(e) => setServiceAreas(e.target.value)}
                    placeholder="e.g. Pune, Pimpri-Chinchwad, Chakan, Talegaon"
                  />
                </div>
              </div>
              <div className="contractor-form-actions">
                <button type="submit" className="contractor-btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Coverage'}
                </button>
              </div>
            </form>
          ) : (
            <div className="contractor-grid-2col">
              <div className="contractor-card">
                <h3>Operating areas</h3>
                {declaredServiceAreas.length > 0 ? (
                  <div className="contractor-chip-list">
                    {declaredServiceAreas.map((a) => (
                      <span className="contractor-chip" key={a}>{a}</span>
                    ))}
                  </div>
                ) : (
                  <p className="contractor-card-sub">No service areas declared yet — add them so requirement location matching works.</p>
                )}
              </div>
              <div className="contractor-card">
                <h3>Base location</h3>
                <div className="contractor-trust-stats-list">
                  <div className="contractor-trust-stat-row">
                    <span>City</span>
                    <strong>{profile.city || 'Not declared'}</strong>
                  </div>
                  <div className="contractor-trust-stat-row">
                    <span>State</span>
                    <strong>{profile.state || 'Not declared'}</strong>
                  </div>
                  <div className="contractor-trust-stat-row">
                    <span>Declared service areas</span>
                    <strong>{declaredServiceAreas.length}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="contractor-card" style={{ marginTop: '24px' }}>
            <h3>How matching uses this</h3>
            <div className="contractor-rule-callout">
              A requirement's location matches you when it falls within your base city/state or one of your declared
              service areas. Requirements outside your coverage never appear in your Opportunities list.
            </div>
          </div>
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
