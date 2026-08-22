'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getStaffDashboardStats, type StaffDashboardStats } from '@/lib/api/staff';
import LoadingState from '@/components/ui/LoadingState';
import './staff-dashboard.css';

export default function StaffDashboardPage() {
  const [stats, setStats] = useState<StaffDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStaffDashboardStats()
      .then(({ data }) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats) {
    return <LoadingState label="Loading Staff Dashboard…" />;
  }

  return (
    <div className="staff-dashboard">
      {/* Welcome Banner */}
      <div className="staff-dashboard__banner">
        <div>
          <span className="staff-dashboard__role-badge">Craly Internal Operations</span>
          <h1 className="staff-dashboard__title">Staff Operations Dashboard</h1>
          <p className="staff-dashboard__subtitle">
            Manage contractor onboarding, track manufacturer selections, and coordinate engagements.
          </p>
        </div>
        <div className="staff-dashboard__actions">
          <Link href="/staff/contractors/new" className="btn-primary">
            + Add Contractor
          </Link>
          <Link href="/staff/contractors" className="btn-secondary">
            View Contractors
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="staff-dashboard__metrics">
        <div className="staff-metric-card">
          <div className="staff-metric-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
            🏢
          </div>
          <div className="staff-metric-info">
            <span className="staff-metric-val">{stats.totalContractors}</span>
            <span className="staff-metric-lbl">Total Contractors</span>
          </div>
        </div>

        <div className="staff-metric-card">
          <div className="staff-metric-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
            ✨
          </div>
          <div className="staff-metric-info">
            <span className="staff-metric-val">{stats.recentlyAddedCount}</span>
            <span className="staff-metric-lbl">Added Last 30 Days</span>
          </div>
        </div>

        <div className="staff-metric-card">
          <div className="staff-metric-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
            🤝
          </div>
          <div className="staff-metric-info">
            <span className="staff-metric-val">{stats.pendingEngagementsCount}</span>
            <span className="staff-metric-lbl">Pending Selections</span>
          </div>
        </div>

        <div className="staff-metric-card">
          <div className="staff-metric-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
            🔔
          </div>
          <div className="staff-metric-info">
            <span className="staff-metric-val">{stats.unreadNotificationsCount}</span>
            <span className="staff-metric-lbl">Unread Notifications</span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="staff-dashboard__grid">
        {/* Recently Added Contractors */}
        <div className="staff-card">
          <div className="staff-card__header">
            <h3>Recently Added Contractors</h3>
            <Link href="/staff/contractors" className="staff-card__link">
              View All →
            </Link>
          </div>
          {stats.recentContractors.length === 0 ? (
            <p className="staff-empty-text">No contractors added yet.</p>
          ) : (
            <div className="staff-recent-list">
              {stats.recentContractors.map((c) => (
                <Link key={c.id} href={`/staff/contractors/${c.id}`} className="staff-recent-item">
                  <div className="staff-recent-info">
                    <strong>{c.company_name}</strong>
                    <span>📍 {[c.city, c.state].filter(Boolean).join(', ') || 'No location'}</span>
                  </div>
                  <div className="staff-recent-meta">
                    <span className="staff-avail-pill">{c.availability}</span>
                    <span className="staff-date">{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Notifications */}
        <div className="staff-card">
          <div className="staff-card__header">
            <h3>Recent System Notifications</h3>
            <Link href="/staff/notifications" className="staff-card__link">
              View All →
            </Link>
          </div>
          {stats.recentNotifications.length === 0 ? (
            <p className="staff-empty-text">No recent notifications.</p>
          ) : (
            <div className="staff-notification-list">
              {stats.recentNotifications.map((n) => (
                <div key={n.id} className="staff-notification-item">
                  <div className="staff-notification-icon">🔔</div>
                  <div className="staff-notification-body">
                    <strong>{n.title}</strong>
                    <p>{n.message}</p>
                    <span className="staff-notification-time">
                      {new Date(n.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
