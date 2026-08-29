'use client';

import { useEffect, useState } from 'react';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { apiGet } from '@/lib/api';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import {
  IconTrending,
  IconMessage,
  IconCheck,
  IconCalendar,
  IconMapPin,
  IconBuilding,
} from '@/components/ui/Icons';
import './admin-analytics.css';

interface AnalyticsData {
  userGrowth: { date: string; businesses: number; contractors: number }[];
  enquiryFunnel: {
    enquiriesSent: number;
    enquiriesAccepted: number;
    messagesSent: number;
    meetingsScheduled: number;
  };
  verificationDistribution: { status: string; count: number }[];
  geographicGap: { location: string; supply_contractors: number; demand_enquiries: number; gap_status: string }[];
  categoryGap: { category_name: string; supply_contractors: number; demand_enquiries: number }[];
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ data: AnalyticsData }>('/admin/analytics')
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getGapBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'HIGH') {
      return <span className="admin-gap-pill admin-gap-pill--high">High Demand Gap</span>;
    }
    if (s === 'MEDIUM') {
      return <span className="admin-gap-pill admin-gap-pill--medium">Moderate Gap</span>;
    }
    return <span className="admin-gap-pill admin-gap-pill--low">Optimal Supply</span>;
  };

  return (
    <div className="admin-analytics-page">
      <WorkspacePageHeader
        title="Platform Analytics"
        subtitle="Marketplace health, supply vs demand gap analysis, and conversion funnels."
      />

      {/* Analytics Governance Banner */}
      <div className="admin-analytics__banner">
        <div>
          <span className="admin-analytics__role-badge">Marketplace Intelligence</span>
          <h1 className="admin-analytics__title">Platform Supply & Demand Analytics</h1>
          <p className="admin-analytics__subtitle">
            Track real-time conversion funnels from manufacturer requirement submission through contractor confirmation and meeting handoffs.
          </p>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading platform analytics…" />
      ) : !data ? (
        <EmptyState title="Failed to load analytics" subtitle="Could not retrieve platform metrics." />
      ) : (
        <>
          {/* Funnel Metrics Card */}
          <div className="admin-analytics-card">
            <div className="admin-analytics-card__header">
              <h2 className="admin-analytics-card__title">Enquiry & Conversion Funnel</h2>
              <p className="admin-analytics-card__desc">
                Progression from initial business requirements to active discussions and scheduled calls.
              </p>
            </div>

            <div className="admin-funnel-grid">
              <div className="admin-funnel-card">
                <div className="admin-funnel-top">
                  <span className="admin-funnel-lbl">Enquiries Sent</span>
                  <div className="admin-funnel-icon">
                    <IconMessage size={16} />
                  </div>
                </div>
                <strong className="admin-funnel-val">{data.enquiryFunnel.enquiriesSent}</strong>
                <span className="admin-funnel-sub">Total requirements submitted</span>
              </div>

              <div className="admin-funnel-card admin-funnel-card--highlight">
                <div className="admin-funnel-top">
                  <span className="admin-funnel-lbl">Enquiries Accepted</span>
                  <div className="admin-funnel-icon">
                    <IconCheck size={16} />
                  </div>
                </div>
                <strong className="admin-funnel-val">{data.enquiryFunnel.enquiriesAccepted}</strong>
                <span className="admin-funnel-sub">Contractor match handoffs</span>
              </div>

              <div className="admin-funnel-card">
                <div className="admin-funnel-top">
                  <span className="admin-funnel-lbl">Messages Exchanged</span>
                  <div className="admin-funnel-icon">
                    <IconMessage size={16} />
                  </div>
                </div>
                <strong className="admin-funnel-val">{data.enquiryFunnel.messagesSent}</strong>
                <span className="admin-funnel-sub">Direct thread communications</span>
              </div>

              <div className="admin-funnel-card admin-funnel-card--highlight">
                <div className="admin-funnel-top">
                  <span className="admin-funnel-lbl">Google Meets</span>
                  <div className="admin-funnel-icon">
                    <IconCalendar size={16} />
                  </div>
                </div>
                <strong className="admin-funnel-val">{data.enquiryFunnel.meetingsScheduled}</strong>
                <span className="admin-funnel-sub">Scheduled video discussions</span>
              </div>
            </div>
          </div>

          {/* Geographic Supply vs Demand Gap */}
          <div className="admin-analytics-card">
            <div className="admin-analytics-card__header">
              <h2 className="admin-analytics-card__title">Geographic Supply vs Demand Gap</h2>
              <p className="admin-analytics-card__desc">
                Regional comparison between business requirement enquiries and verified contractor workforce availability.
              </p>
            </div>

            <div className="admin-analytics-table-wrap">
              <table className="admin-analytics-table">
                <colgroup>
                  <col style={{ width: '32%' }} />
                  <col style={{ width: '24%' }} />
                  <col style={{ width: '24%' }} />
                  <col style={{ width: '20%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Location</th>
                    <th>Contractor Supply</th>
                    <th>Business Demand</th>
                    <th>Market Gap Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.geographicGap.map((g, idx) => (
                    <tr key={idx}>
                      <td>
                        <span className="admin-cell-main" style={{ display: 'inline-flex', alignItems: 'center' }}>
                          <IconMapPin size={13} style={{ marginRight: 5, color: 'var(--craly-teal, #0f8b82)' }} />
                          {g.location}
                        </span>
                      </td>
                      <td>
                        <span className="admin-cell-sub">{g.supply_contractors} verified contractors</span>
                      </td>
                      <td>
                        <span className="admin-cell-sub">{g.demand_enquiries} active enquiries</span>
                      </td>
                      <td>{getGapBadge(g.gap_status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Category Supply vs Demand */}
          <div className="admin-analytics-card">
            <div className="admin-analytics-card__header">
              <h2 className="admin-analytics-card__title">Category Supply & Demand</h2>
              <p className="admin-analytics-card__desc">
                Industry and trade domain distribution across verified contractors and platform requirements.
              </p>
            </div>

            <div className="admin-analytics-table-wrap">
              <table className="admin-analytics-table">
                <colgroup>
                  <col style={{ width: '40%' }} />
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '30%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Service Category / Trade</th>
                    <th>Active Contractors</th>
                    <th>Enquiries Received</th>
                  </tr>
                </thead>
                <tbody>
                  {data.categoryGap.map((cat, idx) => (
                    <tr key={idx}>
                      <td>
                        <span className="admin-cell-main" style={{ display: 'inline-flex', alignItems: 'center' }}>
                          <IconBuilding size={13} style={{ marginRight: 5, color: 'var(--craly-teal, #0f8b82)' }} />
                          {cat.category_name}
                        </span>
                      </td>
                      <td>
                        <span className="admin-cell-sub">{cat.supply_contractors} contractors</span>
                      </td>
                      <td>
                        <span className="admin-cell-sub">{cat.demand_enquiries} enquiries</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
