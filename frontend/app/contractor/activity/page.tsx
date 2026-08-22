'use client';

import { useEffect, useState } from 'react';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { getMyActivity, type MyActivityItem } from '@/lib/api/fieldStaff';
import { activityLabel } from '@/lib/util/activityLabel';
import { relativeTime } from '@/lib/util/relativeTime';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import '../field-staff.css';

/**
 * "My Activity" (spec §10) — reads the shared audit_logs table via
 * GET /field-staff/activity, scoped to the caller. No separate audit
 * system; this is purely a read view over what pfContractorController /
 * contractorRequestController already write.
 */
export default function MyActivityPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<MyActivityItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMyActivity(page)
      .then(({ data, total }) => {
        setItems((prev) => (page === 1 ? data : [...prev, ...data]));
        setTotal(total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <>
      <WorkspacePageHeader title={t.fieldStaff.activity.title} subtitle={t.fieldStaff.activity.subtitle} />

      {loading && page === 1 ? (
        <LoadingState label="Loading activity…" />
      ) : items.length === 0 ? (
        <EmptyState title={t.fieldStaff.activity.noActivity} />
      ) : (
        <div className="fs-section">
          <div className="fs-activity-list">
            {items.map((item) => (
              <div className="fs-activity-item" key={item.id}>
                <span className="fs-activity-item__action">{activityLabel(item.action)}</span>
                <span className="fs-activity-item__meta">{relativeTime(item.created_at)}</span>
              </div>
            ))}
          </div>
          {items.length < total && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Button variant="secondary" size="sm" onClick={() => setPage((p) => p + 1)} disabled={loading}>
                {loading ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
