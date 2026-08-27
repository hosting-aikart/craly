'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { apiGet } from '@/lib/api';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/util/date';

interface UserDetail {
  id: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
  business_company?: string;
  industry?: string;
  contractor_company?: string;
  verification_status?: string;
  auditHistory: any[];
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    apiGet<{ data: UserDetail }>(`/admin/users/${id}`)
      .then(({ data }) => setUser(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <>
      <WorkspacePageHeader
        title="User Account Overview"
        subtitle={user ? `Inspecting ${user.email} (${user.role.toUpperCase()})` : 'User Detail'}
      />
      <Link href="/admin/users" style={{ fontSize: '13px', color: 'var(--craly-teal)', textDecoration: 'none', fontWeight: 600, display: 'inline-block', marginBottom: '20px' }}>
        ← Back to Users
      </Link>

      {loading ? (
        <LoadingState label="Loading user details…" />
      ) : !user ? (
        <EmptyState title="User not found" subtitle="The requested account does not exist." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {/* Account Profile Card */}
          <div style={{ background: 'var(--craly-white)', border: '1px solid var(--craly-border)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--craly-navy)', borderBottom: '1px solid var(--craly-border)', paddingBottom: '12px' }}>Account Metadata</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px' }}>
              <div>
                <span style={{ color: 'var(--craly-muted)', display: 'block', fontSize: '12px' }}>User ID</span>
                <strong style={{ color: 'var(--craly-navy)' }}>{user.id}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--craly-muted)', display: 'block', fontSize: '12px' }}>Email Address</span>
                <strong style={{ color: 'var(--craly-navy)' }}>{user.email}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--craly-muted)', display: 'block', fontSize: '12px' }}>Account Role</span>
                <strong style={{ color: 'var(--craly-teal-dark)', textTransform: 'uppercase' }}>{user.role}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--craly-muted)', display: 'block', fontSize: '12px' }}>Company Name</span>
                <strong style={{ color: 'var(--craly-navy)' }}>{user.business_company || user.contractor_company || 'Not set'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--craly-muted)', display: 'block', fontSize: '12px' }}>Registration Date</span>
                <strong style={{ color: 'var(--craly-navy)' }}>{formatDate(user.created_at)}</strong>
              </div>
            </div>
          </div>

          {/* Audit History Card */}
          <div style={{ background: 'var(--craly-white)', border: '1px solid var(--craly-border)', borderRadius: '16px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: 'var(--craly-navy)', borderBottom: '1px solid var(--craly-border)', paddingBottom: '12px' }}>Administrative History</h3>

            {user.auditHistory.length === 0 ? (
              <EmptyState title="No admin actions recorded" subtitle="No status modifications have been performed on this user." />
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {user.auditHistory.map((h) => (
                  <li key={h.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--craly-border)' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--craly-navy)' }}>{h.action}</strong>
                    <span style={{ fontSize: '12px', color: 'var(--craly-muted)', display: 'block' }}>{formatDate(h.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
