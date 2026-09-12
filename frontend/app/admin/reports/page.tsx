'use client';

import { useEffect, useState, useRef } from 'react';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { apiGet, apiPatch } from '@/lib/api';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/util/date';
import {
  IconAlertCircle,
  IconCheck,
  IconX,
  IconShield,
} from '@/components/ui/Icons';
import './admin-reports.css';

interface ReportItem {
  id: string;
  category: string;
  description: string;
  status: string;
  created_at: string;
  reporter_email: string;
  reported_user_email: string | null;
  resolution_notes: string | null;
}

const REPORT_TABS = [
  { key: 'open', label: 'Open Reports' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'dismissed', label: 'Dismissed' },
];

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('open');

  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number; opacity: number }>({
    left: 4,
    width: 0,
    opacity: 0,
  });
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const loadReports = () => {
    setLoading(true);
    apiGet<{ data: ReportItem[] }>(`/admin/reports?status=${statusFilter}`)
      .then(({ data }) => setReports(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReports();
  }, [statusFilter]);

  useEffect(() => {
    const updateIndicator = () => {
      const activeEl = tabRefs.current[statusFilter];
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
  }, [statusFilter, reports]);

  const handleResolve = async (id: string, actionStatus: 'resolved' | 'dismissed') => {
    try {
      await apiPatch(`/admin/reports/${id}`, { status: actionStatus, resolutionNotes: `Action taken: ${actionStatus}` });
      loadReports();
    } catch (err) {
      console.error('Failed to update report status', err);
    }
  };

  return (
    <div className="admin-reports-page">
      <WorkspacePageHeader
        title="Reports & Moderation"
        subtitle="Inspect and resolve platform trust, safety, and community abuse reports."
      />

      {/* Toolbar: Sliding Filter Tabs */}
      <div className="admin-reports-toolbar">
        <div className="admin-reports-tabs">
          <div
            className="admin-reports-sliding-indicator"
            style={{
              transform: `translateX(${indicatorStyle.left}px)`,
              width: `${indicatorStyle.width}px`,
              opacity: indicatorStyle.opacity,
            }}
          />
          {REPORT_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              ref={(el) => { tabRefs.current[tab.key] = el; }}
              className={`admin-report-tab-btn ${statusFilter === tab.key ? 'active' : ''}`}
              onClick={() => setStatusFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading reports queue…" />
      ) : reports.length === 0 ? (
        <EmptyState
          icon={<IconShield size={32} />}
          title={`No ${statusFilter.replace('_', ' ')} reports`}
          subtitle="Trust & safety moderation queue is clean for this filter."
        />
      ) : (
        <div className="admin-reports-list">
          {reports.map((rep) => (
            <div key={rep.id} className="admin-report-card">
              <div className="admin-report-header">
                <div>
                  <span className="admin-report-category-badge">
                    <IconAlertCircle size={11} /> {rep.category}
                  </span>
                  <h3 className="admin-report-title">
                    Report filed by {rep.reporter_email} {rep.reported_user_email ? `against ${rep.reported_user_email}` : ''}
                  </h3>
                </div>
                <span className="admin-report-time">{formatDate(rep.created_at)}</span>
              </div>

              <div className="admin-report-body">
                "{rep.description}"
              </div>

              {statusFilter === 'open' && (
                <div className="admin-report-actions">
                  <button
                    type="button"
                    className="admin-report-resolve-btn"
                    onClick={() => handleResolve(rep.id, 'resolved')}
                  >
                    <IconCheck size={13} /> Mark Resolved
                  </button>
                  <button
                    type="button"
                    className="admin-report-dismiss-btn"
                    onClick={() => handleResolve(rep.id, 'dismissed')}
                  >
                    <IconX size={13} /> Dismiss
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
