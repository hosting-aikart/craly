'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/useAuth';
import { getMyProfile, updateMyProfile, type BusinessProfile } from '@/lib/api/profile';
import { listContractors, type ContractorListing } from '@/lib/api/contractors';
import { listEnquiries, type Enquiry } from '@/lib/api/enquiries';
import SearchBar from '@/components/SearchBar';
import ContractorCard from '@/components/ContractorCard';
import StatusPill from '@/components/enquiries/StatusPill';
import EmptyState from '@/components/ui/EmptyState';
import LoadingState from '@/components/ui/LoadingState';
import Button from '@/components/ui/Button';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import '@/components/AuthForm.css';
import '../../dashboard.css';

export default function BusinessDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [heroQuery, setHeroQuery] = useState('');

  const [recent, setRecent] = useState<ContractorListing[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);

  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [enquiriesLoading, setEnquiriesLoading] = useState(true);

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

  useEffect(() => {
    listContractors({ limit: 3 })
      .then(({ data }) => setRecent(data))
      .catch(() => setRecent([]))
      .finally(() => setRecentLoading(false));
  }, []);

  useEffect(() => {
    listEnquiries()
      .then(({ data }) => setEnquiries(data))
      .catch(() => setEnquiries([]))
      .finally(() => setEnquiriesLoading(false));
  }, []);

  const handleHeroSearch = (e: FormEvent) => {
    e.preventDefault();
    router.push(heroQuery ? `/contractors?q=${encodeURIComponent(heroQuery)}` : '/contractors');
  };

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
      setError(err instanceof Error ? err.message : t.common.error);
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
        <div className="dashboard"><LoadingState label={t.common.loading} /></div>
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
              <p className="dashboard__eyebrow">{t.nav.dashboard.toUpperCase()}</p>
              <h1 className="dashboard__heading">{t.businessDashboard.welcome}, {profile.company_name}</h1>
            </div>
          </div>
          <div className="dashboard__header-actions">
            {!editing && (
              <button className="dashboard__edit-btn" onClick={startEditing}>{t.common.save}</button>
            )}
          </div>
        </div>

        {!editing && (
          <div className="dashboard__search-hero">
            <h2>{t.businessDashboard.searchHeroTitle}</h2>
            <form className="dashboard__search-form" onSubmit={handleHeroSearch}>
              <SearchBar value={heroQuery} onChange={setHeroQuery} placeholder={t.contractors.searchPlaceholder} />
              <Button type="submit" variant="primary">{t.contractors.applyFilters}</Button>
            </form>
          </div>
        )}

        {!editing && (
          <>
            <div className="dashboard__section-head">
              <h2>{t.businessDashboard.recentEnquiriesTitle}</h2>
              <Link href="/contractors">{t.businessDashboard.viewAllEnquiries} →</Link>
            </div>
            {recentLoading ? (
              <LoadingState cards={3} label={t.common.loading} />
            ) : recent.length === 0 ? (
              <EmptyState
                title={t.contractors.noResultsTitle}
                subtitle={t.businessDashboard.noEnquiries}
              />
            ) : (
              <div className="dashboard__recommend-grid">
                {recent.map((c) => (
                  <ContractorCard key={c.id} contractor={c} />
                ))}
              </div>
            )}
          </>
        )}

        <div className="dashboard__completeness">
          <div className="dashboard__completeness-top">
            <strong>{t.contractorDashboard.completenessLabel}</strong>
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
                <span>{t.contractors.filterState}</span>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} />
              </label>
              <label className="auth-field">
                <span>{t.contractors.filterState}</span>
                <input type="text" value={state} onChange={(e) => setState(e.target.value)} />
              </label>
            </div>

            {error && <p className="auth-error">{error}</p>}

            <div className="dashboard__form-actions">
              <button type="submit" className="auth-submit" disabled={saving}>
                {saving ? t.common.loading : t.common.save}
              </button>
              <button type="button" className="dashboard__cancel-btn" onClick={() => setEditing(false)}>
                {t.common.cancel}
              </button>
            </div>
          </form>
        ) : (
          <div className="dashboard__grid dashboard__grid--two">
            <div className="dashboard__card">
              <h3>{t.contractorDetail.companyInfoTitle}</h3>
              <ul className="dashboard__list">
                <li><span className="dashboard__list-label">Industry</span><span className="dashboard__list-value">{profile.industry || '—'}</span></li>
                <li><span className="dashboard__list-label">{t.contractorDetail.addressLabel}</span><span className="dashboard__list-value">{[profile.city, profile.state].filter(Boolean).join(', ') || '—'}</span></li>
              </ul>
            </div>

            <div className="dashboard__card">
              <h3>{t.businessDashboard.recentEnquiriesTitle}</h3>
              {enquiriesLoading ? (
                <LoadingState label={t.common.loading} />
              ) : enquiries.length === 0 ? (
                <EmptyState
                  title={t.enquiries.emptyEnquiries}
                  subtitle={t.businessDashboard.noEnquiries}
                />
              ) : (
                <>
                  <ul className="dashboard__list">
                    {enquiries.slice(0, 3).map((enq) => (
                      <li key={enq.id}>
                        <span className="dashboard__list-value">{enq.other_party_name}</span>
                        <StatusPill status={enq.status} viewer="business" />
                      </li>
                    ))}
                  </ul>
                  <Link href="/business/enquiries" className="dashboard__card-link">{t.businessDashboard.viewAllEnquiries} →</Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
