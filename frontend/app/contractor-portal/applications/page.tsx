'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getMyApplications, type ApplicationItem } from '@/lib/api/contractorPortal';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import './applications.css';

export default function MyApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyApplications()
      .then(({ data }) => setApplications(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingState label="Loading Applications…" />;
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
    <div className="applications-page">
      <div className="applications-hero">
        <h1>My Submitted Applications</h1>
        <p>
          Track status updates, workforce details, and progress for your submitted proposals.
        </p>
      </div>

      {applications.length === 0 ? (
        <EmptyState
          icon="📥"
          title="No Submitted Applications"
          subtitle="You haven't applied for any manpower requirements yet. Browse open opportunities to submit your first proposal."
        />
      ) : (
        <div className="applications-grid">
          {applications.map((app) => (
            <Link
              key={app.id}
              href={`/contractor-portal/applications/${app.id}`}
              className="application-card"
            >
              <div className="application-card__top">
                <div>
                  <span className="application-card__location">📍 {app.requirement_location}</span>
                  <h3 className="application-card__title">{app.requirement_title}</h3>
                </div>
                <span className={`application-card__status ${getStatusBadgeClass(app.application_status)}`}>
                  {app.application_status.replace('_', ' ')}
                </span>
              </div>

              <div className="application-card__info-grid">
                <div className="app-info-item">
                  <span>Proposed Workforce</span>
                  <strong>{app.proposed_workforce} Workers</strong>
                </div>
                <div className="app-info-item">
                  <span>Availability Date</span>
                  <strong>{new Date(app.availability_date).toLocaleDateString()}</strong>
                </div>
                {app.proposed_rate && (
                  <div className="app-info-item">
                    <span>Proposed Rate</span>
                    <strong>₹{app.proposed_rate}/day</strong>
                  </div>
                )}
              </div>

              <div className="application-card__footer">
                <span>Submitted: {new Date(app.submitted_at).toLocaleDateString()}</span>
                <span className="app-card-arrow">View Application Details →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
