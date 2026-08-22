'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { listContractorRequests, type ContractorRequest, type ContractorRequestStatus } from '@/lib/api/contractorRequests';
import { relativeTime } from '@/lib/util/relativeTime';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import './requests.css';

const STATUSES: ContractorRequestStatus[] = ['NEW', 'CONTACTED', 'PROFILE_IN_PROGRESS', 'SUBMITTED_FOR_REVIEW', 'APPROVED', 'REJECTED', 'CLOSED'];

const STATUS_TONE: Record<ContractorRequestStatus, string> = {
  NEW: 'new',
  CONTACTED: 'active',
  PROFILE_IN_PROGRESS: 'active',
  SUBMITTED_FOR_REVIEW: 'active',
  APPROVED: 'closed',
  REJECTED: 'closed',
  CLOSED: 'closed',
};

/**
 * Field Staff's mobile-friendly request queue (spec §3). Each card shows
 * request name, location, industry, created date, and assigned staff — no
 * desktop table. Deep-linkable via ?status= (used by Dashboard tiles).
 */
export default function ContractorRequestsPage() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') as ContractorRequestStatus | null;

  const [requests, setRequests] = useState<ContractorRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ContractorRequestStatus | 'ALL'>(initialStatus && STATUSES.includes(initialStatus) ? initialStatus : 'ALL');

  useEffect(() => {
    listContractorRequests()
      .then(({ data }) => setRequests(data))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => (tab === 'ALL' ? requests : requests.filter((r) => r.status === tab)),
    [requests, tab],
  );

  return (
    <>
      <WorkspacePageHeader title={t.fieldStaff.requests.title} subtitle={t.fieldStaff.requests.subtitle} />

      {loading ? (
        <LoadingState label="Loading requests…" />
      ) : requests.length === 0 ? (
        <EmptyState title={t.fieldStaff.requests.noRequests} />
      ) : (
        <>
          <div className="requests-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={tab === 'ALL'}
              className={`requests-tab ${tab === 'ALL' ? 'requests-tab--active' : ''}`}
              onClick={() => setTab('ALL')}
            >
              {t.fieldStaff.requests.all}
            </button>
            {STATUSES.map((s) => (
              <button
                key={s}
                role="tab"
                aria-selected={tab === s}
                className={`requests-tab ${tab === s ? 'requests-tab--active' : ''}`}
                onClick={() => setTab(s)}
              >
                {s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState title={t.fieldStaff.requests.noneInFilter} />
          ) : (
            <div className="requests-list">
              {filtered.map((r) => (
                <Link key={r.id} href={`/contractor/requests/${r.id}`} className="request-item">
                  <div className="request-item__body">
                    <div className="request-item__top">
                      <h3>{r.company_name}</h3>
                      <span className="request-item__time">{relativeTime(r.created_at)}</span>
                    </div>
                    <p className="request-item__meta">
                      {r.city} • {r.industry}
                    </p>
                    <p className="request-item__assigned">
                      {t.fieldStaff.requests.assignedTo}: {r.assigned_to_email ?? t.fieldStaff.requests.unassigned}
                    </p>
                  </div>
                  <span className={`request-status request-status--${STATUS_TONE[r.status]}`}>{r.status.replace(/_/g, ' ')}</span>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
