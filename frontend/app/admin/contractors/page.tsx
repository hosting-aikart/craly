'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { apiGet } from '@/lib/api';
import { updateAdminContractorListingStatus } from '@/lib/api/staff';
import SearchBar from '@/components/SearchBar';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import UnlistContractorModal from '@/components/staff/UnlistContractorModal';
import {
  IconBuilding,
  IconMapPin,
  IconShield,
  IconAlertTriangle,
  IconArrowRight,
  IconUsers,
} from '@/components/ui/Icons';
import './admin-contractors.css';

interface AdminContractorItem {
  id: string;
  user_id: string;
  company_name: string;
  city: string | null;
  state: string | null;
  verification_status: string;
  verification_note: string | null;
  is_unlisted?: boolean;
  unlisted_reason?: string | null;
  unlisted_at?: string | null;
  created_at: string;
  email: string;
}

type FilterTab = 'ALL' | 'VERIFIED' | 'PENDING' | 'UNVERIFIED';

export default function AdminContractorsPage() {
  const [contractors, setContractors] = useState<AdminContractorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number; opacity: number }>({
    left: 4,
    width: 0,
    opacity: 0,
  });
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  // Unlist modal state
  const [selectedContractor, setSelectedContractor] = useState<AdminContractorItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const updateIndicator = () => {
      const activeEl = tabRefs.current[activeTab];
      if (activeEl) {
        setIndicatorStyle({
          left: activeEl.offsetLeft,
          width: activeEl.offsetWidth,
          opacity: 1,
        });
      }
    };

    updateIndicator();
    const timeout = setTimeout(updateIndicator, 50);
    window.addEventListener('resize', updateIndicator);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', updateIndicator);
    };
  }, [activeTab, contractors]);

  useEffect(() => {
    apiGet<{ data: AdminContractorItem[] }>('/admin/contractors')
      .then(({ data }) => setContractors(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleOpenUnlistModal = (contractor: AdminContractorItem) => {
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

  const filtered = useMemo(() => {
    return contractors.filter((c) => {
      // Tab filter
      const status = (c.verification_status || '').toLowerCase();
      if (activeTab === 'VERIFIED' && status !== 'verified') return false;
      if (activeTab === 'PENDING' && status !== 'pending') return false;
      if (activeTab === 'UNVERIFIED' && (status === 'verified' || status === 'pending')) return false;

      // Query filter
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        c.company_name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q))
      );
    });
  }, [contractors, query, activeTab]);

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'verified') {
      return (
        <span className="admin-status-pill admin-status-pill--verified">
          <IconShield size={11} /> Verified
        </span>
      );
    }
    if (s === 'pending') {
      return (
        <span className="admin-status-pill admin-status-pill--pending">
          <IconAlertTriangle size={11} /> Pending
        </span>
      );
    }
    return (
      <span className="admin-status-pill admin-status-pill--unverified">
        Unverified
      </span>
    );
  };

  return (
    <div className="admin-contractors-page">
      <WorkspacePageHeader
        title="Contractor Operations"
        subtitle="Monitor contractor listings, directory visibility, workforce capacities, and verification compliance."
      />

      {/* Toolbar: Search & Status Filter Tabs */}
      <div className="admin-contractors-toolbar">
        <div className="admin-contractors-search">
          <SearchBar value={query} onChange={setQuery} placeholder="Search by name, email, or city..." />
        </div>
        <div className="admin-contractors-tabs">
          <div
            className="admin-contractors-sliding-indicator"
            style={{
              transform: `translateX(${indicatorStyle.left}px)`,
              width: `${indicatorStyle.width}px`,
              opacity: indicatorStyle.opacity,
            }}
          />
          <button
            type="button"
            ref={(el) => { tabRefs.current['ALL'] = el; }}
            className={`admin-tab-btn ${activeTab === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveTab('ALL')}
          >
            All ({contractors.length})
          </button>
          <button
            type="button"
            ref={(el) => { tabRefs.current['VERIFIED'] = el; }}
            className={`admin-tab-btn ${activeTab === 'VERIFIED' ? 'active' : ''}`}
            onClick={() => setActiveTab('VERIFIED')}
          >
            Verified ({contractors.filter((c) => (c.verification_status || '').toLowerCase() === 'verified').length})
          </button>
          <button
            type="button"
            ref={(el) => { tabRefs.current['PENDING'] = el; }}
            className={`admin-tab-btn ${activeTab === 'PENDING' ? 'active' : ''}`}
            onClick={() => setActiveTab('PENDING')}
          >
            Pending ({contractors.filter((c) => (c.verification_status || '').toLowerCase() === 'pending').length})
          </button>
          <button
            type="button"
            ref={(el) => { tabRefs.current['UNVERIFIED'] = el; }}
            className={`admin-tab-btn ${activeTab === 'UNVERIFIED' ? 'active' : ''}`}
            onClick={() => setActiveTab('UNVERIFIED')}
          >
            Unverified ({contractors.filter((c) => !['verified', 'pending'].includes((c.verification_status || '').toLowerCase())).length})
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading contractors list…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<IconUsers size={32} />}
          title="No contractors found"
          subtitle="No contractor profiles match your search criteria or filter tab."
        />
      ) : (
        <div className="admin-contractors-table-card">
          <table className="admin-contractors-table">
            <colgroup>
              <col style={{ width: '22%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '18%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Contact Email</th>
                <th>Location</th>
                <th>Verification</th>
                <th>Directory</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="contractor-name-cell">
                      <div className="contractor-avatar">
                        {c.company_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="contractor-company-text">{c.company_name}</span>
                    </div>
                  </td>
                  <td>
                    <span className="contractor-email-text">{c.email || '—'}</span>
                  </td>
                  <td>
                    <span className="contractor-location-text">
                      <IconMapPin size={12} style={{ marginRight: 4, color: 'var(--craly-teal, #0f8b82)', flexShrink: 0 }} />
                      {[c.city, c.state].filter(Boolean).join(', ') || '—'}
                    </span>
                  </td>
                  <td>{getStatusBadge(c.verification_status)}</td>
                  <td>
                    {c.is_unlisted ? (
                      <span
                        className="admin-status-pill admin-status-pill--unlisted"
                        title={c.unlisted_reason ? `Reason: ${c.unlisted_reason}` : 'Hidden from public directory'}
                      >
                        🚫 Unlisted
                      </span>
                    ) : (
                      <span className="admin-status-pill admin-status-pill--listed">
                        🌐 Listed
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="admin-actions-cell">
                      <button
                        type="button"
                        onClick={() => handleOpenUnlistModal(c)}
                        className={`admin-unlist-btn ${c.is_unlisted ? 'admin-unlist-btn--success' : 'admin-unlist-btn--danger'}`}
                      >
                        {c.is_unlisted ? 'Relist' : 'Unlist'}
                      </button>
                      <Link href={`/admin/verification/${c.id}`} className="admin-review-btn">
                        Review <IconArrowRight size={12} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
          apiUpdateFn={updateAdminContractorListingStatus}
        />
      )}
    </div>
  );
}
