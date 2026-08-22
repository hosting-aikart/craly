'use client';

import { useEffect, useState, useTransition } from 'react';
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

  const hasActiveFilters = Boolean(query || city || category || minExperience || minWorkforce);

  return (
    <>
      <WorkspacePageHeader
        title="Find Contractors"
        subtitle="Discover verified labour contractors by trade, location, and workforce capacity."
      />
      <div className="contractors-page__body" style={{ margin: 0 }}>
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
                  <ContractorCard key={c.id} contractor={c} basePath="/business/contractors" />
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
      </div>
    </>
  );
}
