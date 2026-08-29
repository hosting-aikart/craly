'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import {
  getStaffVerificationContractors,
  type StaffVerificationContractorItem,
} from '@/lib/api/staff';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import { IconShield, IconAlertTriangle, IconArrowRight } from '@/components/ui/Icons';
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

  // Sliding tab indicator
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number; opacity: number }>({
    left: 4,
    width: 0,
    opacity: 0,
  });
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  useEffect(() => {
    const updateIndicator = () => {
      const activeEl = tabRefs.current[activeFilter];
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
  }, [activeFilter]);

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

      {/* Filter Tabs Bar with Sliding Pill */}
      <div className="staff-verif-filters">
        <div
          className="staff-verif-sliding-indicator"
          style={{
            transform: `translateX(${indicatorStyle.left}px)`,
            width: `${indicatorStyle.width}px`,
            opacity: indicatorStyle.opacity,
          }}
        />
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            ref={(el) => {
              tabRefs.current[opt.value] = el;
            }}
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
              <colgroup>
                <col style={{ width: '24%' }} />
                <col style={{ width: '26%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '12%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Contractor / Company</th>
                  <th>Contact Email / Phone</th>
                  <th>Status</th>
                  <th>Pending Docs</th>
                  <th>Submitted</th>
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
                          <IconAlertTriangle size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                          {c.pending_docs_count} Pending
                        </span>
                      ) : (
                        <span className="staff-verif-docs-meta">
                          {c.total_docs_count} Total Doc{c.total_docs_count === 1 ? '' : 's'}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="staff-verif-date-val">
                        {c.last_submitted_at
                          ? new Date(c.last_submitted_at).toLocaleDateString()
                          : new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        href={`/staff/verification/${c.id}`}
                        className="staff-verif-review-btn"
                      >
                        Review <IconArrowRight size={11} style={{ marginLeft: 3, verticalAlign: 'middle' }} />
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
