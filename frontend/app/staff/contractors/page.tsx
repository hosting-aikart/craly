'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { getStaffContractors, updateStaffContractorListingStatus, type StaffContractorItem } from '@/lib/api/staff';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import CustomSelect, { type SelectOption } from '@/components/ui/CustomSelect';
import UnlistContractorModal from '@/components/staff/UnlistContractorModal';
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

const LISTING_STATUS_OPTIONS: SelectOption[] = [
  { value: '', label: 'All Listings (Public & Unlisted)' },
  { value: 'listed', label: 'Listed Only (Public)' },
  { value: 'unlisted', label: 'Unlisted Only (Hidden)' },
];

export default function StaffContractorsPage() {
  const [contractors, setContractors] = useState<StaffContractorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [availability, setAvailability] = useState('');
  const [listingStatus, setListingStatus] = useState('');

  // Unlist modal state
  const [selectedContractor, setSelectedContractor] = useState<StaffContractorItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchContractors = () => {
    setLoading(true);
    getStaffContractors({
      q,
      availability: availability || undefined,
      listingStatus: listingStatus || undefined,
    })
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

  const handleOpenUnlistModal = (contractor: StaffContractorItem) => {
    setSelectedContractor(contractor);
    setModalOpen(true);
  };

  const handleListingUpdateSuccess = (isUnlisted: boolean, reason?: string) => {
    if (!selectedContractor) return;
    setContractors((prev) =>
      prev.map((item) =>
        item.id === selectedContractor.id
          ? {
              ...item,
              is_unlisted: isUnlisted,
              unlisted_reason: isUnlisted ? (reason || null) : null,
              unlisted_at: isUnlisted ? new Date().toISOString() : null,
            }
          : item,
      ),
    );
  };

  return (
    <div className="staff-contractors-page">
      <div className="staff-contractors-header-row">
        <WorkspacePageHeader
          title="Managed Contractors Directory"
          subtitle="Maintain contractor profiles, directory listing visibility, and workforce information."
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

        <CustomSelect
          options={LISTING_STATUS_OPTIONS}
          value={listingStatus}
          onChange={(val) => {
            setListingStatus(val);
          }}
          placeholder="All Listings"
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
                  {c.is_unlisted ? (
                    <span className="status-tag status-tag--unlisted" title={c.unlisted_reason ? `Reason: ${c.unlisted_reason}` : 'Hidden from public directory'}>
                      🚫 Unlisted
                    </span>
                  ) : (
                    <span className="status-tag status-tag--listed">
                      🌐 Public Listing
                    </span>
                  )}
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

                {c.is_unlisted && c.unlisted_reason && (
                  <div className="unlist-reason-hint">
                    <strong>Unlisting Reason:</strong> {c.unlisted_reason}
                  </div>
                )}
              </div>

              <div className="staff-contractor-card__actions">
                <button
                  type="button"
                  onClick={() => handleOpenUnlistModal(c)}
                  className={c.is_unlisted ? 'btn-action-relist' : 'btn-action-unlist'}
                >
                  {c.is_unlisted ? 'Relist Profile' : 'Unlist'}
                </button>
                <Link href={`/staff/contractors/${c.id}`} className="staff-btn-view">
                  View Profile <IconArrowRight size={13} style={{ marginLeft: 4 }} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedContractor && (
        <UnlistContractorModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          contractorId={selectedContractor.id}
          companyName={selectedContractor.company_name}
          currentlyUnlisted={!!selectedContractor.is_unlisted}
          currentReason={selectedContractor.unlisted_reason}
          onSuccess={handleListingUpdateSuccess}
          apiUpdateFn={updateStaffContractorListingStatus}
        />
      )}
    </div>
  );
}
