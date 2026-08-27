'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { apiGet } from '@/lib/api';
import SearchBar from '@/components/SearchBar';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/util/date';

interface PlatformUser {
  id: string;
  email: string;
  role: 'business' | 'contractor' | 'admin';
  created_at: string;
  business_company?: string;
  contractor_company?: string;
  verification_status?: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const loadUsers = () => {
    setLoading(true);
    const search = new URLSearchParams();
    if (query) search.set('q', query);
    if (roleFilter) search.set('role', roleFilter);

    apiGet<{ data: PlatformUser[]; total: number }>(`/admin/users?${search.toString()}`)
      .then(({ data, total }) => {
        setUsers(data);
        setTotal(total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers();
  };

  return (
    <>
      <WorkspacePageHeader
        title="User Management"
        subtitle={`Search and monitor all registered accounts (${total} total users).`}
      />
      {/* Search & Filter Header */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
        <form onSubmit={handleSearchSubmit} style={{ flex: 1, minWidth: '280px', display: 'flex', gap: '8px' }}>
          <SearchBar value={query} onChange={setQuery} placeholder="Search user by email or company name..." />
          <button type="submit" className="btn btn--primary">Search</button>
        </form>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--craly-border)', fontSize: '13.5px', background: 'var(--craly-white)' }}
        >
          <option value="">All Roles</option>
          <option value="business">Business</option>
          <option value="contractor">Contractor</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {loading ? (
        <LoadingState label="Loading users…" />
      ) : users.length === 0 ? (
        <EmptyState title="No users found" subtitle="No registered accounts match your search filters." />
      ) : (
        <div style={{ background: 'var(--craly-white)', border: '1px solid var(--craly-border)', borderRadius: '16px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
            <thead>
              <tr style={{ background: 'var(--craly-off-white)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px', color: 'var(--craly-muted)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px' }}>User Email</th>
                <th style={{ padding: '12px 16px' }}>Role</th>
                <th style={{ padding: '12px 16px' }}>Company Name</th>
                <th style={{ padding: '12px 16px' }}>Joined Date</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--craly-border)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--craly-navy)' }}>{u.email}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase',
                      background: u.role === 'admin' ? '#ffe4e6' : u.role === 'contractor' ? 'var(--craly-mint)' : '#e0f2fe',
                      color: u.role === 'admin' ? '#9f1239' : u.role === 'contractor' ? 'var(--craly-teal-dark)' : '#0369a1'
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--craly-text)' }}>
                    {u.business_company || u.contractor_company || '—'}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--craly-muted)' }}>{formatDate(u.created_at)}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <Link href={`/admin/users/${u.id}`} className="btn btn--ghost btn--sm">
                      Inspect Account →
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
