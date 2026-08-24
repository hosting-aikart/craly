'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AuthCard from '@/components/AuthCard';
import '@/components/AuthForm.css';
import { useAuth } from '@/lib/auth/useAuth';
import { getMyProfile, updateMyProfile, type Category } from '@/lib/api/profile';
import { listCategories } from '@/lib/api/contractors';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Contractor fields
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [workforceSize, setWorkforceSize] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);

  // Business fields
  const [industry, setIndustry] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    if (user.role === 'staff' || user.role === 'admin' || user.role === 'ops_head' || user.role === 'field_staff') {
      router.replace(user.role === 'admin' ? '/admin/dashboard' : '/staff/dashboard');
      return;
    }

    (async () => {
      try {
        if (user.role === 'contractor') {
          const [{ data: profile }, { data: cats }] = await Promise.all([
            getMyProfile(),
            listCategories(),
          ]);
          setCategories(cats);
          if (profile.role === 'contractor') {
            setDescription(profile.description ?? '');
            setCity(profile.city ?? '');
            setState(profile.state ?? '');
            setYearsExperience(profile.years_experience?.toString() ?? '');
            setWorkforceSize(profile.workforce_size?.toString() ?? '');
            setSelectedCategoryIds(profile.categories.map((c) => c.id));
          }
        } else if (user.role === 'business') {
          const { data: profile } = await getMyProfile();
          if (profile.role === 'business') {
            setCity(profile.city ?? '');
            setState(profile.state ?? '');
            setIndustry(profile.industry ?? '');
          }
        }
      } catch {
        // First-time onboarding
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, user, router]);

  const toggleCategory = (id: number) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (user?.role === 'contractor') {
        await updateMyProfile({
          description,
          city,
          state,
          yearsExperience: yearsExperience ? parseInt(yearsExperience, 10) : undefined,
          workforceSize: workforceSize ? parseInt(workforceSize, 10) : undefined,
          categoryIds: selectedCategoryIds,
        });
        router.push('/contractor-portal/dashboard');
      } else {
        await updateMyProfile({ city, state, industry });
        router.push('/business/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <AuthCard icon="⏳" title={t.common.loading}>
        <p style={{ color: '#9ca3af', fontFamily: 'var(--font-body)' }}>
          {t.onboarding.submitting}
        </p>
      </AuthCard>
    );
  }

  const isContractor = user?.role === 'contractor';

  return (
    <AuthCard
      icon={isContractor ? '🦺' : '🏢'}
      title={t.onboarding.pageTitle}
      subtitle={t.onboarding.pageSubtitle}
      wide
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {isContractor && (
          <label className="auth-field">
            <span>{t.contractorDetail.companyInfoTitle}</span>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What kind of work do you do, and what makes your team reliable?"
            />
          </label>
        )}

        {!isContractor && (
          <label className="auth-field">
            <span>Industry</span>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. Manufacturing, Construction, Logistics"
            />
          </label>
        )}

        <div className="auth-row">
          <label className="auth-field">
            <span>{t.contractors.filterState}</span>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Amravati"
            />
          </label>

          <label className="auth-field">
            <span>{t.contractors.filterState}</span>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="e.g. Maharashtra"
            />
          </label>
        </div>

        {isContractor && (
          <>
            <div className="auth-row">
              <label className="auth-field">
                <span>{t.contractors.experienceLabel}</span>
                <input
                  type="number"
                  min={0}
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(e.target.value)}
                  placeholder="e.g. 8"
                />
              </label>

              <label className="auth-field">
                <span>{t.contractors.workforceLabel}</span>
                <input
                  type="number"
                  min={0}
                  value={workforceSize}
                  onChange={(e) => setWorkforceSize(e.target.value)}
                  placeholder="e.g. 25"
                />
              </label>
            </div>

            <label className="auth-field">
              <span>{t.onboarding.categories}</span>
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
          </>
        )}

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" className="auth-submit" disabled={submitting}>
          {submitting ? t.onboarding.submitting : t.onboarding.completeSetup}
        </button>
      </form>
    </AuthCard>
  );
}
