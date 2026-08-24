'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getMyProfile, type MyProfile, type ContractorProfile } from '@/lib/api/profile';
import { getDashboardStats, getOpportunities, type ContractorDashboardStats, type Opportunity } from '@/lib/api/contractorPortal';
import { computeProfileCompletion } from '@/lib/util/contractorProfileCompletion';
import LoadingState from '@/components/ui/LoadingState';
import './contractor-dashboard.css';

export default function ContractorDashboardPage() {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
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
      getOpportunities().then(({ data }) => setOpportunities(data)),
    ])
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !profile) {
    return <LoadingState label="Loading Dashboard…" />;
  }

  const p = profile as ContractorProfile;
  const companyName = p.company_name || 'Contractor';
  const firstName = companyName.split(' ')[0] || 'Contractor';
  const verificationStatus = p.verification_status || 'pending';
  const isVerified = verificationStatus === 'verified';
  const { percent: profileScore, items: checklist } = computeProfileCompletion(p);

  return (
    <div className="contractor-dashboard">
      {/* Hero Banner */}
      <div className="contractor-dashboard__banner">
        <div className="contractor-dashboard__banner-info">
          <h1 className="contractor-dashboard__title">Welcome back, {firstName}.</h1>
          <p className="contractor-dashboard__subtitle">
            Keep your verified profile and workforce capacity current to improve matching with industrial requirements.
          </p>
        </div>
        <div className="contractor-dashboard__banner-actions">
          <Link href="/contractor-portal/opportunities" className="contractor-btn-primary">
            View Opportunities
          </Link>
          <Link href="/contractor-portal/profile?tab=verification" className="contractor-btn-secondary">
            Verification Status
          </Link>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="contractor-dashboard__metrics">
        <div className="contractor-metric-card">
          <div className="contractor-metric-body">
            <span className="contractor-metric-lbl">Profile Completion</span>
            <div className="contractor-metric-val">{profileScore}%</div>
            <span className="contractor-metric-sub">{profileScore === 100 ? '100% Complete' : `${100 - profileScore}% remaining`}</span>
          </div>
          <div className="contractor-metric-icon-box contractor-metric-icon-box--green">
            📋
          </div>
        </div>

        <div className="contractor-metric-card">
          <div className="contractor-metric-body">
            <span className="contractor-metric-lbl">Verification</span>
            <div className="contractor-metric-val">{verificationStatus.toUpperCase()}</div>
            <span className="contractor-metric-sub">
              {verificationStatus === 'verified' ? (p.last_verified_at ? `Verified ${new Date(p.last_verified_at).toLocaleDateString()}` : 'Verified') : 'Under Review'}
            </span>
          </div>
          <div className="contractor-metric-icon-box contractor-metric-icon-box--emerald">
            🛡️
          </div>
        </div>

        <Link href="/contractor-portal/opportunities" className="contractor-metric-card contractor-metric-card--link">
          <div className="contractor-metric-body">
            <span className="contractor-metric-lbl">Matching Opportunities</span>
            <div className="contractor-metric-val">{stats.opportunitiesCount}</div>
            <span className="contractor-metric-sub">Open matching</span>
          </div>
          <div className="contractor-metric-icon-box contractor-metric-icon-box--mint">
            🎯
          </div>
        </Link>

        <Link href="/contractor-portal/applications" className="contractor-metric-card contractor-metric-card--link">
          <div className="contractor-metric-body">
            <span className="contractor-metric-lbl">Active Applications</span>
            <div className="contractor-metric-val">{stats.activeApplicationsCount}</div>
            <span className="contractor-metric-sub">Submitted & Under Review</span>
          </div>
          <div className="contractor-metric-icon-box contractor-metric-icon-box--amber">
            📥
          </div>
        </Link>
      </div>

      {/* 2 Column Main Grid */}
      <div className="contractor-dashboard__grid">
        {/* Left Card: Profile Readiness */}
        <div className="contractor-card">
          <div className="contractor-card__header">
            <div>
              <h3>Profile readiness</h3>
              <p className="contractor-card__subtext">Phase 01 profile quality and verification checklist.</p>
            </div>
            <span className="contractor-badge-pill contractor-badge-pill--green">{profileScore}% complete</span>
          </div>

          <div className="contractor-progress-bar-wrap">
            <div className="contractor-progress-bar-fill" style={{ width: `${profileScore}%` }} />
          </div>

          <div className="contractor-checklist">
            <div className="contractor-checklist-item">
              <div className="contractor-chk-icon">{isVerified ? '✓' : '!'}</div>
              <div className="contractor-chk-info">
                <strong>Business identity & KYC</strong>
                <span>{verificationStatus === 'verified' ? 'Verified' : verificationStatus === 'rejected' ? 'Rejected — see Documents' : 'Under review'}</span>
              </div>
              <span className={isVerified ? 'contractor-tag-complete' : 'contractor-tag-missing'}>
                {isVerified ? 'Complete' : 'Pending'}
              </span>
            </div>

            {checklist.map((item) => (
              <div className="contractor-checklist-item" key={item.label}>
                <div className="contractor-chk-icon">{item.complete ? '✓' : '!'}</div>
                <div className="contractor-chk-info">
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </div>
                <span className={item.complete ? 'contractor-tag-complete' : 'contractor-tag-missing'}>
                  {item.complete ? 'Complete' : 'Missing'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Card: Trust Profile */}
        <div className="contractor-card">
          <div className="contractor-card__header">
            <div>
              <h3>Trust profile</h3>
              <p className="contractor-card__subtext">What a business user sees during discovery.</p>
            </div>
          </div>

          <div className="contractor-trust-header">
            <div className="contractor-trust-score-ring">
              <span>{profileScore}</span>
            </div>
            <div className="contractor-trust-info">
              <h4>Craly Trust Snapshot</h4>
              <div className="contractor-trust-badges">
                <span className="contractor-trust-tag">{isVerified ? '✓' : '○'} Identity & Business Verified</span>
              </div>
              <span className="contractor-trust-meta">
                {isVerified
                  ? `Verified ${p.last_verified_at ? new Date(p.last_verified_at).toLocaleDateString() : ''}`
                  : `Verification status: ${verificationStatus.replace('_', ' ')}`}
                {' • '}
                Profile updated {p.updated_at ? new Date(p.updated_at).toLocaleDateString() : '—'}
              </span>
            </div>
          </div>

          <div className="contractor-trust-stats-list">
            <div className="contractor-trust-stat-row">
              <span>Total workforce</span>
              <strong>{p.workforce_size ?? 0} Workers</strong>
            </div>
            <div className="contractor-trust-stat-row">
              <span>Declared skills</span>
              <strong>{p.skills?.length || 0}</strong>
            </div>
            <div className="contractor-trust-stat-row">
              <span>Operating location</span>
              <strong>{[p.city, p.state].filter(Boolean).join(', ') || 'Not declared'}</strong>
            </div>
            <div className="contractor-trust-stat-row">
              <span>Active applications</span>
              <strong>{stats.activeApplicationsCount} Active</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
