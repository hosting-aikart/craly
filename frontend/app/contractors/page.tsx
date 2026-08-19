'use client';

import { useEffect, useState } from 'react';
import { listContractors, listCategories, type ContractorListing } from '@/lib/api/contractors';
import type { Category } from '@/lib/api/profile';
import './contractors.css';

export default function ContractorsPage() {
  const [contractors, setContractors] = useState<ContractorListing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const limit = 12;

  useEffect(() => {
    listCategories()
      .then(({ data }) => setCategories(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');

    listContractors({ q: q || undefined, city: city || undefined, category: category || undefined, page, limit })
      .then(({ data }) => setContractors(data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load contractors.'))
      .finally(() => setLoading(false));
  }, [q, city, category, page]);

  return (
    <div className="directory">
      <div className="directory__header">
        <p className="directory__eyebrow">CONTRACTOR DIRECTORY</p>
        <h1 className="directory__heading">Find the Right Verified Contractor</h1>
        <p className="directory__subtext">
          Every profile below has been verified by Craly — browse, filter, and reach out with confidence.
        </p>
      </div>

      <div className="directory__filters">
        <input
          type="text"
          className="directory__search"
          placeholder="Search by company name…"
          value={q}
          onChange={(e) => { setPage(1); setQ(e.target.value); }}
        />
        <input
          type="text"
          className="directory__city"
          placeholder="City"
          value={city}
          onChange={(e) => { setPage(1); setCity(e.target.value); }}
        />
        <select
          className="directory__category"
          value={category}
          onChange={(e) => { setPage(1); setCategory(e.target.value); }}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="directory__status">Loading contractors…</p>
      ) : error ? (
        <p className="directory__status directory__status--error">{error}</p>
      ) : contractors.length === 0 ? (
        <p className="directory__status">No verified contractors match those filters yet.</p>
      ) : (
        <div className="directory__grid">
          {contractors.map((c) => (
            <div className="contractor-card" key={c.id}>
              <div className="contractor-card__top">
                <h3>{c.company_name}</h3>
                <span className="contractor-card__verified">✓ Verified</span>
              </div>

              {(c.city || c.state) && (
                <p className="contractor-card__location">
                  📍 {[c.city, c.state].filter(Boolean).join(', ')}
                </p>
              )}

              {c.description && <p className="contractor-card__desc">{c.description}</p>}

              <div className="contractor-card__stats">
                {c.years_experience != null && <span>{c.years_experience}+ yrs experience</span>}
                {c.workforce_size != null && <span>{c.workforce_size} workforce</span>}
              </div>

              {c.categories.length > 0 && (
                <div className="contractor-card__tags">
                  {c.categories.map((cat) => (
                    <span key={cat.id} className="contractor-card__tag">{cat.name}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="directory__pagination">
        <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>‹ Previous</button>
        <span>Page {page}</span>
        <button disabled={contractors.length < limit} onClick={() => setPage((p) => p + 1)}>Next ›</button>
      </div>
    </div>
  );
}
