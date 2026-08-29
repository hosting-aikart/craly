'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { getStaffContractors, type StaffContractorItem } from '@/lib/api/staff';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import CustomSelect, { type SelectOption } from '@/components/ui/CustomSelect';
import {
  IconBuilding,
  IconSearch,
  IconPlus,
  IconMapPin,
  IconUsers,
  IconTrending,
  IconArrowRight,
  IconMessage,
} from '@/components/ui/Icons';
import './staff-contractors.css';

const AVAILABILITY_OPTIONS: SelectOption[] = [
  { value: '', label: 'All Availability Statuses' },
  { value: 'AVAILABLE', label: 'AVAILABLE' },
  { value: 'CURRENTLY_AT_CAPACITY', label: 'CURRENTLY AT CAPACITY' },
  { value: 'NOT_AVAILABLE', label: 'NOT AVAILABLE' },
  { value: 'PAUSED', label: 'PAUSED' },
  { value: 'SUSPENDED', label: 'SUSPENDED' },
];

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
      <div className="staff-contractors-header-row">
        <WorkspacePageHeader
          title="Managed Contractors Directory"
          subtitle="Maintain contractor onboarding, availability statuses, and workforce profiles."
        />
        <Link href="/staff/contractors/new" className="staff-btn-add">
          <IconPlus size={15} style={{ marginRight: 6 }} /> Add Contractor
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <form onSubmit={handleSearch} className="staff-search-toolbar">
        <div className="staff-search-input-wrapper">
          <IconSearch size={16} className="staff-search-icon" />
          <input
            type="text"
            placeholder="Search company name, city, state..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="staff-search-input"
          />
        </div>

        <CustomSelect
          options={AVAILABILITY_OPTIONS}
          value={availability}
          onChange={(val) => {
            setAvailability(val);
          }}
          placeholder="All Availability Statuses"
        />

        <button type="submit" className="staff-search-btn">
          Search
        </button>
      </form>

      {loading ? (
        <LoadingState label="Loading Contractors Directory…" />
      ) : contractors.length === 0 ? (
        <EmptyState
          icon={<IconBuilding size={30} />}
          title="No Contractors Found"
          subtitle="No contractor records match your search query. Add a new contractor or reset filters."
        />
      ) : (
        <div className="staff-contractors-list">
          {contractors.map((c) => (
            <div key={c.id} className="staff-contractor-card">
              <div className="staff-contractor-card__main">
                <div className="staff-contractor-card__top">
                  <h3 className="staff-contractor-name">{c.company_name}</h3>
                  <span className={`staff-status-tag staff-status-tag--${c.availability.toLowerCase()}`}>
                    {c.availability.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="staff-contractor-card__details">
                  <span className="staff-detail-item">
                    <IconMapPin size={13} className="staff-detail-icon" />
                    {[c.city, c.state].filter(Boolean).join(', ') || 'Location not specified'}
                  </span>
                  {c.phone && (
                    <span className="staff-detail-item">
                      <IconMessage size={13} className="staff-detail-icon" />
                      {c.phone}
                    </span>
                  )}
                  {c.workforce_size && (
                    <span className="staff-detail-item">
                      <IconUsers size={13} className="staff-detail-icon" />
                      {c.workforce_size} Workers
                    </span>
                  )}
                  {c.years_experience && (
                    <span className="staff-detail-item">
                      <IconTrending size={13} className="staff-detail-icon" />
                      {c.years_experience} Years Exp
                    </span>
                  )}
                </div>
              </div>

              <div className="staff-contractor-card__actions">
                <Link href={`/staff/contractors/${c.id}`} className="staff-btn-view">
                  View Profile <IconArrowRight size={13} style={{ marginLeft: 4 }} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
