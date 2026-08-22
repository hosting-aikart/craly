'use client';

import { useEffect, useState } from 'react';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { apiGet } from '@/lib/api';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import StatusPill from '@/components/enquiries/StatusPill';
import { formatDate } from '@/lib/util/date';
import type { EnquiryStatus } from '@/lib/api/enquiries';

interface AdminEnquiryItem {
  id: string;
  business_name: string;
  contractor_name: string;
  category_name: string | null;
  workers_required: number | null;
  location: string | null;
  status: EnquiryStatus;
  created_at: string;
}

export default function AdminEnquiriesPage() {
  const [enquiries, setEnquiries] = useState<AdminEnquiryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ data: AdminEnquiryItem[] }>('/enquiries')
      .then(({ data }) => setEnquiries(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <WorkspacePageHeader
        title="Platform Enquiries Monitor"
        subtitle="Track B2B project requirement lifecycle states and acceptance conversion."
      />
      {loading ? (
        <LoadingState label="Loading enquiries monitor…" />
      ) : enquiries.length === 0 ? (
        <EmptyState title="No project enquiries submitted yet" subtitle="Submitted business project requests will appear here." />
      ) : (
        <div style={{ background: 'var(--craly-white)', border: '1px solid var(--craly-border)', borderRadius: '16px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
            <thead>
              <tr style={{ background: 'var(--craly-off-white)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px', color: 'var(--craly-muted)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px' }}>Business</th>
                <th style={{ padding: '12px 16px' }}>Target Contractor</th>
                <th style={{ padding: '12px 16px' }}>Requirement</th>
                <th style={{ padding: '12px 16px' }}>Date</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {enquiries.map((enq) => (
                <tr key={enq.id} style={{ borderBottom: '1px solid var(--craly-border)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--craly-navy)' }}>{enq.business_name || 'Business'}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--craly-navy)' }}>{enq.contractor_name || 'Contractor'}</td>
                  <td style={{ padding: '14px 16px', color: 'var(--craly-text)' }}>
                    {enq.category_name || 'Labour Supply'} {enq.workers_required ? `• ${enq.workers_required} workers` : ''} {enq.location ? `in ${enq.location}` : ''}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--craly-muted)' }}>{formatDate(enq.created_at)}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <StatusPill status={enq.status} viewer="admin" />
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
