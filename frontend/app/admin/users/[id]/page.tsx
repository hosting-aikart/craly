'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { apiGet } from '@/lib/api';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/util/date';
import {
  IconArrowLeft,
  IconShield,
  IconBuilding,
  IconUsers,
  IconMail,
  IconClock,
} from '@/components/ui/Icons';
import './admin-user-detail.css';

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

  const getRoleBadge = (role: string) => {
    if (role === 'admin') {
      return <span className="admin-detail-badge admin-detail-badge--admin">Platform Admin</span>;
    }
    if (role === 'contractor') {
      return <span className="admin-detail-badge admin-detail-badge--contractor">Contractor Account</span>;
    }
    return <span className="admin-detail-badge admin-detail-badge--business">Manufacturer Account</span>;
  };

  return (
    <div className="admin-user-detail-page">
      <WorkspacePageHeader
        title="User Account Overview"
        subtitle={user ? `Inspecting account profile for ${user.email}` : 'User Detail'}
      />

      <Link href="/admin/users" className="admin-detail-back">
        <IconArrowLeft size={14} /> Back to Users Directory
      </Link>

      {loading ? (
        <LoadingState label="Loading user details…" />
      ) : !user ? (
        <EmptyState title="User not found" subtitle="The requested account does not exist." />
      ) : (
        <>
          {/* Hero Profile Card */}
          <div className="admin-user-hero">
            <div className="admin-user-hero-left">
              <div className="admin-user-large-avatar">
                {user.email.charAt(0).toUpperCase()}
              </div>
              <div className="admin-user-hero-info">
                <h2 className="admin-user-hero-email">{user.email}</h2>
                <span className="admin-user-hero-company">
                  {user.business_company || user.contractor_company || 'Independent Profile'}
                  {user.industry ? ` • ${user.industry}` : ''}
                </span>
              </div>
            </div>

            <div className="admin-user-hero-badges">
              {getRoleBadge(user.role)}
              {user.verification_status && (
                <span className="admin-detail-badge admin-detail-badge--contractor">
                  <IconShield size={11} style={{ marginRight: 4 }} />
                  {user.verification_status.toUpperCase()}
                </span>
              )}
            </div>
          </div>

          {/* Details & Audit History Grid */}
          <div className="admin-user-detail-grid">
            {/* Account Metadata Card */}
            <div className="admin-user-card">
              <div className="admin-user-card__header">
                <h3 className="admin-user-card__title">Account Metadata</h3>
              </div>

              <div className="admin-meta-list">
                <div className="admin-meta-item">
                  <span className="admin-meta-label">User Identifier</span>
                  <span className="admin-meta-id">{user.id}</span>
                </div>

                <div className="admin-meta-item">
                  <span className="admin-meta-label">Email Address</span>
                  <span className="admin-meta-value">{user.email}</span>
                </div>

                <div className="admin-meta-item">
                  <span className="admin-meta-label">Registered Company</span>
                  <span className="admin-meta-value">
                    {user.business_company || user.contractor_company || 'None recorded'}
                  </span>
                </div>

                {user.industry && (
                  <div className="admin-meta-item">
                    <span className="admin-meta-label">Primary Industry</span>
                    <span className="admin-meta-value">{user.industry}</span>
                  </div>
                )}

                <div className="admin-meta-item">
                  <span className="admin-meta-label">Joined Timestamp</span>
                  <span className="admin-meta-value">{formatDate(user.created_at)}</span>
                </div>

                {user.updated_at && (
                  <div className="admin-meta-item">
                    <span className="admin-meta-label">Last Activity / Update</span>
                    <span className="admin-meta-value">{formatDate(user.updated_at)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Audit Trail Card */}
            <div className="admin-user-card">
              <div className="admin-user-card__header">
                <h3 className="admin-user-card__title">Administrative Audit Trail</h3>
              </div>

              {user.auditHistory.length === 0 ? (
                <EmptyState
                  icon={<IconClock size={28} />}
                  title="No admin actions recorded"
                  subtitle="No status changes or administrative modifications have been performed on this user account."
                />
              ) : (
                <ul className="admin-audit-list">
                  {user.auditHistory.map((h) => (
                    <li key={h.id} className="admin-audit-item">
                      <div>
                        <strong className="admin-audit-action">{h.action}</strong>
                        <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                          {h.admin_email ? `By ${h.admin_email}` : 'System Event'}
                        </span>
                      </div>
                      <span className="admin-audit-time">{formatDate(h.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
