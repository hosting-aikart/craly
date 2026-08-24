'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import ContractorCard from '@/components/ContractorCard';
import FilterPanel from '@/components/FilterPanel';
import SearchBar from '@/components/SearchBar';
import EmptyState from '@/components/ui/EmptyState';
import LoadingState from '@/components/ui/LoadingState';
import Button from '@/components/ui/Button';
import { listContractors, listCategories, type ContractorListing, type Category } from '@/lib/api/contractors';
import '@/app/contractors/contractors.css';

export default function BusinessContractorsPage() {
  const [contractors, setContractors] = useState<ContractorListing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [minExperience, setMinExperience] = useState('');
  const [minWorkforce, setMinWorkforce] = useState('');

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Selected contractors for comparison
  const [compareIds, setCompareIds] = useState<string[]>([]);

  useEffect(() => {
    listCategories()
      .then(({ data }) => setCategories(data))
      .catch(() => {});
  }, []);

  const loadData = (reset = false) => {
    const nextPage = reset ? 1 : page;
    setLoading(true);
    setError('');

    listContractors({
      q: query || undefined,
      city: city || undefined,
      category: category || undefined,
      minExperience: minExperience ? parseInt(minExperience, 10) : undefined,
      minWorkforce: minWorkforce ? parseInt(minWorkforce, 10) : undefined,
      page: nextPage,
      limit: 12,
    })
      .then(({ data }) => {
        startTransition(() => {
          setContractors(reset ? data : [...contractors, ...data]);
          setHasMore(data.length === 12);
          setPage(nextPage + 1);
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load contractors'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, category, minExperience, minWorkforce]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(true);
  };

  const handleClearFilters = () => {
    setQuery('');
    setCity('');
    setCategory('');
    setMinExperience('');
    setMinWorkforce('');
  };

  const handleToggleCompare = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (compareIds.includes(id)) {
      setCompareIds(compareIds.filter((cid) => cid !== id));
    } else {
      if (compareIds.length >= 4) {
        alert('You can compare up to 4 contractors at once.');
        return;
      }
      setCompareIds([...compareIds, id]);
    }
  };

  const hasActiveFilters = Boolean(query || city || category || minExperience || minWorkforce);

  return (
    <>
      <WorkspacePageHeader
        title="Find & Compare Contractors"
        subtitle="Discover verified labour contractors by trade, location, and compare them side-by-side."
      />
      <div className="contractors-page__body" style={{ margin: 0, position: 'relative' }}>
        <aside className="contractors-page__sidebar">
          <FilterPanel
            city={city}
            onCityChange={setCity}
            category={category}
            onCategoryChange={setCategory}
            categories={categories}
            minExperience={minExperience}
            onMinExperienceChange={setMinExperience}
            minWorkforce={minWorkforce}
            onMinWorkforceChange={setMinWorkforce}
            onClear={handleClearFilters}
            hasActiveFilters={hasActiveFilters}
          />
        </aside>

        <main className="contractors-page__main">
          <form className="contractors-page__search" onSubmit={handleSearchSubmit}>
            <SearchBar
              value={query}
              onChange={setQuery}
              placeholder="Search by company name, city, or trade..."
            />
            <Button type="submit" variant="primary">Search</Button>
          </form>

          {loading && contractors.length === 0 ? (
            <LoadingState cards={6} label="Loading contractors…" />
          ) : error ? (
            <EmptyState title="Error loading contractors" subtitle={error} />
          ) : contractors.length === 0 ? (
            <EmptyState
              title="No contractors found"
              subtitle="Try loosening your filters or search for another trade or location."
              action={<Button variant="ghost" onClick={handleClearFilters}>Clear Filters</Button>}
            />
          ) : (
            <>
              <div className="contractors-page__grid">
                {contractors.map((c) => (
                  <ContractorCard
                    key={c.id}
                    contractor={c}
                    basePath="/business/contractors"
                    showCompareToggle={true}
                    isSelectedForCompare={compareIds.includes(c.id)}
                    onToggleCompare={handleToggleCompare}
                  />
                ))}
              </div>

              {hasMore && (
                <div style={{ textAlign: 'center', marginTop: '32px' }}>
                  <Button variant="secondary" onClick={() => loadData(false)} disabled={loading}>
                    {loading ? 'Loading…' : 'Load More Contractors'}
                  </Button>
                </div>
              )}
            </>
          )}
        </main>

        {/* Floating Compare Action Bar */}
        {compareIds.length > 0 && (
          <div
            style={{
              position: 'fixed',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#0f172a',
              color: '#ffffff',
              padding: '12px 24px',
              borderRadius: '50px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
              zIndex: 1000,
              maxWidth: '90vw',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
              <span>⚖️</span>
              <span>{compareIds.length} Contractor{compareIds.length > 1 ? 's' : ''} Selected</span>
            </div>

            <Link
              href={`/business/compare?ids=${compareIds.join(',')}`}
              style={{
                background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
                color: '#ffffff',
                padding: '8px 18px',
                borderRadius: '25px',
                fontSize: '13.5px',
                fontWeight: 700,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Compare Now ({compareIds.length}) →
            </Link>

            <button
              type="button"
              onClick={() => setCompareIds([])}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: '13px',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              Clear
            </button>
          </div>
        )}
      </div>
    </>
  );
}
