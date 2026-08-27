'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { listMessages, sendMessage, type EnquiryMessage, type EnquiryStatus } from '@/lib/api/enquiries';
import { relativeTime } from '@/lib/util/relativeTime';
import { useSocket } from '@/lib/socket/SocketContext';
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
  const { socket } = useSocket();
  const [messages, setMessages] = useState<EnquiryMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [contactBlockedError, setContactBlockedError] = useState(false);
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

  // Join Socket.IO enquiry room & listen for realtime messages
  useEffect(() => {
    if (!socket) return;

    socket.emit('join_enquiry_room', { enquiryId });

    const handleNewMessage = (newMsg: EnquiryMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      onMessageSent?.();
    };

    const handleMeetingCreated = () => {
      loadMessages();
    };

    socket.on('message:new', handleNewMessage);
    socket.on('meeting:created', handleMeetingCreated);

    return () => {
      socket.emit('leave_enquiry_room', { enquiryId });
      socket.off('message:new', handleNewMessage);
      socket.off('meeting:created', handleMeetingCreated);
    };
  }, [socket, enquiryId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setSending(true);
    setError('');
    setContactBlockedError(false);

    try {
      const { data: savedMsg } = await sendMessage(enquiryId, draft.trim());
      setDraft('');
      setMessages((prev) => [...prev, savedMsg]);
      onMessageSent?.();
    } catch (err: any) {
      const errMsg = err?.message || t.common.error;
      setError(errMsg);
      if (errMsg.includes('safety and privacy')) {
        setContactBlockedError(true);
      }
    } finally {
      setSending(false);
    }
  };

  const labelFor = (senderId: string) => (senderId === businessUserId ? businessName : contractorName);

  const uniqueMessages = useMemo(() => {
    const seen = new Set<string>();
    return messages.filter((m, idx) => {
      const key = m.id || `msg-${idx}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [messages]);

  return (
    <div className="conversation">
      <div className="conversation__thread" ref={listRef}>
        {loading ? (
          <LoadingState label={t.common.loading} />
        ) : uniqueMessages.length === 0 ? (
          <p className="conversation__empty">No messages yet. Start discussing your project requirements below.</p>
        ) : (
          uniqueMessages.map((m, idx) => {
            const mine = m.sender_id === viewerUserId;
            const isSystemMessage = m.message.startsWith('[System]');

            if (isSystemMessage) {
              return (
                <div key={m.id || `sys-${idx}`} style={{ margin: '16px 0', padding: '14px 18px', background: 'var(--craly-mint)', border: '1px solid var(--craly-teal)', borderRadius: '12px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontWeight: 600, color: 'var(--craly-teal-dark)', fontSize: '14px' }}>
                    {m.message}
                  </p>
                  <div style={{ fontSize: '11px', color: 'var(--craly-muted)', marginTop: '4px' }}>{relativeTime(m.created_at)}</div>
                </div>
              );
            }

            return (
              <div key={m.id || `msg-${idx}`} className={`conversation__message ${mine ? 'conversation__message--mine' : ''}`}>
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

      {['CLOSED_EXPIRED', 'DECLINED', 'COMPLETED', 'WON', 'LOST'].includes(status) ? (
        <p className="conversation__closed-note">{t.enquiries.statusClosed}</p>
      ) : (
        <form className="conversation__composer" onSubmit={handleSend}>
          <textarea
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type your message here..."
            maxLength={4000}
          />
          <Button type="submit" variant="primary" disabled={sending || !draft.trim()}>
            {sending ? t.enquiries.sendingReply : 'Send Message'}
          </Button>
        </form>
      )}

      {contactBlockedError && (
        <div style={{ marginTop: '12px', padding: '14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', color: '#991b1b', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <strong>⚠️ Contact Details Blocked</strong>
          <span>{error}</span>
        </div>
      )}

      {!contactBlockedError && error && <p className="conversation__error">{error}</p>}

      <p className="conversation__closed-note" style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '8px' }}>
        🔒 Privacy Guard: Direct contact info is restricted. Craly staff will coordinate calls and meetings on your behalf.
      </p>
    </div>
  );
}
