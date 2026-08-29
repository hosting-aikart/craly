'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { getBusinessDashboardStats, type BusinessDashboardStats } from '@/lib/api/businessPortal';
import LoadingState from '@/components/ui/LoadingState';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { IconSearch } from '@/components/ui/Icons';
import '@/components/AuthForm.css';
import '../../dashboard.css';

export default function BusinessDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<BusinessDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getBusinessDashboardStats()
      .then(({ data }) => setStats(data))
      .catch((err) => setError(err.message || 'Failed to load dashboard metrics'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <WorkspacePageHeader
        title="Manufacturer Dashboard"
        subtitle="Manage workforce requirements and review contractor applications."
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <Button
          variant="primary"
          onClick={() => router.push('/business/requirements/new')}
          style={{ padding: '10px 20px', fontSize: '15px', fontWeight: 600 }}
        >
          + Create Requirement
        </Button>
      </div>

      {loading ? (
        <LoadingState label="Loading Dashboard Metrics…" />
      ) : error ? (
        <div style={{ color: '#ef4444', padding: '16px', background: '#fef2f2', borderRadius: '8px' }}>
          {error}
        </div>
      ) : (
        <>
          {/* Summary Metric Cards */}
          <div
            className="dashboard-summary-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '28px',
            }}
          >
            <div className="dashboard__card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--craly-muted)', letterSpacing: '0.5px' }}>
                  ACTIVE REQUIREMENTS
                </span>
                <strong style={{ fontSize: '28px', color: 'var(--craly-navy)', fontFamily: 'var(--font-heading)', lineHeight: 1.1 }}>
                  {stats?.activeRequirements ?? 0}
                </strong>
              </div>
              <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
                <Link href="/business/requirements" className="dashboard-metric-btn">
                  View Requirements →
                </Link>
              </div>
            </div>

            <div className="dashboard__card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--craly-muted)', letterSpacing: '0.5px' }}>
                  APPLICATIONS RECEIVED
                </span>
                <strong style={{ fontSize: '28px', color: 'var(--craly-navy)', fontFamily: 'var(--font-heading)', lineHeight: 1.1 }}>
                  {stats?.applicationsReceived ?? 0}
                </strong>
              </div>
              <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
                <Link href="/business/applications" className="dashboard-metric-btn">
                  Review Applications →
                </Link>
              </div>
            </div>

            <div className="dashboard__card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--craly-muted)', letterSpacing: '0.5px' }}>
                  SELECTED CONTRACTORS
                </span>
                <strong style={{ fontSize: '28px', color: 'var(--craly-navy)', fontFamily: 'var(--font-heading)', lineHeight: 1.1 }}>
                  {stats?.selectedContractors ?? 0}
                </strong>
              </div>
              <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
                <span className="dashboard-metric-tag">
                  ● Craly Staff Coordinated
                </span>
              </div>
            </div>

            <div className="dashboard__card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--craly-muted)', letterSpacing: '0.5px' }}>
                  QUICK ACTIONS
                </span>
              </div>
              <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
                <Link href="/business/applications" className="dashboard-metric-btn">
                  <IconSearch size={13} /> Compare Proposals
                </Link>
              </div>
            </div>
          </div>

          {/* Recent Activity Card */}
          <div className="dashboard__card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>Recent Activity</h3>
              <Link href="/business/requirements" style={{ fontSize: '13px', color: 'var(--craly-teal)', textDecoration: 'none', fontWeight: 600 }}>
                All Requirements →
              </Link>
            </div>

            {(!stats?.recentActivity || stats.recentActivity.length === 0) ? (
              <EmptyState
                title="No recent requirements yet"
                subtitle="Click '+ Create Requirement' to publish your first manpower request."
              />
            ) : (
              <ul className="dashboard__list" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {stats.recentActivity.map((item) => (
                  <li
                    key={item.id}
                    className="dashboard-activity-item"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      transition: 'all 0.2s ease',
                      background: 'transparent',
                    }}
                  >
                    <div>
                      <strong style={{ display: 'block', color: 'var(--craly-navy)', fontSize: '15px' }}>
                        {item.title}
                      </strong>
                      <span style={{ fontSize: '12px', color: 'var(--craly-muted)' }}>
                        Created on {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        className={`dashboard-status-pill dashboard-status-pill--${item.status.toLowerCase()}`}
                      >
                        ● {item.status.replace('_', ' ')}
                      </span>
                      <Link
                        href={`/business/requirements/${item.id}`}
                        className="dashboard-view-btn"
                      >
                        View →
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </>
  );
}
