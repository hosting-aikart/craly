'use client';

import React, { useEffect, useRef, useState, FormEvent } from 'react';
import type { ContractorProfile } from '@/lib/api/profile';
import {
  getMyVerificationMessages,
  sendMyVerificationMessage,
  type VerificationMessageItem,
} from '@/lib/api/contractorPortal';
import ContractorDocumentsSection from './ContractorDocumentsSection';
import LoadingState from '@/components/ui/LoadingState';
import './ApplicationReviewStatus.css';

interface ApplicationReviewStatusProps {
  profile: ContractorProfile;
}

const SENDER_LABELS: Record<string, string> = {
  contractor: 'You',
  staff: 'Craly Operations',
  admin: 'Craly Operations',
  ops_head: 'Craly Operations',
  field_staff: 'Craly Operations',
};

/**
 * Full-page gate shown in place of the normal contractor-portal dashboard
 * while a contractor's application has not yet been approved
 * (verification_status != 'verified') — see contractor-portal/layout.tsx.
 * Covers the Contractor Application / Approval workflow's "Under Review
 * dashboard" and "Rejected" requirements: status, submitted date, document
 * upload, staff feedback, and a two-way reply thread. Normal marketplace
 * functionality (opportunities, applying, public listing) is intentionally
 * absent here — those only become reachable once Staff/Admin approves the
 * account (enforced server-side; see contractorPortalController.ts).
 */
export default function ApplicationReviewStatus({ profile }: ApplicationReviewStatusProps) {
  const status = profile.verification_status || 'pending';
  const isRejected = status === 'rejected';
  const isNeedsChanges = status === 'needs_changes';

  const [messages, setMessages] = useState<VerificationMessageItem[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const threadEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = () => {
    getMyVerificationMessages()
      .then(({ data }) => setMessages(data || []))
      .catch(() => {})
      .finally(() => setLoadingMessages(false));
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const handleReply = async (e: FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;

    setSending(true);
    setSendError('');
    try {
      await sendMyVerificationMessage(reply.trim());
      setReply('');
      fetchMessages();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="ars-container">
      <div className={`ars-hero ars-hero--${status}`}>
        <span className="ars-hero-eyebrow">Contractor Application</span>
        <h1 className="ars-hero-title">
          {isRejected ? 'Application Rejected' : 'Application Under Review'}
        </h1>
        <p className="ars-hero-desc">
          {isRejected
            ? "Craly Operations has reviewed your application and it wasn't approved. See the feedback below."
            : isNeedsChanges
            ? 'Craly Operations requested changes before your account can be approved. Review the feedback below and upload/update the requested information.'
            : "Your account is being reviewed by Craly Operations. You'll get full access to the contractor marketplace — opportunities, applying for jobs, and public listing — as soon as you're approved."}
        </p>

        <div className="ars-meta-row">
          <div className="ars-meta-item">
            <span className="ars-meta-label">Application status</span>
            <span className={`ars-status-pill ars-status-pill--${status}`}>
              {status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          <div className="ars-meta-item">
            <span className="ars-meta-label">Submitted</span>
            <span className="ars-meta-value">
              {profile.created_at ? new Date(profile.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
            </span>
          </div>
          <div className="ars-meta-item">
            <span className="ars-meta-label">Company</span>
            <span className="ars-meta-value">{profile.company_name}</span>
          </div>
        </div>

        {profile.verification_note && (
          <div className="ars-feedback-box">
            <strong>Staff feedback:</strong> {profile.verification_note}
          </div>
        )}
      </div>

      {/* Document upload — hidden once rejected; there is no re-application flow */}
      {!isRejected && (
        <div className="ars-section">
          <ContractorDocumentsSection verificationStatus={status} verificationNote={profile.verification_note} />
        </div>
      )}

      {/* Two-way message thread with Craly Operations */}
      <div className="ars-section ars-messages-card">
        <div className="ars-messages-header">
          <h3>Messages with Craly Operations</h3>
          <p>Ask questions or respond to feedback about your application. Craly staff will see your reply here.</p>
        </div>

        <div className="ars-messages-thread">
          {loadingMessages ? (
            <LoadingState label="Loading messages…" />
          ) : messages.length === 0 ? (
            <p className="ars-messages-empty">No messages yet.</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`ars-message ars-message--${m.sender_role === 'contractor' ? 'mine' : 'staff'}`}>
                <div className="ars-message-bubble">
                  <span className="ars-message-sender">{SENDER_LABELS[m.sender_role] || 'Craly'}</span>
                  <p>{m.message}</p>
                  <span className="ars-message-time">{new Date(m.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
          <div ref={threadEndRef} />
        </div>

        <form className="ars-reply-form" onSubmit={handleReply}>
          {sendError && <div className="ars-reply-error">{sendError}</div>}
          <textarea
            rows={2}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Reply to Craly Operations…"
            maxLength={2000}
          />
          <button type="submit" disabled={sending || !reply.trim()}>
            {sending ? 'Sending…' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}
