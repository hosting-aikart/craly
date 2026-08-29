'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { apiGet } from '@/lib/api';
import { updateAdminContractorListingStatus } from '@/lib/api/staff';
import SearchBar from '@/components/SearchBar';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import UnlistContractorModal from '@/components/staff/UnlistContractorModal';

interface AdminContractorItem {
  id: string;
  user_id: string;
  company_name: string;
  city: string | null;
  state: string | null;
  verification_status: string;
  verification_note: string | null;
  is_unlisted?: boolean;
  unlisted_reason?: string | null;
  unlisted_at?: string | null;
  created_at: string;
  email: string;
}

export default function AdminContractorsPage() {
  const [contractors, setContractors] = useState<AdminContractorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  // Unlist modal state
  const [selectedContractor, setSelectedContractor] = useState<AdminContractorItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    apiGet<{ data: AdminContractorItem[] }>('/admin/contractors')
      .then(({ data }) => setContractors(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = contractors.filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return c.company_name.toLowerCase().includes(q) || (c.email && c.email.toLowerCase().includes(q)) || (c.city && c.city.toLowerCase().includes(q));
  });

  const handleOpenUnlistModal = (contractor: AdminContractorItem) => {
    setSelectedContractor(contractor);
    setModalOpen(true);
  };

  const handleListingUpdateSuccess = (isUnlisted: boolean, reason?: string) => {
    if (!selectedContractor) return;
    setContractors((prev) =>
      prev.map((item) =>
        item.id === selectedContractor.id
          ? {
              ...item,
              is_unlisted: isUnlisted,
              unlisted_reason: isUnlisted ? (reason || null) : null,
              unlisted_at: isUnlisted ? new Date().toISOString() : null,
            }
          : item,
      ),
    );
  };

  return (
    <>
      <WorkspacePageHeader
        title="Contractor Operations"
        subtitle="Monitor contractor listings, directory visibility, and verification statuses."
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
                <th style={{ padding: '12px 16px' }}>Directory Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--craly-border)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--craly-navy)' }}>{c.company_name}</td>
                  <td style={{ padding: '14px 16px' }}>{c.email || '—'}</td>
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
                  <td style={{ padding: '14px 16px' }}>
                    {c.is_unlisted ? (
                      <span
                        style={{
                          fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px',
                          background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', display: 'inline-flex', alignItems: 'center', gap: '4px'
                        }}
                        title={c.unlisted_reason ? `Reason: ${c.unlisted_reason}` : 'Hidden from public directory'}
                      >
                        🚫 Unlisted
                      </span>
                    ) : (
                      <span style={{
                        fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px',
                        background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', gap: '4px'
                      }}>
                        🌐 Public Listing
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenUnlistModal(c)}
                        style={{
                          background: '#ffffff',
                          color: c.is_unlisted ? 'var(--craly-teal, #0d9488)' : '#dc2626',
                          border: `1px solid ${c.is_unlisted ? '#a7f3d0' : '#fca5a5'}`,
                          padding: '5px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {c.is_unlisted ? 'Relist' : 'Unlist'}
                      </button>
                      <Link href={`/admin/verification/${c.id}`} className="btn btn--ghost btn--sm">
                        Review →
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedContractor && (
        <UnlistContractorModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          contractorId={selectedContractor.id}
          companyName={selectedContractor.company_name}
          currentlyUnlisted={!!selectedContractor.is_unlisted}
          currentReason={selectedContractor.unlisted_reason}
          onSuccess={handleListingUpdateSuccess}
          apiUpdateFn={updateAdminContractorListingStatus}
        />
      )}
    </>
  );
}
