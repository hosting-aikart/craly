'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { apiGet } from '@/lib/api';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/util/date';
import {
  IconUsers,
  IconShield,
  IconAlertTriangle,
  IconMessage,
  IconArrowRight,
  IconTrending,
} from '@/components/ui/Icons';
import './admin-dashboard.css';

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
    <div className="admin-dashboard-container">
      <WorkspacePageHeader
        title="Admin Control Center"
        subtitle="Operational platform metrics, contractor verification queue, and system audit trail."
      />

      {/* Welcome Banner */}
      <div className="admin-dashboard__banner">
        <div>
          <span className="admin-dashboard__role-badge">Craly Platform Governance</span>
          <h1 className="admin-dashboard__title">Master Control Center</h1>
          <p className="admin-dashboard__subtitle">
            Oversee contractor verification lifecycle, monitor engagement conversations, and review audit activity.
          </p>
        </div>
        <div className="admin-dashboard__actions">
          <Link href="/admin/verification" className="admin-btn-primary">
            <IconShield size={15} style={{ marginRight: 6 }} /> Review KYC Queue
          </Link>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading admin dashboard…" />
      ) : !data ? (
        <EmptyState title="Failed to load dashboard data" subtitle="Please check admin permissions." />
      ) : (
        <>
          {/* Metrics Grid */}
          <div className="admin-metrics-grid">
            <div className="admin-metric-card">
              <div className="admin-metric-top">
                <span className="admin-metric-lbl">Total Users</span>
                <div className="admin-metric-icon admin-metric-icon--teal">
                  <IconUsers size={18} />
                </div>
              </div>
              <strong className="admin-metric-val">{data.totalUsers}</strong>
              <span className="admin-metric-sub">
                {data.totalBusinesses} Businesses • {data.totalContractors} Contractors
              </span>
            </div>

            <div className="admin-metric-card">
              <div className="admin-metric-top">
                <span className="admin-metric-lbl">Verified Contractors</span>
                <div className="admin-metric-icon admin-metric-icon--teal">
                  <IconShield size={18} />
                </div>
              </div>
              <strong className="admin-metric-val">{data.verifiedContractors}</strong>
              <span className="admin-metric-sub">
                Out of {data.totalContractors} total registered
              </span>
            </div>

            <div className={`admin-metric-card ${data.pendingVerifications > 0 ? 'admin-metric-card--alert' : ''}`}>
              <div className="admin-metric-top">
                <span className="admin-metric-lbl">Pending KYC Review</span>
                <div className="admin-metric-icon admin-metric-icon--amber">
                  <IconAlertTriangle size={18} />
                </div>
              </div>
              <strong className="admin-metric-val" style={{ color: data.pendingVerifications > 0 ? '#d97706' : 'var(--craly-navy)' }}>
                {data.pendingVerifications}
              </strong>
              <Link href="/admin/verification" className="admin-metric-link">
                Review Queue <IconArrowRight size={12} style={{ marginLeft: 3 }} />
              </Link>
            </div>

            <div className="admin-metric-card">
              <div className="admin-metric-top">
                <span className="admin-metric-lbl">Enquiries & Chats</span>
                <div className="admin-metric-icon admin-metric-icon--teal">
                  <IconMessage size={18} />
                </div>
              </div>
              <strong className="admin-metric-val">{data.totalEnquiries}</strong>
              <span className="admin-metric-sub">
                {data.activeConversations} Active conversations
              </span>
            </div>
          </div>

          {/* Activity Trail & Operational Actions */}
          <div className="admin-main-grid">
            <div className="admin-card">
              <div className="admin-card__header">
                <h3>Recent System Audit Logs</h3>
                <Link href="/admin/audit-logs" className="admin-card__link">
                  View All Logs <IconArrowRight size={12} style={{ marginLeft: 3 }} />
                </Link>
              </div>

              {data.recentActivity.length === 0 ? (
                <EmptyState title="No audit logs recorded yet" subtitle="Administrative actions will appear here." />
              ) : (
                <ul className="admin-activity-list">
                  {data.recentActivity.map((act) => (
                    <li key={act.id} className="admin-activity-item">
                      <div className="admin-activity-info">
                        <strong className="admin-activity-action">{act.action}</strong>
                        <span className="admin-activity-meta">By {act.admin_email}</span>
                      </div>
                      <span className="admin-activity-time">{formatDate(act.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="admin-card">
              <div className="admin-card__header">
                <h3>Operational Control Center</h3>
              </div>
              <p className="admin-card-desc">
                Execute platform oversight, verify contractor compliance, and inspect marketplace metrics.
              </p>

              <div className="admin-action-list">
                <Link href="/admin/verification" className="admin-action-btn admin-action-btn--primary">
                  <span>Review Contractor KYC Queue ({data.pendingVerifications})</span>
                  <IconArrowRight size={14} />
                </Link>
                <Link href="/admin/users" className="admin-action-btn admin-action-btn--secondary">
                  <span>Manage Platform Users</span>
                  <IconArrowRight size={14} />
                </Link>
                <Link href="/admin/analytics" className="admin-action-btn admin-action-btn--ghost">
                  <span>Marketplace Supply vs Demand</span>
                  <IconTrending size={14} />
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
