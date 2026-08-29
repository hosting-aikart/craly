'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getMyProfile, type MyProfile, type ContractorProfile } from '@/lib/api/profile';
import {
  getDashboardStats,
  getOpportunities,
  getMyApplications,
  type ContractorDashboardStats,
  type Opportunity,
  type ApplicationItem,
} from '@/lib/api/contractorPortal';
import { computeProfileCompletion } from '@/lib/util/contractorProfileCompletion';
import LoadingState from '@/components/ui/LoadingState';
import {
  IconClipboard,
  IconShield,
  IconTarget,
  IconApplications,
  IconCheck,
  IconAlertCircle,
  IconUsers,
  IconTools,
  IconMapPin,
  IconArrowRight,
  IconClock,
  IconSearch,
  IconSettings,
} from '@/components/ui/Icons';
import './contractor-dashboard.css';

export default function ContractorDashboardPage() {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [stats, setStats] = useState<ContractorDashboardStats>({
    opportunitiesCount: 0,
    activeApplicationsCount: 0,
    selectedApplicationsCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    Promise.allSettled([
      getMyProfile(),
      getDashboardStats(),
      getOpportunities(),
      getMyApplications(),
    ]).then(([profileRes, statsRes, oppsRes, appsRes]) => {
      if (!isMounted) return;

      if (profileRes.status === 'fulfilled' && profileRes.value?.data) {
        setProfile(profileRes.value.data);
      }
      if (statsRes.status === 'fulfilled' && statsRes.value?.data) {
        setStats(statsRes.value.data);
      }
      if (oppsRes.status === 'fulfilled' && oppsRes.value?.data) {
        setOpportunities(Array.isArray(oppsRes.value.data) ? oppsRes.value.data : []);
      }
      if (appsRes.status === 'fulfilled' && appsRes.value?.data) {
        setApplications(Array.isArray(appsRes.value.data) ? appsRes.value.data : []);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return <LoadingState label="Loading your dashboard…" />;
  }

  const p = (profile || {}) as ContractorProfile;
  const companyName = p?.company_name || 'Contractor Partner';
  const firstName = companyName.split(' ')[0] || 'Contractor';
  const verificationStatus = p?.verification_status || 'pending';
  const isVerified = verificationStatus === 'verified';
  const { percent: profileScore, items: checklist } = computeProfileCompletion(p);

  const safeOpps = Array.isArray(opportunities) ? opportunities : [];
  const safeApps = Array.isArray(applications) ? applications : [];
  const topOpportunities = safeOpps.slice(0, 3);
  const topApplications = safeApps.slice(0, 3);
  const highMatchCount = safeOpps.filter((op) => (op?.match_score || 0) >= 70).length;
  const pendingChecklist = (checklist || []).filter((item) => !item.complete);

  const getApplicationStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'SELECTED') return 'contractor-status-pill--selected';
    if (s === 'SHORTLISTED') return 'contractor-status-pill--shortlisted';
    if (s === 'UNDER_REVIEW') return 'contractor-status-pill--review';
    if (s === 'REJECTED') return 'contractor-status-pill--rejected';
    return 'contractor-status-pill--submitted';
  };

  const getApplicationStatusText = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'SELECTED') return 'Selected';
    if (s === 'SHORTLISTED') return 'Shortlisted';
    if (s === 'UNDER_REVIEW') return 'In Review';
    if (s === 'REJECTED') return 'Not Selected';
    return 'Sent';
  };

  return (
    <div className="contractor-dashboard">
      {/* Sleek, Compact Hero Banner */}
      <div className="contractor-dashboard__banner">
        <div className="contractor-dashboard__banner-decor" />
        
        {/* Top Header Row (Badge on Left, Location on Top Right) */}
        <div className="contractor-dashboard__banner-top">
          <div className="contractor-dashboard__banner-badge">
            <span className={`contractor-dashboard__badge-dot ${isVerified ? 'contractor-dashboard__badge-dot--verified' : ''}`} />
            {isVerified ? 'Verified Partner' : 'Contractor Account'}
          </div>
          <span className="contractor-dashboard__banner-loc">
            <IconMapPin size={13} /> {[p.city, p.state].filter(Boolean).join(', ') || 'Location active'}
          </span>
        </div>

        {/* Bottom / Main Content Row (Title/Subtitle on Left, Buttons on Lower Right) */}
        <div className="contractor-dashboard__banner-main">
          <div className="contractor-dashboard__banner-info">
            <h1 className="contractor-dashboard__title">Welcome back, {firstName}</h1>
            <p className="contractor-dashboard__subtitle">
              Find new work for your workers, check your applications, and update company details.
            </p>
          </div>

          <div className="contractor-dashboard__banner-actions">
            <Link href="/contractor-portal/opportunities" className="contractor-btn-primary">
              Find Work
              <IconArrowRight size={15} />
            </Link>
            <Link href="/contractor-portal/profile?tab=documents" className="contractor-btn-secondary">
              My Documents
            </Link>
          </div>
        </div>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className="contractor-dashboard__metrics">
        <Link href="/contractor-portal/profile" className="contractor-metric-card contractor-metric-card--link">
          <div className="contractor-metric-body">
            <span className="contractor-metric-lbl">Profile Score</span>
            <div className="contractor-metric-val">{profileScore}%</div>
            <div className="contractor-metric-mini-bar">
              <div className="contractor-metric-mini-fill" style={{ width: `${profileScore}%` }} />
            </div>
            <span className="contractor-metric-sub">
              {profileScore === 100 ? '100% Ready' : `${100 - profileScore}% left to fill →`}
            </span>
          </div>
          <div className="contractor-metric-icon-box contractor-metric-icon-box--teal">
            <IconClipboard size={20} />
          </div>
        </Link>

        <Link href="/contractor-portal/profile?tab=verification" className="contractor-metric-card contractor-metric-card--link">
          <div className="contractor-metric-body">
            <span className="contractor-metric-lbl">Account Status</span>
            <div className="contractor-metric-val contractor-metric-val--status">
              {isVerified ? 'Verified' : verificationStatus === 'rejected' ? 'Action Needed' : 'In Review'}
            </div>
            <span className={`contractor-metric-sub ${isVerified ? 'contractor-metric-sub--success' : 'contractor-metric-sub--amber'}`}>
              {isVerified
                ? (p.last_verified_at ? `Verified ${new Date(p.last_verified_at).toLocaleDateString()}` : 'ID Approved')
                : 'Checking documents →'}
            </span>
          </div>
          <div className={`contractor-metric-icon-box ${isVerified ? 'contractor-metric-icon-box--emerald' : 'contractor-metric-icon-box--amber'}`}>
            <IconShield size={20} />
          </div>
        </Link>

        <Link href="/contractor-portal/opportunities" className="contractor-metric-card contractor-metric-card--link">
          <div className="contractor-metric-body">
            <span className="contractor-metric-lbl">Jobs For You</span>
            <div className="contractor-metric-val">{stats.opportunitiesCount || safeOpps.length}</div>
            <span className="contractor-metric-sub contractor-metric-sub--teal">
              {highMatchCount > 0 ? `${highMatchCount} good matches available →` : 'See open jobs →'}
            </span>
          </div>
          <div className="contractor-metric-icon-box contractor-metric-icon-box--mint">
            <IconTarget size={20} />
          </div>
        </Link>

        <Link href="/contractor-portal/applications" className="contractor-metric-card contractor-metric-card--link">
          <div className="contractor-metric-body">
            <span className="contractor-metric-lbl">My Applications</span>
            <div className="contractor-metric-val">{stats.activeApplicationsCount || safeApps.length}</div>
            <span className="contractor-metric-sub contractor-metric-sub--navy">
              {stats.selectedApplicationsCount > 0 ? `${stats.selectedApplicationsCount} selected / shortlisted →` : 'Check application status →'}
            </span>
          </div>
          <div className="contractor-metric-icon-box contractor-metric-icon-box--navy">
            <IconApplications size={20} />
          </div>
        </Link>
      </div>

      {/* Featured / Matched Opportunities Spotlight */}
      <div className="contractor-section">
        <div className="contractor-section__header">
          <div>
            <div className="contractor-section__badge">Recommended Jobs</div>
            <h2 className="contractor-section__title">Jobs That Match Your Workers</h2>
            <p className="contractor-section__subtitle">
              Work requests from companies that match your workers and location.
            </p>
          </div>
          <Link href="/contractor-portal/opportunities" className="contractor-link-all">
            See All ({safeOpps.length})
            <IconArrowRight size={14} />
          </Link>
        </div>

        {topOpportunities.length === 0 ? (
          <div className="contractor-empty-box">
            <div className="contractor-empty-icon"><IconTarget size={28} /></div>
            <h3>No Jobs Available Right Now</h3>
            <p>New job requests are added daily. Keep your skills and worker count updated to get matched faster.</p>
            <Link href="/contractor-portal/profile" className="contractor-btn-secondary-dark">
              Update Skills & Areas
            </Link>
          </div>
        ) : (
          <div className="contractor-opportunities-grid">
            {topOpportunities.map((op) => (
              <div key={op.id} className="contractor-op-card">
                <div className="contractor-op-card__top">
                  <div className="contractor-op-tags">
                    {op.industry && <span className="contractor-tag-industry">{op.industry}</span>}
                    <span className="contractor-tag-location">
                      <IconMapPin size={11} /> {op.location}
                    </span>
                  </div>
                  {op.match_score != null && (
                    <span className={`contractor-match-pill ${op.match_score >= 70 ? 'contractor-match-pill--high' : 'contractor-match-pill--medium'}`}>
                      {op.match_score}% Match
                    </span>
                  )}
                </div>

                <h3 className="contractor-op-card__title">{op.title}</h3>

                <div className="contractor-op-meta-grid">
                  <div className="contractor-op-meta-item">
                    <span className="contractor-op-meta-lbl">WORKERS NEEDED</span>
                    <strong className="contractor-op-meta-val">
                      <IconUsers size={13} /> {op.workers_required} Workers
                    </strong>
                  </div>
                  <div className="contractor-op-meta-item">
                    <span className="contractor-op-meta-lbl">JOB LENGTH</span>
                    <strong className="contractor-op-meta-val">
                      <IconClock size={13} /> {op.duration || 'Full-time'}
                    </strong>
                  </div>
                </div>

                {op.required_skills && op.required_skills.length > 0 && (
                  <div className="contractor-op-skills">
                    {op.required_skills.slice(0, 3).map((s, idx) => (
                      <span key={idx} className="contractor-skill-pill">{s}</span>
                    ))}
                    {op.required_skills.length > 3 && (
                      <span className="contractor-skill-pill-more">+{op.required_skills.length - 3}</span>
                    )}
                  </div>
                )}

                <div className="contractor-op-card__bottom">
                  {op.has_applied ? (
                    <span className="contractor-applied-indicator">
                      <IconCheck size={13} /> Already Applied
                    </span>
                  ) : (
                    <span className="contractor-unapplied-indicator">Ready to apply</span>
                  )}
                  <Link href={`/contractor-portal/opportunities/${op.id}`} className="contractor-op-btn">
                    {op.has_applied ? 'View Details' : 'Apply Now'}
                    <IconArrowRight size={13} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Spacious 2-Column Section */}
      <div className="contractor-dashboard__grid">
        {/* Left Card: Company Profile Overview */}
        <div className="contractor-card">
          <div className="contractor-card__header">
            <div>
              <h3>Company Profile</h3>
              <p className="contractor-card__subtext">Your company details and worker capacity.</p>
            </div>
            <span className="contractor-badge-pill contractor-badge-pill--teal">
              {profileScore}% Ready
            </span>
          </div>

          {/* Clean Trust Snapshot */}
          <div className="contractor-trust-overview">
            <div className="contractor-trust-score-ring" style={{ '--trust-score': profileScore } as React.CSSProperties}>
              <div className="contractor-trust-ring-inner">
                <span className="contractor-trust-score-num">{profileScore}%</span>
              </div>
            </div>
            <div className="contractor-trust-meta-block">
              <h4>{companyName}</h4>
              <div className="contractor-trust-badge-row">
                <span className={`contractor-trust-tag ${isVerified ? 'contractor-trust-tag--verified' : 'contractor-trust-tag--pending'}`}>
                  {isVerified ? <IconCheck size={12} /> : <IconAlertCircle size={12} />}
                  {isVerified ? 'ID Verified' : 'Checking Documents'}
                </span>
                <span className="contractor-trust-industry-pill">
                  {p.industry || 'Contractor'}
                </span>
              </div>
            </div>
          </div>

          {/* 2x2 Clean Capability Grid */}
          <div className="contractor-capabilities-grid">
            <div className="contractor-cap-tile">
              <div className="contractor-cap-tile__icon">
                <IconUsers size={16} />
              </div>
              <div className="contractor-cap-tile__info">
                <span>Workers Available</span>
                <strong>{p.workforce_size ?? 0} Workers</strong>
              </div>
            </div>

            <div className="contractor-cap-tile">
              <div className="contractor-cap-tile__icon">
                <IconTools size={16} />
              </div>
              <div className="contractor-cap-tile__info">
                <span>Skills Added</span>
                <strong>{p.skills?.length || 0} Skills</strong>
              </div>
            </div>

            <div className="contractor-cap-tile">
              <div className="contractor-cap-tile__icon">
                <IconMapPin size={16} />
              </div>
              <div className="contractor-cap-tile__info">
                <span>Location</span>
                <strong>{[p.city, p.state].filter(Boolean).join(', ') || 'Declared'}</strong>
              </div>
            </div>

            <div className="contractor-cap-tile">
              <div className="contractor-cap-tile__icon">
                <IconShield size={16} />
              </div>
              <div className="contractor-cap-tile__info">
                <span>Account Status</span>
                <strong>{isVerified ? 'Verified Partner' : 'In Review'}</strong>
              </div>
            </div>
          </div>

          {/* Action Notice Strip */}
          {pendingChecklist.length > 0 ? (
            <div className="contractor-action-notice">
              <div className="contractor-action-notice__left">
                <IconAlertCircle size={16} className="contractor-notice-icon" />
                <div>
                  <strong>{pendingChecklist.length} {pendingChecklist.length === 1 ? 'detail' : 'details'} missing</strong>
                  <span>Add missing info to get more job offers from companies.</span>
                </div>
              </div>
              <Link href="/contractor-portal/profile" className="contractor-notice-btn">
                Add Details &rarr;
              </Link>
            </div>
          ) : (
            <div className="contractor-action-notice contractor-action-notice--success">
              <div className="contractor-action-notice__left">
                <IconCheck size={16} className="contractor-notice-icon contractor-notice-icon--success" />
                <div>
                  <strong>Profile is 100% complete!</strong>
                  <span>Companies can easily find and hire your workers.</span>
                </div>
              </div>
              <Link href="/contractor-portal/profile" className="contractor-notice-btn">
                Edit Profile &rarr;
              </Link>
            </div>
          )}
        </div>

        {/* Right Card: My Applications */}
        <div className="contractor-card">
          <div className="contractor-card__header">
            <div>
              <h3>My Applications</h3>
              <p className="contractor-card__subtext">Track jobs you have applied for.</p>
            </div>
            <Link href="/contractor-portal/applications" className="contractor-card-header-link">
              See All ({safeApps.length}) &rarr;
            </Link>
          </div>

          {topApplications.length === 0 ? (
            <div className="contractor-proposals-empty">
              <div className="contractor-proposals-empty__icon">
                <IconApplications size={28} />
              </div>
              <h4>No Applications Sent Yet</h4>
              <p>Apply to matching jobs above to get hired by companies.</p>
              <Link href="/contractor-portal/opportunities" className="contractor-proposals-empty__btn">
                Find Jobs &rarr;
              </Link>
            </div>
          ) : (
            <div className="contractor-proposals-list">
              {topApplications.map((app) => (
                <Link
                  key={app.id}
                  href={`/contractor-portal/applications/${app.id}`}
                  className="contractor-proposal-item"
                >
                  <div className="contractor-proposal-item__main">
                    <strong className="contractor-proposal-item__title">{app.requirement_title}</strong>
                    <div className="contractor-proposal-item__meta">
                      <span><IconMapPin size={12} /> {app.requirement_location}</span>
                      <span>•</span>
                      <span><IconUsers size={12} /> {app.proposed_workforce} Workers</span>
                      {app.proposed_rate && (
                        <>
                          <span>•</span>
                          <span>₹{app.proposed_rate}/day</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="contractor-proposal-item__end">
                    <span className={`contractor-status-pill ${getApplicationStatusBadge(app.application_status)}`}>
                      {getApplicationStatusText(app.application_status)}
                    </span>
                    <IconArrowRight size={14} className="contractor-prop-arrow" />
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="contractor-card__footer-strip">
            <div className="contractor-stat-summary-row">
              <div className="contractor-mini-stat">
                <span className="contractor-mini-stat-lbl">Sent</span>
                <strong>{safeApps.filter((a) => a?.application_status === 'SUBMITTED').length}</strong>
              </div>
              <div className="contractor-mini-stat">
                <span className="contractor-mini-stat-lbl">In Review</span>
                <strong>{safeApps.filter((a) => a?.application_status === 'UNDER_REVIEW' || a?.application_status === 'SHORTLISTED').length}</strong>
              </div>
              <div className="contractor-mini-stat">
                <span className="contractor-mini-stat-lbl">Selected</span>
                <strong className="contractor-mini-stat-val--green">{safeApps.filter((a) => a?.application_status === 'SELECTED').length}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Strip */}
      <div className="contractor-quick-actions">
        <h3 className="contractor-quick-actions__title">Quick Shortcuts</h3>
        <div className="contractor-quick-actions__grid">
          <Link href="/contractor-portal/opportunities" className="contractor-action-tile">
            <div className="contractor-action-tile__icon contractor-action-tile__icon--teal">
              <IconSearch size={18} />
            </div>
            <div className="contractor-action-tile__info">
              <strong>Find Work</strong>
              <span>Look at new jobs and tenders</span>
            </div>
            <IconArrowRight size={15} className="contractor-action-tile__arrow" />
          </Link>

          <Link href="/contractor-portal/profile?tab=verification" className="contractor-action-tile">
            <div className="contractor-action-tile__icon contractor-action-tile__icon--emerald">
              <IconShield size={18} />
            </div>
            <div className="contractor-action-tile__info">
              <strong>Upload Documents</strong>
              <span>Add ID and business licenses</span>
            </div>
            <IconArrowRight size={15} className="contractor-action-tile__arrow" />
          </Link>

          <Link href="/contractor-portal/profile?tab=workforce" className="contractor-action-tile">
            <div className="contractor-action-tile__icon contractor-action-tile__icon--navy">
              <IconUsers size={18} />
            </div>
            <div className="contractor-action-tile__info">
              <strong>Update Workers</strong>
              <span>Change worker count and skills</span>
            </div>
            <IconArrowRight size={15} className="contractor-action-tile__arrow" />
          </Link>

          <Link href="/contractor-portal/settings" className="contractor-action-tile">
            <div className="contractor-action-tile__icon contractor-action-tile__icon--slate">
              <IconSettings size={18} />
            </div>
            <div className="contractor-action-tile__info">
              <strong>Account Settings</strong>
              <span>Change password and alerts</span>
            </div>
            <IconArrowRight size={15} className="contractor-action-tile__arrow" />
          </Link>
        </div>
      </div>
    </div>
  );
}



