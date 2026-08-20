'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { listMessages, sendMessage, type EnquiryMessage, type EnquiryStatus } from '@/lib/api/enquiries';
import { relativeTime } from '@/lib/util/relativeTime';
import LoadingState from '@/components/ui/LoadingState';
import Button from '@/components/ui/Button';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import './Conversation.css';

interface ConversationProps {
  enquiryId: string;
  viewerUserId: string;
  businessUserId: string;
  contractorUserId: string;
  businessName: string;
  contractorName: string;
  status: EnquiryStatus;
  /** Called after a message is sent, so the parent can refresh the enquiry's status pill. */
  onMessageSent?: () => void;
}

export default function Conversation({
  enquiryId,
  viewerUserId,
  businessUserId,
  contractorUserId,
  businessName,
  contractorName,
  status,
  onMessageSent,
}: ConversationProps) {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<EnquiryMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const loadMessages = () => {
    setLoading(true);
    listMessages(enquiryId)
      .then(({ data }) => setMessages(data))
      .catch((err) => setError(err instanceof Error ? err.message : t.common.error))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enquiryId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setSending(true);
    setError('');

    try {
      await sendMessage(enquiryId, draft.trim());
      setDraft('');
      loadMessages();
      onMessageSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setSending(false);
    }
  };

  const labelFor = (senderId: string) => (senderId === businessUserId ? businessName : contractorName);

  return (
    <div className="conversation">
      <div className="conversation__thread" ref={listRef}>
        {loading ? (
          <LoadingState label={t.common.loading} />
        ) : messages.length === 0 ? (
          <p className="conversation__empty">{t.enquiries.emptyEnquiries}</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === viewerUserId;
            return (
              <div key={m.id} className={`conversation__message ${mine ? 'conversation__message--mine' : ''}`}>
                <div className="conversation__message-meta">
                  <span>{labelFor(m.sender_id)}</span>
                  <span>{relativeTime(m.created_at)}</span>
                </div>
                <p className="conversation__message-text">{m.message}</p>
              </div>
            );
          })
        )}
      </div>

      {status === 'closed' ? (
        <p className="conversation__closed-note">{t.enquiries.statusClosed}</p>
      ) : (
        <form className="conversation__composer" onSubmit={handleSend}>
          <textarea
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t.enquiries.typeReplyPlaceholder}
            maxLength={4000}
          />
          <Button type="submit" variant="primary" disabled={sending || !draft.trim()}>
            {sending ? t.enquiries.sendingReply : t.enquiries.sendReplyBtn}
          </Button>
        </form>
      )}

      <p className="conversation__closed-note" style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '8px' }}>
        🔒 Privacy Guard: Phone numbers, emails, and web links are automatically hidden for trust & platform safety. Keep all discussions on Craly.
      </p>

      {error && <p className="conversation__error">{error}</p>}
    </div>
  );
}
