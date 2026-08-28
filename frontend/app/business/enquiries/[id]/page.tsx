'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { useAuth } from '@/lib/auth/useAuth';
import { getEnquiry, closeEnquiry, type EnquiryDetail } from '@/lib/api/enquiries';
import { formatDate } from '@/lib/util/date';
import StatusPill from '@/components/enquiries/StatusPill';
import Conversation from '@/components/enquiries/Conversation';
import EmptyState from '@/components/ui/EmptyState';
import LoadingState from '@/components/ui/LoadingState';
import Button from '@/components/ui/Button';
import { IconClock, IconMessage } from '@/components/ui/Icons';
import '@/components/enquiries/EnquiryDetail.css';

export default function BusinessEnquiryDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const router = useRouter();
  const { user } = useAuth();

  const [enquiry, setEnquiry] = useState<EnquiryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [closing, setClosing] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    getEnquiry(id)
      .then(({ data }) => setEnquiry(data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load enquiry'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleClose = async () => {
    setClosing(true);
    try {
      await closeEnquiry(id);
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to close enquiry');
    } finally {
      setClosing(false);
    }
  };

  const isPending = enquiry && (enquiry.status === 'NEW' || enquiry.status === 'UNDER_REVIEW');
  const isAccepted = enquiry && ['BROKERING', 'CONTACTED', 'IN_PROGRESS', 'COMPLETED', 'WON'].includes(enquiry.status);
  const isDeclined = enquiry && enquiry.status === 'DECLINED';

  return (
    <>
      <WorkspacePageHeader
        title="Enquiry Requirement"
        subtitle={enquiry ? `Project request with ${enquiry.contractor_name}` : 'Enquiry Details'}
      />
      <div className="enquiry-detail-page__inner" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <Link href="/business/enquiries" className="enquiry-detail-page__back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M11 18l-6-6 6-6" />
          </svg>
          Back to Enquiries
        </Link>

        {loading ? (
          <LoadingState label="Loading enquiry requirement…" />
        ) : error || !enquiry ? (
          <EmptyState
            title="Enquiry not found"
            subtitle={error || ''}
            action={<Button href="/business/enquiries" variant="secondary" size="sm">Back to Enquiries</Button>}
          />
        ) : (
          <>
            <div className="enquiry-detail-card">
              <div className="enquiry-detail-card__header">
                <div>
                  <p>CONTRACTOR REQUIREMENT</p>
                  <h1>{enquiry.contractor_name}</h1>
                </div>
                <StatusPill status={enquiry.status} viewer="business" />
              </div>

              <div className="enquiry-detail-card__grid">
                {enquiry.category_name && (
                  <div className="enquiry-detail-card__field">
                    <span>Requirement Type</span>
                    <strong>{enquiry.category_name}</strong>
                  </div>
                )}
                {enquiry.workers_required != null && (
                  <div className="enquiry-detail-card__field">
                    <span>Workers Required</span>
                    <strong>{enquiry.workers_required} workers</strong>
                  </div>
                )}
                {enquiry.location && (
                  <div className="enquiry-detail-card__field">
                    <span>Project Location</span>
                    <strong>{enquiry.location}</strong>
                  </div>
                )}
                {enquiry.start_date && (
                  <div className="enquiry-detail-card__field">
                    <span>Expected Start Date</span>
                    <strong>{formatDate(enquiry.start_date)}</strong>
                  </div>
                )}
                {enquiry.duration && (
                  <div className="enquiry-detail-card__field">
                    <span>Expected Duration</span>
                    <strong>{enquiry.duration}</strong>
                  </div>
                )}
              </div>

              <p className="enquiry-detail-card__desc-label">Submitted Details</p>
              <p className="enquiry-detail-card__desc">{enquiry.message}</p>

              {/* Pending Banner */}
              {isPending && (
                <div style={{ marginTop: '24px', padding: '16px', background: '#fffbe8', border: '1px solid #fef3c7', borderRadius: '12px', color: '#92400e' }}>
                  <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}><IconClock size={14} /> Waiting for Contractor Acceptance</strong>
                  <p style={{ margin: 0, fontSize: '13.5px' }}>
                    Your enquiry has been delivered to <strong>{enquiry.contractor_name}</strong>. Chat will be unlocked once they accept your project requirement.
                  </p>
                </div>
              )}

              {/* Accepted Banner */}
              {isAccepted && (
                <div style={{ marginTop: '24px', padding: '16px', background: 'var(--craly-mint)', borderRadius: '12px', border: '1px solid var(--craly-teal)' }}>
                  <strong style={{ color: 'var(--craly-teal-dark)', display: 'block' }}>✓ Enquiry Accepted!</strong>
                  <span style={{ fontSize: '13px', color: 'var(--craly-text)' }}>Craly is coordinating with {enquiry.contractor_name} you can message below.</span>
                </div>
              )}

              {/* Declined Banner */}
              {isDeclined && (
                <div style={{ marginTop: '24px', padding: '14px 16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '12px', color: '#991b1b', fontSize: '14px' }}>
                  <strong>Enquiry Declined</strong>
                  <p style={{ marginTop: '4px', margin: 0 }}>The contractor is unavailable for this requirement.</p>
                  {enquiry.status_reason && <p style={{ marginTop: '4px', margin: 0 }}>Reason: {enquiry.status_reason}</p>}
                </div>
              )}

              {!['CLOSED_EXPIRED', 'DECLINED', 'COMPLETED', 'WON', 'LOST'].includes(enquiry.status) && (
                <div className="enquiry-detail-card__actions" style={{ marginTop: '20px' }}>
                  <Button variant="secondary" size="sm" onClick={handleClose} disabled={closing}>
                    {closing ? 'Closing…' : 'Close Enquiry'}
                  </Button>
                </div>
              )}
            </div>

            {/* Conversation / Chat Card (Unlocked only when ACCEPTED) */}
            {isAccepted ? (
              <div className="conversation-card">
                <h2>Conversation</h2>
                <Conversation
                  enquiryId={enquiry.id}
                  viewerUserId={user?.id || ''}
                  businessUserId={enquiry.business_user_id}
                  contractorUserId={enquiry.contractor_user_id}
                  businessName={enquiry.business_name}
                  contractorName={enquiry.contractor_name}
                  status={enquiry.status}
                  onMessageSent={load}
                />
              </div>
            ) : isPending ? (
              <div className="conversation-card" style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--craly-muted)', background: 'var(--craly-white)', borderRadius: '16px', border: '1px solid var(--craly-border)' }}>
                <p style={{ margin: 0, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}><IconMessage size={14} /> Chat unlocks automatically as soon as {enquiry.contractor_name} accepts your enquiry.</p>
              </div>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
