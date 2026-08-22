'use client';

import { useEffect, useState } from 'react';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { apiGet } from '@/lib/api';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/util/date';

interface AuditLogItem {
  id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  reason: string | null;
  admin_email: string;
  created_at: string;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ data: AuditLogItem[]; total: number }>('/admin/audit-logs')
      .then(({ data, total }) => {
        setLogs(data);
        setTotal(total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <WorkspacePageHeader
        title="Audit Trail Logs"
        subtitle={`Complete operational history of administrative actions (${total} entries).`}
      />
      {loading ? (
        <LoadingState label="Loading audit logs…" />
      ) : logs.length === 0 ? (
        <EmptyState title="No audit logs recorded" subtitle="System and administrative actions will appear here." />
      ) : (
        <div style={{ background: 'var(--craly-white)', border: '1px solid var(--craly-border)', borderRadius: '16px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
            <thead>
              <tr style={{ background: 'var(--craly-off-white)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px', color: 'var(--craly-muted)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px' }}>Timestamp</th>
                <th style={{ padding: '12px 16px' }}>Admin User</th>
                <th style={{ padding: '12px 16px' }}>Action Executed</th>
                <th style={{ padding: '12px 16px' }}>Target Type</th>
                <th style={{ padding: '12px 16px' }}>Reason / Notes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--craly-border)' }}>
                  <td style={{ padding: '14px 16px', color: 'var(--craly-muted)', whiteSpace: 'nowrap' }}>{formatDate(log.created_at)}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--craly-navy)' }}>{log.admin_email}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: 'var(--craly-mint)', color: 'var(--craly-teal-dark)' }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--craly-text)', textTransform: 'capitalize' }}>{log.target_type}</td>
                  <td style={{ padding: '14px 16px', color: 'var(--craly-muted)' }}>{log.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
