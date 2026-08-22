'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import {
  getContractorRequest,
  updateContractorRequestStatus,
  startContractorProfile,
  type ContractorRequestDetail,
} from '@/lib/api/contractorRequests';
import { activityLabel } from '@/lib/util/activityLabel';
import { relativeTime } from '@/lib/util/relativeTime';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import '../requests.css';
import '../../field-staff.css';

const TERMINAL = ['APPROVED', 'REJECTED', 'CLOSED'];

/**
 * Request Detail (spec §4). Field Staff actions only: Mark Contacted,
 * Start/Continue Profile, Submit for Operations Review (delegated to the
 * data-collection page once a profile exists). Deliberately has no Verify,
 * Reject, or Suspend action anywhere on this page — those are Operations
 * Head actions that live in their own verification workflow, not here.
 */
export default function ContractorRequestDetailPage() {
  const { t } = useLanguage();
  const rt = t.fieldStaff.requestDetail;
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';

  const [request, setRequest] = useState<ContractorRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!id) return;
    getContractorRequest(id)
      .then(({ data }) => setRequest(data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load request'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleMarkContacted = async () => {
    setWorking(true);
    setError('');
    try {
      await updateContractorRequestStatus(id, 'CONTACTED');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update status');
    } finally {
      setWorking(false);
    }
  };

  const handleStartProfile = async () => {
    setWorking(true);
    setError('');
    try {
      const { data } = await startContractorProfile(id);
      window.location.href = `/contractor/contractors/${data.contractorProfileId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the profile');
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <>
        <WorkspacePageHeader title={rt.backToQueue} />
        <LoadingState label="Loading request…" />
      </>
    );
  }

  if (!request) {
    return (
      <>
        <WorkspacePageHeader title={t.fieldStaff.nav.requests} />
        <EmptyState
          title="Request not found"
          subtitle={error}
          action={<Button href="/contractor/requests" variant="secondary" size="sm">{rt.backToQueue}</Button>}
        />
      </>
    );
  }

  const canMarkContacted = request.status === 'NEW';
  const canStartProfile = !request.contractor_profile_id && ['NEW', 'CONTACTED'].includes(request.status);
  const isSubmitted = !TERMINAL.includes(request.status) && request.status === 'SUBMITTED_FOR_REVIEW';

  return (
    <>
      <WorkspacePageHeader
        title={request.company_name}
        subtitle={`${rt.statusLabel}: ${request.status.replace(/_/g, ' ')}`}
      />
      <a href="/contractor/requests" className="pf-back-link">
        ← {rt.backToQueue}
      </a>

      <div className="fs-section">
        <div className="fs-info-row"><span>{rt.contactPerson}</span><span>{request.contact_person}</span></div>
        <div className="fs-info-row"><span>Phone</span><span>{request.phone}</span></div>
        {request.email && <div className="fs-info-row"><span>Email</span><span>{request.email}</span></div>}
        <div className="fs-info-row"><span>{rt.location}</span><span>{request.city}</span></div>
        <div className="fs-info-row"><span>{rt.industry}</span><span>{request.industry}</span></div>
        {request.workforce_count != null && <div className="fs-info-row"><span>{t.fieldStaff.profileForm.workforceCount}</span><span>{request.workforce_count}</span></div>}
        {request.years_experience != null && <div className="fs-info-row"><span>{t.fieldStaff.profileForm.yearsInBusiness}</span><span>{request.years_experience}</span></div>}
        {request.skills && <div className="fs-info-row"><span>Skills</span><span>{request.skills}</span></div>}
        <div className="fs-info-row"><span>{rt.source}</span><span>{rt.sourceValue}</span></div>
        <div className="fs-info-row"><span>{t.fieldStaff.requests.assignedTo}</span><span>{request.assigned_to_email ?? t.fieldStaff.requests.unassigned}</span></div>
        {request.message && (
          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: 12.5, color: 'var(--craly-text-muted)', marginBottom: 4 }}>{rt.leadNotes}</p>
            <p style={{ fontSize: 14, color: 'var(--craly-text)' }}>{request.message}</p>
          </div>
        )}
      </div>

      {error && <p className="auth-error" style={{ marginBottom: 16 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
        {canMarkContacted && (
          <Button type="button" variant="secondary" size="sm" onClick={handleMarkContacted} disabled={working}>
            {rt.markContacted}
          </Button>
        )}
        {canStartProfile && (
          <Button type="button" variant="primary" size="sm" onClick={handleStartProfile} disabled={working}>
            {rt.startProfile}
          </Button>
        )}
        {request.contractor_profile_id && !isSubmitted && (
          <Button href={`/contractor/contractors/${request.contractor_profile_id}`} variant="primary" size="sm">
            {rt.continueProfile}
          </Button>
        )}
        {isSubmitted && (
          <span className="fs-status-badge fs-status-badge--positive">{rt.alreadySubmitted}</span>
        )}
      </div>

      <div className="fs-section">
        <h2>{rt.activityHistory}</h2>
        {request.activity.length === 0 ? (
          <EmptyState title={rt.noActivity} />
        ) : (
          <div className="fs-activity-list">
            {request.activity.map((a) => (
              <div className="fs-activity-item" key={a.id}>
                <span className="fs-activity-item__action">{activityLabel(a.action)}</span>
                <span className="fs-activity-item__meta">{a.actor_email} · {relativeTime(a.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
