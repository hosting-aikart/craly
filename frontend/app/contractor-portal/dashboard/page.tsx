'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getMyProfile, type MyProfile } from '@/lib/api/profile';
import { getDashboardStats, type ContractorDashboardStats } from '@/lib/api/contractorPortal';
import LoadingState from '@/components/ui/LoadingState';
import ListedBadge from '@/components/ui/ListedBadge';
import './contractor-dashboard.css';

export default function ContractorDashboardPage() {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [stats, setStats] = useState<ContractorDashboardStats>({
    opportunitiesCount: 0,
    activeApplicationsCount: 0,
    selectedApplicationsCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getMyProfile().then(({ data }) => setProfile(data)),
      getDashboardStats().then(({ data }) => setStats(data)),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !profile) {
    return <LoadingState label="Loading Dashboard…" />;
  }

  const p = profile as any;
  const companyName = p.company_name || 'Contractor';
  const verificationStatus = p.verification_status || 'pending';

  return (
    <div className="contractor-dashboard">
      {/* ── Welcome Banner ─────────────────────────────────────────────── */}
      <div className="contractor-dashboard__banner">
        <div className="contractor-dashboard__banner-info">
          <div className="contractor-dashboard__badge-row">
            <ListedBadge />
            <span className="contractor-dashboard__role-tag">Contractor Portal</span>
          </div>
          <h1 className="contractor-dashboard__title">Welcome back, {companyName}</h1>
          <p className="contractor-dashboard__subtitle">
            Browse published manpower opportunities and manage your submitted applications.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/contractor-portal/opportunities" className="contractor-dashboard__edit-btn">
            View Opportunities 🎯
          </Link>
          <Link
            href="/contractor-portal/profile"
            className="contractor-dashboard__edit-btn"
            style={{ background: 'rgba(255, 255, 255, 0.2)', color: '#fff' }}
          >
            Profile ✏️
          </Link>
        </div>
      </div>

      {/* ── Dashboard Metrics Row ─────────────────────────────────────── */}
      <div className="contractor-dashboard__metrics">
        <Link href="/contractor-portal/opportunities" className="contractor-dashboard__metric-card">
          <div className="contractor-dashboard__metric-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
            🎯
          </div>
          <div className="contractor-dashboard__metric-data">
            <span className="contractor-dashboard__metric-val">{stats.opportunitiesCount}</span>
            <span className="contractor-dashboard__metric-lbl">Open Opportunities</span>
          </div>
        </Link>

        <Link href="/contractor-portal/applications" className="contractor-dashboard__metric-card">
          <div className="contractor-dashboard__metric-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
            📥
          </div>
          <div className="contractor-dashboard__metric-data">
            <span className="contractor-dashboard__metric-val">{stats.activeApplicationsCount}</span>
            <span className="contractor-dashboard__metric-lbl">Active Applications</span>
          </div>
        </Link>

        <Link href="/contractor-portal/applications" className="contractor-dashboard__metric-card">
          <div className="contractor-dashboard__metric-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
            🏆
          </div>
          <div className="contractor-dashboard__metric-data">
            <span className="contractor-dashboard__metric-val">{stats.selectedApplicationsCount}</span>
            <span className="contractor-dashboard__metric-lbl">Selected / Won</span>
          </div>
        </Link>
      </div>

      {/* ── Company Summary Grid ────────────────────────────────────────── */}
      <div className="contractor-dashboard__grid">
        <div className="contractor-dashboard__card">
          <div className="contractor-dashboard__card-header">
            <span className="contractor-dashboard__card-icon">🏢</span>
            <h3>Company Profile Summary</h3>
          </div>
          <div className="contractor-dashboard__summary-list">
            <div className="contractor-dashboard__summary-item">
              <span>Company Name</span>
              <strong>{companyName}</strong>
            </div>
            <div className="contractor-dashboard__summary-item">
              <span>Contact Phone</span>
              <strong>{p.phone || 'Not specified'}</strong>
            </div>
            <div className="contractor-dashboard__summary-item">
              <span>Location</span>
              <strong>{[p.city, p.state].filter(Boolean).join(', ') || 'Not specified'}</strong>
            </div>
            <div className="contractor-dashboard__summary-item">
              <span>Workforce Size</span>
              <strong>{p.workforce_size ? `${p.workforce_size} Workers` : 'Not specified'}</strong>
            </div>
            <div className="contractor-dashboard__summary-item">
              <span>Experience</span>
              <strong>{p.years_experience ? `${p.years_experience} Years` : 'Not specified'}</strong>
            </div>
            <div className="contractor-dashboard__summary-item">
              <span>Availability</span>
              <strong className="contractor-dashboard__avail-tag">{p.availability || 'AVAILABLE'}</strong>
            </div>
          </div>
        </div>

        <div className="contractor-dashboard__card">
          <div className="contractor-dashboard__card-header">
            <span className="contractor-dashboard__card-icon">🛡️</span>
            <h3>Account Verification Status</h3>
          </div>
          <div className="contractor-dashboard__verification-box">
            <div className={`contractor-dashboard__status-pill contractor-dashboard__status-pill--${verificationStatus}`}>
              {verificationStatus.toUpperCase()}
            </div>
            <p className="contractor-dashboard__verification-desc">
              {verificationStatus === 'verified'
                ? 'Your contractor profile is verified by Craly Operations.'
                : 'Your profile is under standard review by Craly Operations. You can apply for manpower opportunities.'}
            </p>
            {p.verification_note && (
              <div className="contractor-dashboard__note">
                <strong>Note:</strong> {p.verification_note}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
