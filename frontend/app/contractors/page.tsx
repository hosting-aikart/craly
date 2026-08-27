'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { listContractors, listCategories, type ContractorListing } from '@/lib/api/contractors';
import type { Category } from '@/lib/api/profile';
import { useAuth } from '@/lib/auth/useAuth';
import SearchBar from '@/components/SearchBar';
import FilterPanel from '@/components/FilterPanel';
import ContractorCard from '@/components/ContractorCard';
import { getRoleDefaultDashboard } from '@/lib/util/roleRedirect';
import EmptyState from '@/components/ui/EmptyState';
import LoadingState from '@/components/ui/LoadingState';
import Button from '@/components/ui/Button';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import './contractors.css';

export default function ContractorsPage() {
  const { t } = useLanguage();
  return (
    <Suspense fallback={<div className="directory"><LoadingState cards={6} label={t.common.loading} /></div>}>
      <ContractorsPageInner />
    </Suspense>
  );
}

function ContractorsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      if (user.role === 'business') {
        // /business/contractors is deactivated (direct-contact bypass) —
        // send Manufacturers to the real, requirement-driven flow instead.
        router.replace('/business/requirements');
      } else if (user.role === 'admin') {
        router.replace('/admin/dashboard');
      } else {
        router.replace(getRoleDefaultDashboard(user.role));
      }
    }
  }, [user, authLoading, router]);

  const [contractors, setContractors] = useState<ContractorListing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [q, setQ] = useState(initialQuery);
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [minExperience, setMinExperience] = useState('');
  const [minWorkforce, setMinWorkforce] = useState('');
  const [page, setPage] = useState(1);
  const limit = 12;

  const hasActiveFilters = Boolean(city || category || minExperience || minWorkforce);

  useEffect(() => {
    listCategories()
      .then(({ data }) => setCategories(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');

    listContractors({
      q: q || undefined,
      city: city || undefined,
      category: category || undefined,
      minExperience: minExperience ? Number(minExperience) : undefined,
      minWorkforce: minWorkforce ? Number(minWorkforce) : undefined,
      page,
      limit,
    })
      .then(({ data }) => setContractors(data))
      .catch((err) => setError(err instanceof Error ? err.message : t.common.error))
      .finally(() => setLoading(false));
  }, [q, city, category, minExperience, minWorkforce, page, t.common.error]);

  const clearFilters = () => {
    setCity('');
    setCategory('');
    setMinExperience('');
    setMinWorkforce('');
    setPage(1);
  };

  return (
    <div className="directory">
      <div className="directory__header">
        <p className="directory__eyebrow">{t.nav.contractors.toUpperCase()}</p>
        <h1 className="directory__heading">{t.contractors.pageTitle}</h1>
        <p className="directory__subtext">
          {t.contractors.pageSubtitle}
        </p>
      </div>

      <div className="directory__controls">
        <SearchBar
          value={q}
          onChange={(v) => { setPage(1); setQ(v); }}
          placeholder={t.contractors.searchPlaceholder}
        />
        <FilterPanel
          city={city}
          onCityChange={(v) => { setPage(1); setCity(v); }}
          category={category}
          onCategoryChange={(v) => { setPage(1); setCategory(v); }}
          categories={categories}
          minExperience={minExperience}
          onMinExperienceChange={(v) => { setPage(1); setMinExperience(v); }}
          minWorkforce={minWorkforce}
          onMinWorkforceChange={(v) => { setPage(1); setMinWorkforce(v); }}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />
      </div>

      {loading ? (
        <LoadingState cards={limit > 6 ? 6 : limit} label={t.common.loading} />
      ) : error ? (
        <EmptyState title={t.common.error} subtitle={error} />
      ) : contractors.length === 0 ? (
        <EmptyState
          title={t.contractors.noResultsTitle}
          subtitle={t.contractors.noResultsDesc}
          action={hasActiveFilters ? <Button variant="secondary" size="sm" onClick={clearFilters}>{t.contractors.clearFilters}</Button> : undefined}
        />
      ) : (
        <div className="directory__grid">
          {contractors.map((c) => (
            <ContractorCard key={c.id} contractor={c} />
          ))}
        </div>
      )}

      {!loading && !error && contractors.length > 0 && (
        <div className="directory__pagination">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>‹ {t.contractors.prevPage}</button>
          <span>{t.contractors.pageOf} {page}</span>
          <button disabled={contractors.length < limit} onClick={() => setPage((p) => p + 1)}>{t.contractors.nextPage} ›</button>
        </div>
      )}
    </div>
  );
}
