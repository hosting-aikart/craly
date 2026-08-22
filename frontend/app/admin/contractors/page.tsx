'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { apiGet } from '@/lib/api';
import SearchBar from '@/components/SearchBar';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';

interface AdminContractorItem {
  id: string;
  user_id: string;
  company_name: string;
  city: string | null;
  state: string | null;
  verification_status: string;
  verification_note: string | null;
  created_at: string;
  email: string;
}

export default function AdminContractorsPage() {
  const [contractors, setContractors] = useState<AdminContractorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    apiGet<{ data: AdminContractorItem[] }>('/admin/contractors')
      .then(({ data }) => setContractors(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = contractors.filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return c.company_name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.city && c.city.toLowerCase().includes(q));
  });

  return (
    <>
      <WorkspacePageHeader
        title="Contractor Operations"
        subtitle="Monitor contractor listings, workforce capacities, and verification statuses."
      />
      <div style={{ marginBottom: '24px', maxWidth: '480px' }}>
        <SearchBar value={query} onChange={setQuery} placeholder="Filter contractors by name, email, or city..." />
      </div>

      {loading ? (
        <LoadingState label="Loading contractors list…" />
      ) : filtered.length === 0 ? (
        <EmptyState title="No contractors found" subtitle="No contractor profiles match your query." />
      ) : (
        <div style={{ background: 'var(--craly-white)', border: '1px solid var(--craly-border)', borderRadius: '16px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
            <thead>
              <tr style={{ background: 'var(--craly-off-white)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px', color: 'var(--craly-muted)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px' }}>Company Name</th>
                <th style={{ padding: '12px 16px' }}>Contact Email</th>
                <th style={{ padding: '12px 16px' }}>Location</th>
                <th style={{ padding: '12px 16px' }}>Verification</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--craly-border)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--craly-navy)' }}>{c.company_name}</td>
                  <td style={{ padding: '14px 16px' }}>{c.email}</td>
                  <td style={{ padding: '14px 16px', color: 'var(--craly-text)' }}>{[c.city, c.state].filter(Boolean).join(', ') || '—'}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase',
                      background: c.verification_status === 'verified' ? 'var(--craly-mint)' : c.verification_status === 'pending' ? '#fffbe8' : '#fef2f2',
                      color: c.verification_status === 'verified' ? 'var(--craly-teal-dark)' : c.verification_status === 'pending' ? '#b45309' : '#991b1b'
                    }}>
                      {c.verification_status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <Link href={`/admin/verification/${c.id}`} className="btn btn--ghost btn--sm">
                      Review Verification →
                    </Link>
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
