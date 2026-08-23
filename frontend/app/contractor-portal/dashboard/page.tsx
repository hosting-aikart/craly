'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getMyProfile, type MyProfile } from '@/lib/api/profile';
import { getDashboardStats, getOpportunities, type ContractorDashboardStats, type Opportunity } from '@/lib/api/contractorPortal';
import LoadingState from '@/components/ui/LoadingState';
import ListedBadge from '@/components/ui/ListedBadge';
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
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !profile) {
    return <LoadingState label="Loading Dashboard…" />;
  }

  const p = profile as any;
  const companyName = p.company_name || 'Contractor';
  const verificationStatus = p.verification_status || 'pending';
  const topPersonalized = opportunities.slice(0, 3);

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
            Browse personalized manpower opportunities matched to your workforce capacity and experience.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/contractor-portal/opportunities" className="contractor-dashboard__edit-btn">
            View All Opportunities 🎯
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
            <span className="contractor-dashboard__metric-lbl">Matched Opportunities</span>
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

      {/* ── Personalized Opportunities Section ──────────────────────── */}
      {topPersonalized.length > 0 && (
        <section className="contractor-dashboard__opps-section">
          <div className="contractor-dashboard__opps-header">
            <div className="contractor-dashboard__opps-header-title">
              <span style={{ fontSize: '20px' }}>🎯</span>
              <h2>Personalized Opportunities For You</h2>
              <span className="contractor-dashboard__opps-badge">AI Matched</span>
            </div>
            <Link href="/contractor-portal/opportunities" className="contractor-dashboard__view-all-link">
              View all ({opportunities.length}) →
            </Link>
          </div>

          <div className="contractor-dashboard__opps-grid">
            {topPersonalized.map((op) => {
              const matchScore = op.match_score || 70;
              const matchPillClass =
                matchScore >= 75
                  ? 'contractor-match-pill--high'
                  : matchScore >= 55
                  ? 'contractor-match-pill--medium'
                  : 'contractor-match-pill--low';

              return (
                <div key={op.id} className="contractor-opp-card">
                  <div>
                    <div className="contractor-opp-card__top">
                      <div>
                        <h3 className="contractor-opp-card__title">{op.title}</h3>
                        <div className="contractor-opp-card__meta">
                          {op.industry && (
                            <span className="contractor-opp-card__tag contractor-opp-card__tag--ind">
                              {op.industry}
                            </span>
                          )}
                          <span className="contractor-opp-card__tag">📍 {op.location}</span>
                        </div>
                      </div>

                      <div className={`contractor-match-pill ${matchPillClass}`}>
                        {matchScore >= 75 ? '🎯' : '✨'} {matchScore}% Match
                      </div>
                    </div>

                    {op.match_reasons && op.match_reasons.length > 0 && (
                      <div className="contractor-opp-card__reasons" style={{ marginTop: '10px' }}>
                        {op.match_reasons.map((reason, idx) => (
                          <span key={idx} className="contractor-opp-reason-tag">
                            ✓ {reason}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="contractor-opp-card__specs">
                    <div className="contractor-opp-spec">
                      <span className="contractor-opp-spec-lbl">Workers</span>
                      <strong className="contractor-opp-spec-val">{op.workers_required}</strong>
                    </div>
                    <div className="contractor-opp-spec">
                      <span className="contractor-opp-spec-lbl">Start</span>
                      <strong className="contractor-opp-spec-val">
                        {new Date(op.start_date).toLocaleDateString()}
                      </strong>
                    </div>
                    <div className="contractor-opp-spec">
                      <span className="contractor-opp-spec-lbl">Duration</span>
                      <strong className="contractor-opp-spec-val">{op.duration}</strong>
                    </div>
                  </div>

                  <div className="contractor-opp-card__bottom">
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      {op.has_applied ? (
                        <span style={{ color: '#047857', fontWeight: 600 }}>✓ Applied</span>
                      ) : (
                        `Posted ${new Date(op.published_at || op.created_at).toLocaleDateString()}`
                      )}
                    </span>
                    <Link
                      href={`/contractor-portal/opportunities/${op.id}`}
                      className="contractor-opp-card__btn"
                    >
                      {op.has_applied ? 'View Application' : 'Apply Now →'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

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
