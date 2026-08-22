'use client';

import { useEffect, useState } from 'react';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { apiGet, apiPatch } from '@/lib/api';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import { formatDate } from '@/lib/util/date';

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

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('open');

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

  const handleResolve = async (id: string, actionStatus: 'resolved' | 'dismissed') => {
    try {
      await apiPatch(`/admin/reports/${id}`, { status: actionStatus, resolutionNotes: `Action taken: ${actionStatus}` });
      loadReports();
    } catch (err) {
      console.error('Failed to update report status', err);
    }
  };

  return (
    <>
      <WorkspacePageHeader
        title="Reports & Moderation"
        subtitle="Inspect and resolve platform trust, abuse, and safety reports."
      />
      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '1px solid var(--craly-border)', paddingBottom: '12px' }}>
        {['open', 'under_review', 'resolved', 'dismissed'].map((st) => (
          <button
            key={st}
            type="button"
            className={`btn ${statusFilter === st ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setStatusFilter(st)}
            style={{ textTransform: 'capitalize' }}
          >
            {st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState label="Loading reports queue…" />
      ) : reports.length === 0 ? (
        <EmptyState
          title={`No ${statusFilter.replace('_', ' ')} reports`}
          subtitle="Trust & safety queue is clear for this status filter."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {reports.map((rep) => (
            <div
              key={rep.id}
              style={{
                background: 'var(--craly-white)',
                border: '1px solid var(--craly-border)',
                borderRadius: '16px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#e11d48', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    CATEGORY: {rep.category}
                  </span>
                  <h3 style={{ margin: '4px 0 0', fontSize: '16px', color: 'var(--craly-navy)' }}>
                    Report by {rep.reporter_email} {rep.reported_user_email ? `against ${rep.reported_user_email}` : ''}
                  </h3>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--craly-muted)' }}>{formatDate(rep.created_at)}</span>
              </div>

              <div style={{ padding: '12px', background: 'var(--craly-off-white)', borderRadius: '10px', fontSize: '13.5px', color: 'var(--craly-navy)' }}>
                "{rep.description}"
              </div>

              {statusFilter === 'open' && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <Button variant="primary" size="sm" onClick={() => handleResolve(rep.id, 'resolved')}>
                    ✓ Mark Resolved
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleResolve(rep.id, 'dismissed')}>
                    Dismiss
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
