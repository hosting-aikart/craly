'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { useAuth } from '@/lib/auth/useAuth';
import { getEnquiry, acceptEnquiry, declineEnquiry, type EnquiryDetail } from '@/lib/api/enquiries';
import { formatDate } from '@/lib/util/date';
import StatusPill from '@/components/enquiries/StatusPill';
import Conversation from '@/components/enquiries/Conversation';
import EmptyState from '@/components/ui/EmptyState';
import LoadingState from '@/components/ui/LoadingState';
import Button from '@/components/ui/Button';
import '@/components/enquiries/EnquiryDetail.css';

export default function ContractorEnquiryDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const router = useRouter();
  const { user } = useAuth();

  const [enquiry, setEnquiry] = useState<EnquiryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [accepting, setAccepting] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [declining, setDeclining] = useState(false);

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

  const handleAccept = async () => {
    setAccepting(true);
    setError('');
    try {
      await acceptEnquiry(id);
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to accept enquiry');
    } finally {
      setAccepting(false);
    }
  };

  const handleDeclineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeclining(true);
    setError('');
    try {
      await declineEnquiry(id, declineReason);
      setShowDeclineModal(false);
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to decline enquiry');
    } finally {
      setDeclining(false);
    }
  };

  const isPending = enquiry && (enquiry.status === 'NEW' || enquiry.status === 'UNDER_REVIEW');
  const isAccepted = enquiry && ['BROKERING', 'CONTACTED', 'IN_PROGRESS', 'COMPLETED', 'WON'].includes(enquiry.status);
  const isDeclined = enquiry && enquiry.status === 'DECLINED';

  return (
    <>
      <WorkspacePageHeader
        title="Enquiry Requirement"
        subtitle={enquiry ? `Project request from ${enquiry.business_name}` : 'Enquiry Details'}
      />
      <div className="enquiry-detail-page__inner" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <Link href="/contractor/enquiries" className="enquiry-detail-page__back">
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
            action={<Button href="/contractor/enquiries" variant="secondary" size="sm">Back to Enquiries</Button>}
          />
        ) : (
          <>
            <div className="enquiry-detail-card">
              <div className="enquiry-detail-card__header">
                <div>
                  <p>PROJECT REQUIREMENT</p>
                  <h1>{enquiry.business_name}</h1>
                </div>
                <StatusPill status={enquiry.status} viewer="contractor" />
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

              <p className="enquiry-detail-card__desc-label">Project Details</p>
              <p className="enquiry-detail-card__desc">{enquiry.message}</p>

              {/* Pending Action Controls */}
              {isPending && (
                <div className="enquiry-detail-card__actions" style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <Button variant="primary" size="md" onClick={handleAccept} disabled={accepting}>
                    {accepting ? 'Accepting…' : '✓ Accept Enquiry'}
                  </Button>
                  <Button variant="ghost" size="md" onClick={() => setShowDeclineModal(true)}>
                    Decline
                  </Button>
                </div>
              )}

              {/* Accepted Banner */}
              {isAccepted && (
                <div className="enquiry-detail-card__accepted-banner" style={{ marginTop: '24px', padding: '16px', background: 'var(--craly-mint)', borderRadius: '12px', border: '1px solid var(--craly-teal)' }}>
                  <strong style={{ color: 'var(--craly-teal-dark)', display: 'block' }}>✓ Enquiry Accepted</strong>
                  <span style={{ fontSize: '13px', color: 'var(--craly-text)' }}>You can now message the business below.</span>
                </div>
              )}

              {/* Declined Banner */}
              {isDeclined && (
                <div style={{ marginTop: '24px', padding: '14px 16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '12px', color: '#991b1b', fontSize: '14px' }}>
                  <strong>Enquiry Declined</strong>
                  {enquiry.status_reason && <p style={{ marginTop: '4px', margin: 0 }}>Reason: {enquiry.status_reason}</p>}
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
              <div className="conversation-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--craly-muted)' }}>
                <p style={{ margin: 0 }}>Chat will be unlocked after you accept this enquiry.</p>
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* Decline Reason Modal */}
      {showDeclineModal && (
        <div className="meet-modal__backdrop" onClick={() => setShowDeclineModal(false)}>
          <div className="meet-modal__content" onClick={(e) => e.stopPropagation()}>
            <div className="meet-modal__header">
              <h3>Decline Enquiry</h3>
              <button className="meet-modal__close" onClick={() => setShowDeclineModal(false)}>×</button>
            </div>
            <form onSubmit={handleDeclineSubmit} className="meet-modal__form">
              <div className="meet-modal__field">
                <label>Reason (optional)</label>
                <textarea
                  rows={3}
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="e.g. Currently unavailable for this timeframe..."
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--craly-border)' }}
                />
              </div>
              <div className="meet-modal__actions">
                <Button type="submit" variant="primary" disabled={declining}>
                  {declining ? 'Declining…' : 'Confirm Decline'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowDeclineModal(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
