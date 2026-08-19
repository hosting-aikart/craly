'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/useAuth';
import { getMyProfile, updateMyProfile, type BusinessProfile } from '@/lib/api/profile';
import '@/components/AuthForm.css';
import '../../dashboard.css';

export default function BusinessDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [industry, setIndustry] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'business') { router.push('/contractor/dashboard'); return; }

    getMyProfile()
      .then(({ data }) => {
        if (data.role !== 'business') return;
        if (!data.onboarding_complete) { router.push('/onboarding'); return; }
        setProfile(data);
      })
      .finally(() => setLoading(false));
  }, [authLoading, user, router]);

  const startEditing = () => {
    if (!profile) return;
    setIndustry(profile.industry ?? '');
    setCity(profile.city ?? '');
    setState(profile.state ?? '');
    setError('');
    setEditing(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await updateMyProfile({ industry, city, state });
      const { data } = await getMyProfile();
      if (data.role === 'business') setProfile(data);
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
      [!!profile.industry, 'Industry'],
      [!!profile.city, 'City'],
      [!!profile.state, 'State'],
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
              <p className="dashboard__eyebrow">BUSINESS DASHBOARD</p>
              <h1 className="dashboard__heading">Welcome back, {profile.company_name}</h1>
            </div>
          </div>
          <div className="dashboard__header-actions">
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

        {!editing && (
          <Link href="/contractors" className="dashboard__cta">
            <div>
              <h3>Browse Verified Contractors</h3>
              <p>Search and filter every verified contractor profile on Craly.</p>
            </div>
            <span>→</span>
          </Link>
        )}

        {editing ? (
          <form className="auth-form dashboard__card" onSubmit={handleSave}>
            <label className="auth-field">
              <span>Industry</span>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. Manufacturing, Construction, Logistics"
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
          <div className="dashboard__grid dashboard__grid--two">
            <div className="dashboard__card">
              <h3>Company Details</h3>
              <ul className="dashboard__list">
                <li><span>Industry</span><span>{profile.industry || '—'}</span></li>
                <li><span>Location</span><span>{[profile.city, profile.state].filter(Boolean).join(', ') || '—'}</span></li>
              </ul>
            </div>

            <div className="dashboard__card dashboard__card--placeholder">
              <h3>Your Inquiries</h3>
              <p className="dashboard__desc">
                Coming soon — messages you send to contractors from their profile pages will show up
                here, along with their status.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
