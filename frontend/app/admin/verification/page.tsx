'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { apiGet } from '@/lib/api';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/util/date';
import {
  IconShield,
  IconAlertTriangle,
  IconX,
  IconMapPin,
  IconUsers,
  IconClock,
  IconArrowRight,
} from '@/components/ui/Icons';
import './admin-verification-queue.css';

interface VerificationItem {
  id: string;
  company_name: string;
  city: string | null;
  state: string | null;
  years_experience: number | null;
  workforce_size: number | null;
  verification_status: string;
  verification_note: string | null;
  created_at: string;
  email: string;
}

const TABS = [
  { key: 'pending', label: 'Pending KYC Review' },
  { key: 'verified', label: 'Verified Contractors' },
  { key: 'rejected', label: 'Rejected Requests' },
];

export default function AdminVerificationQueuePage() {
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState<string>('pending');

  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number; opacity: number }>({
    left: 4,
    width: 0,
    opacity: 0,
  });
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const loadQueue = () => {
    setLoading(true);
    apiGet<{ data: VerificationItem[] }>(`/admin/verification?status=${statusTab}`)
      .then(({ data }) => setItems(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadQueue();
  }, [statusTab]);

  useEffect(() => {
    const updateIndicator = () => {
      const activeEl = tabRefs.current[statusTab];
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
  }, [statusTab, items]);

  const getStatusPill = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'verified') {
      return (
        <span className="admin-queue-status-pill admin-queue-status-pill--verified">
          <IconShield size={11} /> Verified
        </span>
      );
    }
    if (s === 'rejected') {
      return (
        <span className="admin-queue-status-pill admin-queue-status-pill--rejected">
          <IconX size={11} /> Rejected
        </span>
      );
    }
    return (
      <span className="admin-queue-status-pill admin-queue-status-pill--pending">
        <IconAlertTriangle size={11} /> Pending Review
      </span>
    );
  };

  return (
    <div className="admin-verif-queue-page">
      <WorkspacePageHeader
        title="Verification Center"
        subtitle="Review contractor business compliance, workforce capacity, and credential submissions."
      />

      {/* Toolbar: Sliding Filter Tabs */}
      <div className="admin-verif-queue-toolbar">
        <div className="admin-verif-queue-tabs">
          <div
            className="admin-verif-queue-sliding-indicator"
            style={{
              transform: `translateX(${indicatorStyle.left}px)`,
              width: `${indicatorStyle.width}px`,
              opacity: indicatorStyle.opacity,
            }}
          />
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              ref={(el) => { tabRefs.current[tab.key] = el; }}
              className={`admin-verif-queue-tab-btn ${statusTab === tab.key ? 'active' : ''}`}
              onClick={() => setStatusTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading verification queue…" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<IconShield size={32} />}
          title={`No ${statusTab.replace('_', ' ')} verification requests`}
          subtitle="Verification queue is clean for this status filter."
        />
      ) : (
        <div className="admin-verif-queue-grid">
          {items.map((item) => (
            <div key={item.id} className="admin-verif-queue-card">
              <div className="admin-verif-queue-card__header">
                <div className="admin-verif-queue-company">
                  <div className="admin-verif-queue-avatar">
                    {item.company_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="admin-verif-queue-title">{item.company_name}</h3>
                    <p className="admin-verif-queue-email">{item.email}</p>
                  </div>
                </div>
                {getStatusPill(item.verification_status)}
              </div>

              <div className="admin-verif-queue-details">
                <div className="admin-verif-queue-detail-row">
                  <IconMapPin size={13} className="admin-verif-queue-detail-icon" />
                  <span>{[item.city, item.state].filter(Boolean).join(', ') || 'Not specified'}</span>
                </div>
                <div className="admin-verif-queue-detail-row">
                  <IconUsers size={13} className="admin-verif-queue-detail-icon" />
                  <span>{item.workforce_size ? `${item.workforce_size} Workers Available` : 'Workforce Unspecified'}</span>
                </div>
                <div className="admin-verif-queue-detail-row">
                  <IconClock size={13} className="admin-verif-queue-detail-icon" />
                  <span>{item.years_experience ? `${item.years_experience} Years Experience` : 'Experience Unspecified'}</span>
                </div>
                <span className="admin-verif-queue-date">
                  Submitted: {formatDate(item.created_at)}
                </span>
              </div>

              <Link href={`/admin/verification/${item.id}`} className="admin-queue-review-btn">
                Review Verification Checklist <IconArrowRight size={13} />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
