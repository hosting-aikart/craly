'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { listContractors, type ContractorListing } from '@/lib/api/contractors';
import LoadingState from '@/components/ui/LoadingState';
import ListedBadge from '@/components/ui/ListedBadge';
import './compare.css';

function ComparePageContent() {
  const searchParams = useSearchParams();
  const initialIdsParam = searchParams.get('ids');

  const [allContractors, setAllContractors] = useState<ContractorListing[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listContractors({ limit: 50 })
      .then(({ data }) => {
        setAllContractors(data);
        if (initialIdsParam) {
          const ids = initialIdsParam.split(',').filter(Boolean);
          const valid = ids.filter((id) => data.some((c) => c.id === id));
          if (valid.length > 0) {
            setSelectedIds(valid.slice(0, 4));
            return;
          }
        }
        // By default, pick top 2 if available
        if (data.length >= 2) {
          setSelectedIds([data[0].id, data[1].id]);
        } else if (data.length === 1) {
          setSelectedIds([data[0].id]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [initialIdsParam]);

  const addContractor = (id: string) => {
    if (!id || selectedIds.includes(id) || selectedIds.length >= 4) return;
    setSelectedIds([...selectedIds, id]);
  };

  const removeContractor = (id: string) => {
    setSelectedIds(selectedIds.filter((cid) => cid !== id));
  };

  const clearAll = () => {
    setSelectedIds([]);
  };

  if (loading) {
    return <LoadingState label="Loading comparison data…" />;
  }

  const selectedContractors = selectedIds
    .map((id) => allContractors.find((c) => c.id === id))
    .filter(Boolean) as ContractorListing[];

  const availableToAdd = allContractors.filter((c) => !selectedIds.includes(c.id));

  const maxWorkforce = Math.max(
    ...selectedContractors.map((c) => c.workforce_size || 0),
    0,
  );
  const maxExperience = Math.max(
    ...selectedContractors.map((c) => c.years_experience || 0),
    0,
  );

  return (
    <div className="compare-page">
      <div className="compare-header">
        <div className="compare-title-wrap">
          <h1>Compare Labour Contractors</h1>
          <p>
            Side-by-side evaluation of workforce size, verified credentials, and trade specializations.
          </p>
        </div>

        <div className="compare-actions">
          {availableToAdd.length > 0 && selectedIds.length < 4 && (
            <select
              className="compare-add-select"
              value=""
              onChange={(e) => addContractor(e.target.value)}
              aria-label="Add contractor to compare"
            >
              <option value="">＋ Add Contractor to Compare...</option>
              {availableToAdd.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name} ({c.city || 'National'}, {c.workforce_size || 0} Workers)
                </option>
              ))}
            </select>
          )}

          {selectedIds.length > 0 && (
            <button type="button" className="compare-clear-btn" onClick={clearAll}>
              Clear All ({selectedIds.length})
            </button>
          )}
        </div>
      </div>

      {selectedContractors.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            border: '1px dashed #cbd5e1',
            borderRadius: '12px',
            padding: '48px 24px',
            textAlign: 'center',
            marginBottom: '32px',
          }}
        >
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚖️</div>
          <h3 style={{ fontSize: '18px', color: '#0f172a', margin: '0 0 8px 0' }}>
            No Contractors Selected for Comparison
          </h3>
          <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '460px', margin: '0 auto 20px auto' }}>
            Select contractors from the directory below or use the dropdown above to compare them side-by-side.
          </p>
        </div>
      ) : (
        <div className="compare-table-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th className="compare-feature-col">Contractor Profile</th>
                {selectedContractors.map((c) => (
                  <th key={c.id} className="compare-contractor-col">
                    <div className="compare-contractor-header">
                      <div className="compare-contractor-top">
                        <ListedBadge compact />
                        <button
                          type="button"
                          className="compare-remove-btn"
                          onClick={() => removeContractor(c.id)}
                          title="Remove from comparison"
                          aria-label="Remove from comparison"
                        >
                          ✕
                        </button>
                      </div>
                      <h3 className="compare-company-name">{c.company_name}</h3>
                      <span className="compare-location-tag">
                        📍 {[c.city, c.state].filter(Boolean).join(', ') || 'Pan-India'}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Workforce Row */}
              <tr>
                <td className="compare-feature-col">
                  <div className="compare-feature-label">
                    <span>👥</span>
                    <span>Workforce Capacity</span>
                  </div>
                </td>
                {selectedContractors.map((c) => {
                  const size = c.workforce_size ?? 0;
                  const isMax = size > 0 && size === maxWorkforce && selectedContractors.length > 1;
                  return (
                    <td key={c.id} className="compare-contractor-col">
                      <div className="compare-metric-box">
                        <span className="compare-metric-val">{size || 'N/A'}</span>
                        <span className="compare-metric-unit">workers</span>
                      </div>
                      {isMax && (
                        <div className="compare-highlight-pill">
                          ⭐ Largest Capacity
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Experience Row */}
              <tr>
                <td className="compare-feature-col">
                  <div className="compare-feature-label">
                    <span>⭐</span>
                    <span>Industry Experience</span>
                  </div>
                </td>
                {selectedContractors.map((c) => {
                  const exp = c.years_experience ?? 0;
                  const isMax = exp > 0 && exp === maxExperience && selectedContractors.length > 1;
                  return (
                    <td key={c.id} className="compare-contractor-col">
                      <div className="compare-metric-box">
                        <span className="compare-metric-val">{exp || 'N/A'}</span>
                        <span className="compare-metric-unit">years</span>
                      </div>
                      {isMax && (
                        <div className="compare-highlight-pill">
                          🏆 Most Experienced
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Trade Categories */}
              <tr>
                <td className="compare-feature-col">
                  <div className="compare-feature-label">
                    <span>🛠️</span>
                    <span>Trades & Specializations</span>
                  </div>
                </td>
                {selectedContractors.map((c) => (
                  <td key={c.id} className="compare-contractor-col">
                    {c.categories && c.categories.length > 0 ? (
                      <div className="compare-skills-list">
                        {c.categories.map((cat) => (
                          <span key={cat.id} className="compare-skill-tag">
                            {cat.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '13px' }}>General Labour & Trades</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Operational Region */}
              <tr>
                <td className="compare-feature-col">
                  <div className="compare-feature-label">
                    <span>📍</span>
                    <span>Location & Base</span>
                  </div>
                </td>
                {selectedContractors.map((c) => (
                  <td key={c.id} className="compare-contractor-col">
                    <strong style={{ color: '#1e293b', fontSize: '13.5px' }}>
                      {[c.city, c.state].filter(Boolean).join(', ') || 'Pan-India Operations'}
                    </strong>
                    {c.description && (
                      <p style={{ color: '#64748b', fontSize: '12.5px', marginTop: '6px', lineHeight: 1.4 }}>
                        {c.description.length > 120 ? `${c.description.slice(0, 120)}…` : c.description}
                      </p>
                    )}
                  </td>
                ))}
              </tr>

              {/* Verification Status */}
              <tr>
                <td className="compare-feature-col">
                  <div className="compare-feature-label">
                    <span>🛡️</span>
                    <span>Verification & KYC</span>
                  </div>
                </td>
                {selectedContractors.map((c) => {
                  const status = c.verification_status || 'verified';
                  return (
                    <td key={c.id} className="compare-contractor-col">
                      <span
                        className={`compare-status-badge ${
                          status === 'verified'
                            ? 'compare-status-badge--verified'
                            : 'compare-status-badge--pending'
                        }`}
                      >
                        {status === 'verified' ? '✓ Craly Verified' : 'Under Review'}
                      </span>
                    </td>
                  );
                })}
              </tr>

              {/* Action Buttons */}
              <tr>
                <td className="compare-feature-col">
                  <div className="compare-feature-label">
                    <span>⚡</span>
                    <span>Direct Action</span>
                  </div>
                </td>
                {selectedContractors.map((c) => (
                  <td key={c.id} className="compare-contractor-col">
                    <div className="compare-action-buttons">
                      <Link
                        href={`/business/contractors/${c.id}/contact`}
                        className="compare-contact-btn"
                      >
                        Accept Application →
                      </Link>
                      <Link
                        href={`/business/contractors/${c.id}`}
                        className="compare-profile-link"
                      >
                        View Full Profile
                      </Link>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Suggested Contractors to add */}
      {availableToAdd.length > 0 && selectedIds.length < 4 && (
        <section className="compare-suggestions">
          <h2 className="compare-suggestions-title">
            Add More Contractors from Directory ({selectedIds.length}/4 selected)
          </h2>
          <div className="compare-suggestions-grid">
            {availableToAdd.slice(0, 6).map((c) => (
              <div key={c.id} className="compare-suggest-card">
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#0f172a', fontWeight: 700 }}>
                    {c.company_name}
                  </h4>
                  <p style={{ margin: '0 0 8px 0', fontSize: '12.5px', color: '#64748b' }}>
                    📍 {[c.city, c.state].filter(Boolean).join(', ') || 'Pan-India'}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: '#475569' }}>
                    {c.workforce_size != null && <span>👥 {c.workforce_size}+ Workers</span>}
                    {c.years_experience != null && <span>⭐ {c.years_experience}+ Yrs Exp</span>}
                  </div>
                </div>

                <button
                  type="button"
                  className="compare-suggest-add-btn"
                  onClick={() => addContractor(c.id)}
                >
                  ＋ Add to Comparison
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<LoadingState label="Loading comparison..." />}>
      <ComparePageContent />
    </Suspense>
  );
}
