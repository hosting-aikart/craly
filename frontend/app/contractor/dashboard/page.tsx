'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/useAuth';
import { getMyProfile, updateMyProfile, type ContractorProfile, type Category } from '@/lib/api/profile';
import { listCategories } from '@/lib/api/contractors';
import '@/components/AuthForm.css';
import '../../dashboard.css';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Verification Pending',
  verified: 'Verified',
  rejected: 'Verification Rejected',
};

export default function ContractorDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<ContractorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);

  // Edit form state
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [workforceSize, setWorkforceSize] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'contractor') { router.push('/business/dashboard'); return; }

    getMyProfile()
      .then(({ data }) => {
        if (data.role !== 'contractor') return;
        if (!data.onboarding_complete) { router.push('/onboarding'); return; }
        setProfile(data);
      })
      .finally(() => setLoading(false));
  }, [authLoading, user, router]);

  const startEditing = () => {
    if (!profile) return;
    setDescription(profile.description ?? '');
    setCity(profile.city ?? '');
    setState(profile.state ?? '');
    setYearsExperience(profile.years_experience?.toString() ?? '');
    setWorkforceSize(profile.workforce_size?.toString() ?? '');
    setSelectedCategoryIds(profile.categories.map((c) => c.id));
    setError('');
    setEditing(true);

    if (categories.length === 0) {
      listCategories().then(({ data }) => setCategories(data)).catch(() => {});
    }
  };

  const toggleCategory = (id: number) => {
    setSelectedCategoryIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await updateMyProfile({
        description,
        city,
        state,
        yearsExperience: yearsExperience ? parseInt(yearsExperience, 10) : undefined,
        workforceSize: workforceSize ? parseInt(workforceSize, 10) : undefined,
        categoryIds: selectedCategoryIds,
      });
      const { data } = await getMyProfile();
      if (data.role === 'contractor') setProfile(data);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const completeness = useMemo(() => {
    if (!profile) return { pct: 0, missing: [] as string[] };
    const checks: [boolean, string][] = [
      [!!profile.description, 'Description'],
      [!!profile.city, 'City'],
      [!!profile.state, 'State'],
      [profile.years_experience != null, 'Experience'],
      [profile.workforce_size != null, 'Workforce Size'],
      [profile.categories.length > 0, 'Categories'],
    ];
    const done = checks.filter(([ok]) => ok).length;
    return { pct: Math.round((done / checks.length) * 100), missing: checks.filter(([ok]) => !ok).map(([, label]) => label) };
  }, [profile]);

  if (authLoading || loading || !profile) {
    return (
      <div className="dashboard-page">
        <div className="dashboard"><p className="dashboard__status">Loading your dashboard…</p></div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-page__glow dashboard-page__glow--a" aria-hidden="true" />
      <div className="dashboard-page__glow dashboard-page__glow--b" aria-hidden="true" />

      <div className="dashboard">
        <div className="dashboard__header">
          <div className="dashboard__header-main">
            <div className="dashboard__avatar">{profile.company_name.charAt(0).toUpperCase()}</div>
            <div>
              <p className="dashboard__eyebrow">CONTRACTOR DASHBOARD</p>
              <h1 className="dashboard__heading">Welcome back, {profile.company_name}</h1>
            </div>
          </div>
          <div className="dashboard__header-actions">
            <span className={`dashboard__badge dashboard__badge--${profile.verification_status}`}>
              {STATUS_LABEL[profile.verification_status]}
            </span>
            {!editing && (
              <button className="dashboard__edit-btn" onClick={startEditing}>Edit Profile</button>
            )}
          </div>
        </div>

        <div className="dashboard__completeness">
          <div className="dashboard__completeness-top">
            <strong>Profile completeness</strong>
            <span>{completeness.pct}%</span>
          </div>
          <div className="dashboard__completeness-bar">
            <div className="dashboard__completeness-fill" style={{ width: `${completeness.pct}%` }} />
          </div>
          {completeness.missing.length > 0 && (
            <div className="dashboard__completeness-missing">
              {completeness.missing.map((m) => <span key={m}>+ {m}</span>)}
            </div>
          )}
        </div>

        {profile.verification_status === 'pending' && (
          <div className="dashboard__notice">
            Your profile is under review. Once verified, you&apos;ll appear in the public contractor
            directory and businesses will be able to find and contact you.
          </div>
        )}

        {profile.verification_status === 'rejected' && profile.verification_note && (
          <div className="dashboard__notice">
            <strong>Verification note:</strong> {profile.verification_note}
          </div>
        )}

        {editing ? (
          <form className="auth-form dashboard__card" onSubmit={handleSave}>
            <label className="auth-field">
              <span>About Your Business</span>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What kind of work do you do, and what makes your team reliable?"
              />
            </label>

            <div className="auth-row">
              <label className="auth-field">
                <span>City</span>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} />
              </label>
              <label className="auth-field">
                <span>State</span>
                <input type="text" value={state} onChange={(e) => setState(e.target.value)} />
              </label>
            </div>

            <div className="auth-row">
              <label className="auth-field">
                <span>Years of Experience</span>
                <input type="number" min={0} value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} />
              </label>
              <label className="auth-field">
                <span>Workforce Size</span>
                <input type="number" min={0} value={workforceSize} onChange={(e) => setWorkforceSize(e.target.value)} />
              </label>
            </div>

            <label className="auth-field">
              <span>Categories</span>
              <div className="auth-chip-group">
                {categories.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    className={`auth-chip ${selectedCategoryIds.includes(c.id) ? 'auth-chip--active' : ''}`}
                    onClick={() => toggleCategory(c.id)}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </label>

            {error && <p className="auth-error">{error}</p>}

            <div className="dashboard__form-actions">
              <button type="submit" className="auth-submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button type="button" className="dashboard__cancel-btn" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="dashboard__grid">
            <div className="dashboard__card">
              <h3>About</h3>
              <p className="dashboard__desc">
                {profile.description || 'No description added yet — edit your profile to add one.'}
              </p>
            </div>

            <div className="dashboard__card">
              <h3>Details</h3>
              <ul className="dashboard__list">
                <li><span>Location</span><span>{[profile.city, profile.state].filter(Boolean).join(', ') || '—'}</span></li>
                <li><span>Experience</span><span>{profile.years_experience != null ? `${profile.years_experience} years` : '—'}</span></li>
                <li><span>Workforce</span><span>{profile.workforce_size != null ? profile.workforce_size : '—'}</span></li>
              </ul>
            </div>

            <div className="dashboard__card">
              <h3>Categories</h3>
              {profile.categories.length > 0 ? (
                <div className="dashboard__tags">
                  {profile.categories.map((c) => (
                    <span key={c.id} className="dashboard__tag">{c.name}</span>
                  ))}
                </div>
              ) : (
                <p className="dashboard__desc">No categories selected yet.</p>
              )}
            </div>
          </div>
        )}

        <div className="dashboard__card dashboard__card--placeholder">
          <h3>Inquiries</h3>
          <p className="dashboard__desc">
            Coming soon — businesses will be able to reach out to you directly from your profile,
            and their messages will show up here.
          </p>
        </div>
      </div>
    </div>
  );
}
