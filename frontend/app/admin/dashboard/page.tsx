'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { apiGet } from '@/lib/api';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/util/date';

interface AdminDashboardData {
  totalUsers: number;
  totalContractors: number;
  totalBusinesses: number;
  verifiedContractors: number;
  pendingVerifications: number;
  totalEnquiries: number;
  activeConversations: number;
  recentActivity: any[];
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ data: AdminDashboardData }>('/admin/dashboard')
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <WorkspacePageHeader
        title="Admin Control Center"
        subtitle="Operational platform metrics, contractor verification queue, and audit trail."
      />
      {loading ? (
        <LoadingState label="Loading admin dashboard…" />
      ) : !data ? (
        <EmptyState title="Failed to load dashboard data" subtitle="Please check admin permissions." />
      ) : (
        <>
          {/* Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
            <div style={{ background: 'var(--craly-white)', border: '1px solid var(--craly-border)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--craly-muted)', letterSpacing: '0.5px' }}>TOTAL PLATFORM USERS</span>
              <strong style={{ fontSize: '28px', color: 'var(--craly-navy)', fontFamily: 'var(--font-heading)' }}>{data.totalUsers}</strong>
              <span style={{ fontSize: '12px', color: 'var(--craly-teal)' }}>{data.totalBusinesses} Businesses • {data.totalContractors} Contractors</span>
            </div>

            <div style={{ background: 'var(--craly-white)', border: '1px solid var(--craly-border)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--craly-muted)', letterSpacing: '0.5px' }}>VERIFIED CONTRACTORS</span>
              <strong style={{ fontSize: '28px', color: 'var(--craly-navy)', fontFamily: 'var(--font-heading)' }}>{data.verifiedContractors}</strong>
              <span style={{ fontSize: '12px', color: 'var(--craly-teal)' }}>Out of {data.totalContractors} total contractors</span>
            </div>

            <div style={{
              background: data.pendingVerifications > 0 ? '#fffbe8' : 'var(--craly-white)',
              border: data.pendingVerifications > 0 ? '1px solid #f59e0b' : '1px solid var(--craly-border)',
              borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px'
            }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: data.pendingVerifications > 0 ? '#b45309' : 'var(--craly-muted)', letterSpacing: '0.5px' }}>PENDING VERIFICATIONS</span>
              <strong style={{ fontSize: '28px', color: data.pendingVerifications > 0 ? '#b45309' : 'var(--craly-navy)', fontFamily: 'var(--font-heading)' }}>{data.pendingVerifications}</strong>
              <Link href="/admin/verification" style={{ fontSize: '12px', color: data.pendingVerifications > 0 ? '#b45309' : 'var(--craly-teal)', fontWeight: 700, textDecoration: 'none' }}>Review Queue →</Link>
            </div>

            <div style={{ background: 'var(--craly-white)', border: '1px solid var(--craly-border)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--craly-muted)', letterSpacing: '0.5px' }}>ENQUIRIES & CONVERSATIONS</span>
              <strong style={{ fontSize: '28px', color: 'var(--craly-navy)', fontFamily: 'var(--font-heading)' }}>{data.totalEnquiries}</strong>
              <span style={{ fontSize: '12px', color: 'var(--craly-teal)' }}>{data.activeConversations} Accepted chats</span>
            </div>
          </div>

          {/* Activity Trail & Shortcuts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
            <div style={{ background: 'var(--craly-white)', border: '1px solid var(--craly-border)', borderRadius: '16px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--craly-navy)' }}>Recent Audit Activity</h3>
                <Link href="/admin/audit-logs" style={{ fontSize: '12px', color: 'var(--craly-teal)', textDecoration: 'none', fontWeight: 600 }}>View All Logs →</Link>
              </div>

              {data.recentActivity.length === 0 ? (
                <EmptyState title="No audit logs recorded yet" subtitle="Administrative actions will appear here." />
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {data.recentActivity.map((act) => (
                    <li key={act.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--craly-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ fontSize: '13px', color: 'var(--craly-navy)', display: 'block' }}>{act.action}</strong>
                        <span style={{ fontSize: '12px', color: 'var(--craly-muted)' }}>By {act.admin_email}</span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--craly-muted)' }}>{formatDate(act.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div style={{ background: 'var(--craly-white)', border: '1px solid var(--craly-border)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--craly-navy)' }}>Operational Control Center</h3>
              <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--craly-muted)' }}>
                Perform administrative review, audit platform user activity, and balance regional contractor supply vs business demand.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                <Link href="/admin/verification" className="btn btn--primary" style={{ textDecoration: 'none', textAlign: 'center' }}>
                  🛡️ Review Contractor Verification Queue ({data.pendingVerifications})
                </Link>
                <Link href="/admin/users" className="btn btn--secondary" style={{ textDecoration: 'none', textAlign: 'center' }}>
                  👥 Search & Manage Users
                </Link>
                <Link href="/admin/analytics" className="btn btn--ghost" style={{ textDecoration: 'none', textAlign: 'center' }}>
                  📈 View Marketplace Supply vs Demand Analytics
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
