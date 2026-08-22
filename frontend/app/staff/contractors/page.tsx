'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getStaffContractors, type StaffContractorItem } from '@/lib/api/staff';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import './staff-contractors.css';

export default function StaffContractorsPage() {
  const [contractors, setContractors] = useState<StaffContractorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [availability, setAvailability] = useState('');

  const fetchContractors = () => {
    setLoading(true);
    getStaffContractors({ q, availability: availability || undefined })
      .then(({ data }) => setContractors(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchContractors();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchContractors();
  };

  return (
    <div className="staff-contractors-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Managed Contractors Directory</h1>
          <p className="page-subtitle">
            Maintain basic contractor profiles, availability, and workforce information.
          </p>
        </div>
        <Link href="/staff/contractors/new" className="btn-add">
          + Add Contractor
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <form onSubmit={handleSearch} className="search-toolbar">
        <input
          type="text"
          placeholder="Search by company name, city..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="search-input"
        />

        <select
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
          className="filter-select"
        >
          <option value="">All Availability Statuses</option>
          <option value="AVAILABLE">AVAILABLE</option>
          <option value="CURRENTLY_AT_CAPACITY">CURRENTLY AT CAPACITY</option>
          <option value="NOT_AVAILABLE">NOT AVAILABLE</option>
          <option value="PAUSED">PAUSED</option>
          <option value="SUSPENDED">SUSPENDED</option>
        </select>

        <button type="submit" className="search-btn">
          Search
        </button>
      </form>

      {loading ? (
        <LoadingState label="Loading Contractors Directory…" />
      ) : contractors.length === 0 ? (
        <EmptyState
          icon="🏢"
          title="No Contractors Found"
          subtitle="No contractor records match your search query. Add a new contractor or reset filters."
        />
      ) : (
        <div className="contractors-list">
          {contractors.map((c) => (
            <div key={c.id} className="contractor-card">
              <div className="contractor-card__main">
                <div className="contractor-card__top">
                  <h3 className="contractor-name">{c.company_name}</h3>
                  <span className={`status-tag status-tag--${c.availability.toLowerCase()}`}>
                    {c.availability.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="contractor-card__details">
                  <span>📍 {[c.city, c.state].filter(Boolean).join(', ') || 'Location not specified'}</span>
                  {c.phone && <span>📞 {c.phone}</span>}
                  {c.workforce_size && <span>👥 {c.workforce_size} Workers</span>}
                  {c.years_experience && <span>⭐ {c.years_experience} Years Exp</span>}
                </div>
              </div>

              <div className="contractor-card__actions">
                <Link href={`/staff/contractors/${c.id}`} className="btn-view">
                  View / Edit Profile →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
