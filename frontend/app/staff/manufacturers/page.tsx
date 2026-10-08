'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { getStaffManufacturers, type StaffManufacturerItem } from '@/lib/api/staff';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import CustomSelect, { type SelectOption } from '@/components/ui/CustomSelect';
import {
  IconBuilding,
  IconSearch,
  IconPlus,
  IconMapPin,
  IconMail,
  IconPhone,
  IconCalendar,
  IconRequirements,
  IconArrowRight,
  IconUsers,
  IconCheck,
} from '@/components/ui/Icons';
import './staff-manufacturers.css';

const STATUS_FILTER_OPTIONS: SelectOption[] = [
  { value: '', label: 'All Statuses' },
  { value: 'has_reqs', label: 'Has Requirements' },
  { value: 'no_reqs', label: 'No Requirements' },
  { value: 'onboarded', label: 'Onboarding Complete' },
  { value: 'pending', label: 'Onboarding Pending' },
  { value: 'active', label: 'Active Accounts' },
  { value: 'inactive', label: 'Inactive Accounts' },
];

export default function StaffManufacturersPage() {
  const [manufacturers, setManufacturers] = useState<StaffManufacturerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const fetchManufacturers = () => {
    setLoading(true);
    getStaffManufacturers({
      q: q.trim() || undefined,
      industry: industryFilter || undefined,
    })
      .then(({ data }) => setManufacturers(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchManufacturers();
  }, [industryFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchManufacturers();
  };

  const handleReset = () => {
    setQ('');
    setIndustryFilter('');
    setStatusFilter('');
    setLoading(true);
    getStaffManufacturers()
      .then(({ data }) => setManufacturers(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  // Build dynamic industry options based on fetched data + standard sectors
  const industryOptions: SelectOption[] = useMemo(() => {
    const defaultSectors = [
      'Automotive',
      'Textiles & Garments',
      'Electronics',
      'Pharmaceuticals',
      'Steel & Metals',
      'Food Processing',
      'Packaging',
      'Construction & Infrastructure',
      'General Manufacturing',
    ];
    const dataSectors = manufacturers.map((m) => m.industry).filter(Boolean) as string[];
    const combined = Array.from(new Set([...defaultSectors, ...dataSectors])).sort();

    return [
      { value: '', label: 'All Industries' },
      ...combined.map((ind) => ({ value: ind, label: ind })),
    ];
  }, [manufacturers]);

  // Client-side filtering for status filter and search refine
  const displayedManufacturers = useMemo(() => {
    return manufacturers.filter((m) => {
      // Status filter
      if (statusFilter === 'has_reqs' && (m.requirements_count || 0) === 0) return false;
      if (statusFilter === 'no_reqs' && (m.requirements_count || 0) > 0) return false;
      if (statusFilter === 'onboarded' && !m.onboarding_complete) return false;
      if (statusFilter === 'pending' && m.onboarding_complete) return false;
      if (statusFilter === 'active' && !m.is_active) return false;
      if (statusFilter === 'inactive' && m.is_active) return false;

      // In-memory query match if user typed something and hasn't submitted yet
      if (q.trim()) {
        const query = q.trim().toLowerCase();
        const matchesName = m.company_name?.toLowerCase().includes(query);
        const matchesCity = m.city?.toLowerCase().includes(query);
        const matchesState = m.state?.toLowerCase().includes(query);
        const matchesEmail = m.email?.toLowerCase().includes(query);
        const matchesPhone = m.phone?.toLowerCase().includes(query);
        const matchesIndustry = m.industry?.toLowerCase().includes(query);
        if (!matchesName && !matchesCity && !matchesState && !matchesEmail && !matchesPhone && !matchesIndustry) {
          return false;
        }
      }

      return true;
    });
  }, [manufacturers, statusFilter, q]);

  // Summary Metrics
  const totalCount = manufacturers.length;
  const totalReqs = useMemo(
    () => manufacturers.reduce((acc, m) => acc + (m.requirements_count || 0), 0),
    [manufacturers]
  );
  const onboardedCount = useMemo(
    () => manufacturers.filter((m) => m.onboarding_complete).length,
    [manufacturers]
  );
  const withReqsCount = useMemo(
    () => manufacturers.filter((m) => (m.requirements_count || 0) > 0).length,
    [manufacturers]
  );

  const hasActiveFilters = Boolean(q.trim() || industryFilter || statusFilter);

  return (
    <div className="staff-contractors-page">
      {/* Top Header Row */}
      <div className="staff-contractors-header-row">
        <WorkspacePageHeader
          title="Manufacturers Directory"
          subtitle="Manage enterprise client accounts, monitor onboarding progress, and review manpower requirements."
        />
        <Link href="/staff/manufacturers/new" className="staff-btn-add">
          <IconPlus size={15} style={{ marginRight: 6 }} /> Create Manufacturer
        </Link>
      </div>

      {/* Directory Stats Overview Bar */}
      <div className="staff-mfg-stats-row">
        <div className="staff-mfg-stat-chip">
          <div className="staff-mfg-stat-icon staff-mfg-stat-icon--navy">
            <IconBuilding size={20} />
          </div>
          <div className="staff-mfg-stat-info">
            <span className="staff-mfg-stat-val">{totalCount}</span>
            <span className="staff-mfg-stat-lbl">Total Manufacturers</span>
          </div>
        </div>

        <div className="staff-mfg-stat-chip">
          <div className="staff-mfg-stat-icon staff-mfg-stat-icon--teal">
            <IconRequirements size={20} />
          </div>
          <div className="staff-mfg-stat-info">
            <span className="staff-mfg-stat-val">{totalReqs}</span>
            <span className="staff-mfg-stat-lbl">Active Requirements</span>
          </div>
        </div>

        <div className="staff-mfg-stat-chip">
          <div className="staff-mfg-stat-icon staff-mfg-stat-icon--green">
            <IconCheck size={20} />
          </div>
          <div className="staff-mfg-stat-info">
            <span className="staff-mfg-stat-val">{onboardedCount}</span>
            <span className="staff-mfg-stat-lbl">Onboarding Complete</span>
          </div>
        </div>

        <div className="staff-mfg-stat-chip">
          <div className="staff-mfg-stat-icon staff-mfg-stat-icon--amber">
            <IconUsers size={20} />
          </div>
          <div className="staff-mfg-stat-info">
            <span className="staff-mfg-stat-val">{withReqsCount}</span>
            <span className="staff-mfg-stat-lbl">Hiring Clients</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <form onSubmit={handleSearch} className="staff-search-toolbar">
        <div className="staff-search-input-wrapper">
          <IconSearch size={16} className="staff-search-icon" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by company name, city, state, or email…"
            className="staff-search-input"
          />
        </div>

        <CustomSelect
          options={industryOptions}
          value={industryFilter}
          onChange={(val) => setIndustryFilter(val)}
          placeholder="All Industries"
        />

        <CustomSelect
          options={STATUS_FILTER_OPTIONS}
          value={statusFilter}
          onChange={(val) => setStatusFilter(val)}
          placeholder="All Statuses"
        />

        <div className="staff-search-actions">
          <button type="submit" className="staff-search-btn">
            Search
          </button>
          {hasActiveFilters && (
            <button type="button" onClick={handleReset} className="staff-btn-reset">
              Reset
            </button>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="staff-view-toggle" title="Switch layout">
          <button
            type="button"
            className={`staff-view-btn ${viewMode === 'list' ? 'is-active' : ''}`}
            onClick={() => setViewMode('list')}
            aria-label="List view"
            title="List view"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </button>
          <button
            type="button"
            className={`staff-view-btn ${viewMode === 'grid' ? 'is-active' : ''}`}
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
            title="Grid view"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>
        </div>
      </form>

      {/* Results Count Banner */}
      {!loading && displayedManufacturers.length > 0 && (
        <div className="staff-results-bar">
          <span>
            Showing <strong className="staff-results-count">{displayedManufacturers.length}</strong> {displayedManufacturers.length === 1 ? 'manufacturer' : 'manufacturers'}
            {hasActiveFilters && ' matching active filters'}
          </span>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <LoadingState label="Loading Manufacturers Directory…" />
      ) : displayedManufacturers.length === 0 ? (
        <EmptyState
          icon={<IconBuilding size={36} />}
          title="No Manufacturers Found"
          subtitle={
            hasActiveFilters
              ? 'No manufacturers match your search criteria. Try resetting filters or adjusting search terms.'
              : 'No enterprise manufacturer accounts have been provisioned yet.'
          }
          action={
            hasActiveFilters ? (
              <button
                type="button"
                onClick={handleReset}
                className="staff-btn-add"
                style={{ marginTop: '8px' }}
              >
                Clear Filters
              </button>
            ) : (
              <Link href="/staff/manufacturers/new" className="staff-btn-add" style={{ marginTop: '8px' }}>
                <IconPlus size={15} style={{ marginRight: 6 }} /> Create First Manufacturer
              </Link>
            )
          }
        />
      ) : viewMode === 'list' ? (
        /* List View: Identical layout and aesthetics to Managed Contractors */
        <div className="staff-contractors-list">
          {displayedManufacturers.map((m) => {
            const initial = m.company_name?.trim() ? m.company_name.trim().charAt(0).toUpperCase() : 'M';
            return (
              <div key={m.id} className="staff-contractor-card">
                <div className="staff-contractor-card__main">
                  <div className="staff-contractor-card__top">
                    <div className="staff-mfg-avatar" title={m.company_name}>
                      {initial}
                    </div>

                    <h3 className="staff-contractor-name">{m.company_name}</h3>

                    {/* Industry Pill */}
                    <span className="staff-mfg-pill staff-mfg-pill--industry">
                      {m.industry || 'General Manufacturing'}
                    </span>

                    {/* Requirements Count Badge */}
                    <span
                      className={`staff-mfg-pill staff-mfg-pill--reqs ${(m.requirements_count || 0) > 0 ? 'staff-mfg-pill--reqs-active' : ''}`}
                    >
                      <IconRequirements size={12} style={{ marginRight: 4 }} />
                      {m.requirements_count || 0} {(m.requirements_count === 1) ? 'Requirement' : 'Requirements'}
                    </span>

                    {/* Onboarding State Badge */}
                    {m.onboarding_complete ? (
                      <span className="staff-verif-badge staff-verif-badge--verified" title="Account profile setup is complete">
                        ✓ Onboarded
                      </span>
                    ) : (
                      <span className="staff-verif-badge staff-verif-badge--pending" title="Manufacturer setup incomplete">
                        ⏳ Setup Pending
                      </span>
                    )}

                    {/* Account Status Badge */}
                    {m.is_active ? (
                      <span className="status-tag status-tag--listed">Active</span>
                    ) : (
                      <span className="status-tag status-tag--unlisted">Inactive</span>
                    )}
                  </div>

                  <div className="staff-contractor-card__details">
                    <span className="staff-detail-item">
                      <IconMapPin size={13} className="staff-detail-icon" />
                      {[m.city, m.state].filter(Boolean).join(', ') || 'Location not specified'}
                    </span>

                    <span className="staff-detail-item staff-detail-item--email" title={m.email}>
                      <IconMail size={13} className="staff-detail-icon" />
                      <span className="staff-mfg-email-text">{m.email}</span>
                    </span>

                    {m.phone && (
                      <span className="staff-detail-item">
                        <IconPhone size={13} className="staff-detail-icon" />
                        {m.phone}
                      </span>
                    )}

                    <span className="staff-detail-item">
                      <IconCalendar size={13} className="staff-detail-icon" />
                      Joined {new Date(m.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="staff-contractor-card__actions">
                  <Link href={`/staff/manufacturers/${m.id}`} className="staff-btn-view">
                    View Details <IconArrowRight size={13} style={{ marginLeft: 4 }} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Grid View: Responsive cards with structured layout */
        <div className="staff-mfg-grid">
          {displayedManufacturers.map((m) => {
            const initial = m.company_name?.trim() ? m.company_name.trim().charAt(0).toUpperCase() : 'M';
            return (
              <div key={m.id} className="staff-mfg-grid-card">
                <div className="staff-mfg-grid-card__header">
                  <div className="staff-mfg-avatar staff-mfg-avatar--lg">
                    {initial}
                  </div>
                  <div className="staff-mfg-grid-card__header-info">
                    <h3 className="staff-contractor-name" title={m.company_name}>
                      {m.company_name}
                    </h3>
                    <div className="staff-mfg-location">
                      <IconMapPin size={12} />
                      {[m.city, m.state].filter(Boolean).join(', ') || 'Location not set'}
                    </div>
                  </div>
                  {m.is_active ? (
                    <span className="status-tag status-tag--listed">Active</span>
                  ) : (
                    <span className="status-tag status-tag--unlisted">Inactive</span>
                  )}
                </div>

                <div className="staff-mfg-grid-card__badges">
                  <span className="staff-mfg-pill staff-mfg-pill--industry">
                    {m.industry || 'General Manufacturing'}
                  </span>
                  <span
                    className={`staff-mfg-pill staff-mfg-pill--reqs ${(m.requirements_count || 0) > 0 ? 'staff-mfg-pill--reqs-active' : ''}`}
                  >
                    <IconRequirements size={12} style={{ marginRight: 4 }} />
                    {m.requirements_count || 0} Reqs
                  </span>
                </div>

                <div className="staff-mfg-grid-card__meta">
                  <div className="staff-mfg-meta-row">
                    <span className="staff-mfg-meta-lbl">
                      <IconMail size={12} /> Email
                    </span>
                    <span className="staff-mfg-meta-val" title={m.email}>
                      {m.email}
                    </span>
                  </div>
                  <div className="staff-mfg-meta-row">
                    <span className="staff-mfg-meta-lbl">
                      <IconPhone size={12} /> Phone
                    </span>
                    <span className="staff-mfg-meta-val">{m.phone || '—'}</span>
                  </div>
                  <div className="staff-mfg-meta-row">
                    <span className="staff-mfg-meta-lbl">
                      <IconCalendar size={12} /> Joined
                    </span>
                    <span className="staff-mfg-meta-val">
                      {new Date(m.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="staff-mfg-grid-card__footer">
                  <span
                    className={`staff-mfg-onboarding-tag ${
                      m.onboarding_complete ? 'is-complete' : 'is-pending'
                    }`}
                  >
                    {m.onboarding_complete ? '✓ Onboarded' : '⏳ Setup Pending'}
                  </span>
                  <Link href={`/staff/manufacturers/${m.id}`} className="staff-btn-view">
                    View Details <IconArrowRight size={13} style={{ marginLeft: 4 }} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
