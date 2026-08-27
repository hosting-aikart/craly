'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { getApplicationById, type ApplicationItem } from '@/lib/api/contractorPortal';
import LoadingState from '@/components/ui/LoadingState';
import './application-detail.css';

export default function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [application, setApplication] = useState<ApplicationItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getApplicationById(resolvedParams.id)
      .then(({ data }) => setApplication(data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Application not found'))
      .finally(() => setLoading(false));
  }, [resolvedParams.id]);

  if (loading) {
    return <LoadingState label="Loading Application details…" />;
  }

  if (error || !application) {
    return (
      <div className="application-detail-page">
        <Link href="/contractor-portal/applications" className="back-link">
          ← Back to My Applications
        </Link>
        <div className="app-detail-error">{error || 'Application not found'}</div>
      </div>
    );
  }

  const getStatusBadgeClass = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'SELECTED') return 'app-status--selected';
    if (s === 'SHORTLISTED') return 'app-status--shortlisted';
    if (s === 'UNDER_REVIEW') return 'app-status--review';
    if (s === 'REJECTED') return 'app-status--rejected';
    if (s === 'CLOSED') return 'app-status--closed';
    return 'app-status--submitted';
  };

  return (
    <div className="application-detail-page">
      <Link href="/contractor-portal/applications" className="back-link">
        ← Back to My Applications
      </Link>

      {/* Detail Header */}
      <div className="app-detail-header">
        <div>
          <span className="app-detail-loc">📍 {application.requirement_location}</span>
          <h1 className="app-detail-title">{application.requirement_title}</h1>
          <p className="app-detail-date">
            Submitted on {new Date(application.submitted_at).toLocaleDateString()}
          </p>
        </div>
        <div className="app-detail-status-wrapper">
          <span className="app-status-lbl">Current Status</span>
          <span className={`application-card__status ${getStatusBadgeClass(application.application_status)}`}>
            {application.application_status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="app-detail-grid">
        <div className="app-main-card">
          <h3 className="section-title">Submitted Application Info</h3>
          <div className="app-form-summary">
            <div className="app-form-row">
              <span>Proposed Workforce</span>
              <strong>{application.proposed_workforce} Workers</strong>
            </div>
            <div className="app-form-row">
              <span>Earliest Availability Date</span>
              <strong>{new Date(application.availability_date).toLocaleDateString()}</strong>
            </div>
            {application.proposed_rate && (
              <div className="app-form-row">
                <span>Proposed Rate</span>
                <strong>₹{application.proposed_rate} / worker / day</strong>
              </div>
            )}
            {application.relevant_experience && (
              <div className="app-form-block">
                <span>Relevant Past Experience</span>
                <p>{application.relevant_experience}</p>
              </div>
            )}
            {application.message && (
              <div className="app-form-block">
                <span>Message / Cover Notes</span>
                <p>{application.message}</p>
              </div>
            )}
          </div>
        </div>

        <div className="app-side-card">
          <h3 className="section-title">Requirement Summary</h3>
          <div className="req-summary-list">
            <div className="req-summary-item">
              <span>Industry</span>
              <strong>{application.requirement_industry || 'General Industry'}</strong>
            </div>
            <div className="req-summary-item">
              <span>Location</span>
              <strong>{application.requirement_location}</strong>
            </div>
            <div className="req-summary-item">
              <span>Workers Required</span>
              <strong>{application.requirement_workers_required} Workers</strong>
            </div>
            {application.requirement_duration && (
              <div className="req-summary-item">
                <span>Duration</span>
                <strong>{application.requirement_duration}</strong>
              </div>
            )}
          </div>
          <div className="view-opp-link-wrap">
            <Link
              href={`/contractor-portal/opportunities/${application.requirement_id}`}
              className="view-opp-link"
            >
              View Full Opportunity Page →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
