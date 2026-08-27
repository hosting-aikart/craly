'use client';

import { useEffect, useState } from 'react';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { getFieldStaffDashboard, type FieldStaffDashboard } from '@/lib/api/fieldStaff';
import { activityLabel } from '@/lib/util/activityLabel';
import { relativeTime } from '@/lib/util/relativeTime';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import '../field-staff.css';

/**
 * Field Staff Dashboard (spec §2). Every tile is a real, live count from
 * getFieldStaffDashboard() — no fabricated statistics. Ops Head sees the
 * same shape but team-wide (handled server-side, see fieldStaffController).
 */
export default function FieldStaffDashboardPage() {
  const { t } = useLanguage();
  const [data, setData] = useState<FieldStaffDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFieldStaffDashboard()
      .then(({ data }) => setData(data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <WorkspacePageHeader title={t.fieldStaff.dashboard.title} subtitle={t.fieldStaff.dashboard.subtitle} />

      {loading ? (
        <LoadingState label="Loading dashboard…" />
      ) : !data ? (
        <EmptyState title="Couldn't load your dashboard" subtitle="Please try refreshing the page." />
      ) : (
        <>
          <div className="fs-tiles">
            <a className="fs-tile" href="/contractor/requests?status=NEW">
              <span className="fs-tile__value">{data.newRequests}</span>
              <span className="fs-tile__label">{t.fieldStaff.dashboard.newRequests}</span>
            </a>
            <a className="fs-tile" href="/contractor/requests">
              <span className="fs-tile__value">{data.myPendingRequests}</span>
              <span className="fs-tile__label">{t.fieldStaff.dashboard.myPendingRequests}</span>
            </a>
            <a className="fs-tile" href="/contractor/contractors">
              <span className="fs-tile__value">{data.profilesBeingCompleted}</span>
              <span className="fs-tile__label">{t.fieldStaff.dashboard.profilesBeingCompleted}</span>
            </a>
            <a className="fs-tile" href="/contractor/requests?status=SUBMITTED_FOR_REVIEW">
              <span className="fs-tile__value">{data.profilesSubmittedForReview}</span>
              <span className="fs-tile__label">{t.fieldStaff.dashboard.profilesSubmittedForReview}</span>
            </a>
          </div>

          <div className="fs-section">
            <h2>{t.fieldStaff.dashboard.recentActivity}</h2>
            {data.recentActivity.length === 0 ? (
              <EmptyState title={t.fieldStaff.dashboard.noActivity} />
            ) : (
              <div className="fs-activity-list">
                {data.recentActivity.map((item) => (
                  <div className="fs-activity-item" key={item.id}>
                    <span className="fs-activity-item__action">{activityLabel(item.action)}</span>
                    <span className="fs-activity-item__meta">
                      {item.actor_email ? `${item.actor_email} · ` : ''}
                      {relativeTime(item.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
