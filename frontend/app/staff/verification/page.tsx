'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import {
  getStaffVerificationContractors,
  type StaffVerificationContractorItem,
} from '@/lib/api/staff';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import { IconShield, IconZap } from '@/components/ui/Icons';
import './staff-verification.css';

const FILTER_OPTIONS = [
  { label: 'All Contractors', value: '' },
  { label: 'Pending Review', value: 'pending' },
  { label: 'Under Review', value: 'under_review' },
  { label: 'Needs Changes', value: 'needs_changes' },
  { label: 'Verified', value: 'verified' },
  { label: 'Rejected', value: 'rejected' },
];

export default function StaffVerificationPage() {
  const [contractors, setContractors] = useState<StaffVerificationContractorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('');

  const fetchContractors = (statusFilter: string) => {
    setLoading(true);
    getStaffVerificationContractors(statusFilter)
      .then(({ data }) => setContractors(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchContractors(activeFilter);
  }, [activeFilter]);

  return (
    <div className="staff-verif-container">
      <WorkspacePageHeader
        title="KYC & Document Verification"
        subtitle="Review contractor identity, tax registration, trade licenses, and safety compliance documents."
      />

      {/* Filter Tabs */}
      <div className="staff-verif-filters">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`staff-verif-filter-btn ${activeFilter === opt.value ? 'staff-verif-filter-btn--active' : ''}`}
            onClick={() => setActiveFilter(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Contractor List */}
      {loading ? (
        <LoadingState label="Loading verification Queue…" />
      ) : contractors.length === 0 ? (
        <EmptyState
          icon={<IconShield size={26} />}
          title="No Contractors Found"
          subtitle="There are currently no contractors matching the selected verification filter."
        />
      ) : (
        <div className="staff-verif-card">
          <div className="staff-verif-table-wrapper">
            <table className="staff-verif-table">
              <thead>
                <tr>
                  <th>Contractor / Company</th>
                  <th>Contact Email / Phone</th>
                  <th>Verification Status</th>
                  <th>Pending Documents</th>
                  <th>Last Submitted</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {contractors.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="staff-verif-company-name">{c.company_name}</div>
                      <div className="staff-verif-company-sub">
                        {[c.city, c.state].filter(Boolean).join(', ') || 'Location unmapped'}
                      </div>
                    </td>
                    <td>
                      <div className="staff-verif-text-main">{c.user_email || '—'}</div>
                      <div className="staff-verif-text-sub">{c.phone || 'No phone'}</div>
                    </td>
                    <td>
                      <span className={`staff-verif-badge staff-verif-badge--${c.verification_status}`}>
                        {c.verification_status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {c.pending_docs_count > 0 ? (
                        <span className="staff-verif-pending-tag">
                          ⚡ {c.pending_docs_count} Pending Doc{c.pending_docs_count > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="staff-verif-docs-meta">
                          {c.total_docs_count} Total Doc{c.total_docs_count === 1 ? '' : 's'}
                        </span>
                      )}
                    </td>
                    <td>
                      {c.last_submitted_at
                        ? new Date(c.last_submitted_at).toLocaleDateString()
                        : new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        href={`/staff/verification/${c.id}`}
                        className="staff-verif-review-btn"
                      >
                        Review Documents →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
