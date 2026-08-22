'use client';

import { useEffect, useState } from 'react';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { apiGet } from '@/lib/api';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';

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

  return (
    <>
      <WorkspacePageHeader
        title="Platform Analytics"
        subtitle="Marketplace health, supply vs demand gap analysis, and conversion funnels."
      />
      {loading ? (
        <LoadingState label="Loading platform analytics…" />
      ) : !data ? (
        <EmptyState title="Failed to load analytics" subtitle="Could not retrieve platform metrics." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Funnel Metrics */}
          <div style={{ background: 'var(--craly-white)', border: '1px solid var(--craly-border)', borderRadius: '16px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: 'var(--craly-navy)' }}>Enquiry & Conversion Funnel</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '16px', background: 'var(--craly-off-white)', borderRadius: '12px', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--craly-muted)' }}>ENQUIRIES SENT</span>
                <strong style={{ display: 'block', fontSize: '24px', color: 'var(--craly-navy)', marginTop: '4px' }}>{data.enquiryFunnel.enquiriesSent}</strong>
              </div>
              <div style={{ padding: '16px', background: 'var(--craly-mint)', borderRadius: '12px', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--craly-teal-dark)' }}>ENQUIRIES ACCEPTED</span>
                <strong style={{ display: 'block', fontSize: '24px', color: 'var(--craly-teal-dark)', marginTop: '4px' }}>{data.enquiryFunnel.enquiriesAccepted}</strong>
              </div>
              <div style={{ padding: '16px', background: 'var(--craly-off-white)', borderRadius: '12px', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--craly-muted)' }}>MESSAGES EXCHANGED</span>
                <strong style={{ display: 'block', fontSize: '24px', color: 'var(--craly-navy)', marginTop: '4px' }}>{data.enquiryFunnel.messagesSent}</strong>
              </div>
              <div style={{ padding: '16px', background: 'var(--craly-mint)', borderRadius: '12px', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--craly-teal-dark)' }}>GOOGLE MEETS</span>
                <strong style={{ display: 'block', fontSize: '24px', color: 'var(--craly-teal-dark)', marginTop: '4px' }}>{data.enquiryFunnel.meetingsScheduled}</strong>
              </div>
            </div>
          </div>

          {/* Supply vs Demand Geographic Gap */}
          <div style={{ background: 'var(--craly-white)', border: '1px solid var(--craly-border)', borderRadius: '16px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: 'var(--craly-navy)' }}>Geographic Supply vs Demand Gap</h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--craly-muted)' }}>Locations with high business enquiry demand vs available verified contractors.</p>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
              <thead>
                <tr style={{ background: 'var(--craly-off-white)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px', color: 'var(--craly-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px' }}>Location</th>
                  <th style={{ padding: '10px 12px' }}>Contractor Supply</th>
                  <th style={{ padding: '10px 12px' }}>Business Demand</th>
                  <th style={{ padding: '10px 12px' }}>Market Gap</th>
                </tr>
              </thead>
              <tbody>
                {data.geographicGap.map((g, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--craly-border)' }}>
                    <td style={{ padding: '12px', fontWeight: 600, color: 'var(--craly-navy)' }}>{g.location}</td>
                    <td style={{ padding: '12px' }}>{g.supply_contractors} contractors</td>
                    <td style={{ padding: '12px' }}>{g.demand_enquiries} enquiries</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px',
                        background: g.gap_status === 'HIGH' ? '#fef2f2' : g.gap_status === 'MEDIUM' ? '#fffbe8' : 'var(--craly-mint)',
                        color: g.gap_status === 'HIGH' ? '#991b1b' : g.gap_status === 'MEDIUM' ? '#b45309' : 'var(--craly-teal-dark)'
                      }}>
                        {g.gap_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Supply vs Demand Category Gap */}
          <div style={{ background: 'var(--craly-white)', border: '1px solid var(--craly-border)', borderRadius: '16px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: 'var(--craly-navy)' }}>Category Supply & Demand</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
              <thead>
                <tr style={{ background: 'var(--craly-off-white)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px', color: 'var(--craly-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px' }}>Service Category</th>
                  <th style={{ padding: '10px 12px' }}>Active Contractors</th>
                  <th style={{ padding: '10px 12px' }}>Enquiries Received</th>
                </tr>
              </thead>
              <tbody>
                {data.categoryGap.map((cat, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--craly-border)' }}>
                    <td style={{ padding: '12px', fontWeight: 600, color: 'var(--craly-navy)' }}>{cat.category_name}</td>
                    <td style={{ padding: '12px' }}>{cat.supply_contractors} contractors</td>
                    <td style={{ padding: '12px' }}>{cat.demand_enquiries} enquiries</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
