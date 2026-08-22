'use client';

import { useEffect, useState } from 'react';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { apiGet } from '@/lib/api';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/util/date';

interface AdminMeetingItem {
  id: string;
  title: string;
  scheduled_start: string;
  scheduled_end: string;
  other_party_name: string;
  business_name?: string;
  contractor_name?: string;
  google_meet_url: string | null;
}

export default function AdminMeetingsPage() {
  const [meetings, setMeetings] = useState<AdminMeetingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ data: AdminMeetingItem[] }>('/meetings')
      .then(({ data }) => setMeetings(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <WorkspacePageHeader
        title="Platform Meetings Monitor"
        subtitle="Monitor Google Meet video scheduling activity between businesses and contractors."
      />
      {loading ? (
        <LoadingState label="Loading meetings list…" />
      ) : meetings.length === 0 ? (
        <EmptyState title="No scheduled meetings" subtitle="Scheduled Google Meet calls will appear here." />
      ) : (
        <div style={{ background: 'var(--craly-white)', border: '1px solid var(--craly-border)', borderRadius: '16px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
            <thead>
              <tr style={{ background: 'var(--craly-off-white)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px', color: 'var(--craly-muted)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px' }}>Meeting Topic</th>
                <th style={{ padding: '12px 16px' }}>Participants</th>
                <th style={{ padding: '12px 16px' }}>Scheduled Start</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Conference Link</th>
              </tr>
            </thead>
            <tbody>
              {meetings.map((m) => (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--craly-border)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--craly-navy)' }}>{m.title}</td>
                  <td style={{ padding: '14px 16px', color: 'var(--craly-text)' }}>
                    {m.business_name || m.other_party_name} ↔ {m.contractor_name || 'Contractor'}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--craly-navy)' }}>
                    {formatDate(m.scheduled_start)} at {new Date(m.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    {m.google_meet_url ? (
                      <span style={{ fontSize: '12px', color: 'var(--craly-teal-dark)', fontWeight: 600 }}>📹 Meet Generated</span>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--craly-muted)' }}>Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
