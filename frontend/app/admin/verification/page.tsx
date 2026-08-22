'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { apiGet } from '@/lib/api';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/util/date';

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

export default function AdminVerificationQueuePage() {
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState<string>('pending');

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

  return (
    <>
      <WorkspacePageHeader
        title="Verification Center"
        subtitle="Review contractor business compliance, workforce details, and verification requests."
      />
      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '1px solid var(--craly-border)', paddingBottom: '12px' }}>
        {['pending', 'verified', 'rejected'].map((st) => (
          <button
            key={st}
            type="button"
            className={`btn ${statusTab === st ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setStatusTab(st)}
            style={{ textTransform: 'capitalize' }}
          >
            {st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState label="Loading verification queue…" />
      ) : items.length === 0 ? (
        <EmptyState
          title={`No ${statusTab.replace('_', ' ')} verification requests`}
          subtitle="Verification queue is clean for this status filter."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                background: 'var(--craly-white)',
                border: '1px solid var(--craly-border)',
                borderRadius: '16px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', color: 'var(--craly-navy)' }}>{item.company_name}</h3>
                  <span style={{ fontSize: '13px', color: 'var(--craly-muted)' }}>{item.email}</span>
                </div>
                <span style={{
                  fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase',
                  background: item.verification_status === 'verified' ? 'var(--craly-mint)' : item.verification_status === 'pending' ? '#fffbe8' : '#fef2f2',
                  color: item.verification_status === 'verified' ? 'var(--craly-teal-dark)' : item.verification_status === 'pending' ? '#b45309' : '#991b1b'
                }}>
                  {item.verification_status}
                </span>
              </div>

              <div style={{ padding: '12px', background: 'var(--craly-off-white)', borderRadius: '10px', fontSize: '13px', color: 'var(--craly-navy)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span>📍 Location: {[item.city, item.state].filter(Boolean).join(', ') || 'Not specified'}</span>
                <span>👥 Workforce Size: {item.workforce_size ? `${item.workforce_size} workers` : 'Unspecified'}</span>
                <span>⏱️ Experience: {item.years_experience ? `${item.years_experience} years` : 'Unspecified'}</span>
                <span style={{ fontSize: '11px', color: 'var(--craly-muted)', marginTop: '4px' }}>Submitted: {formatDate(item.created_at)}</span>
              </div>

              <Link href={`/admin/verification/${item.id}`} className="btn btn--primary btn--sm" style={{ textDecoration: 'none', textAlign: 'center', marginTop: '4px' }}>
                Review Verification Checklist →
              </Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
