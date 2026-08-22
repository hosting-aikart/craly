'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { apiGet } from '@/lib/api';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { formatDate } from '@/lib/util/date';

interface Meeting {
  id: string;
  enquiry_id: string;
  title: string;
  scheduled_start: string;
  scheduled_end: string;
  google_meet_url: string | null;
  status: string;
  other_party_name: string;
  category_name?: string;
}

export default function BusinessMeetingsPage() {
  const { t } = useLanguage();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    apiGet<{ data: Meeting[] }>('/meetings')
      .then(({ data }) => setMeetings(data))
      .catch(() => setMeetings([]))
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const upcomingMeetings = meetings.filter((m) => new Date(m.scheduled_start) >= now);
  const pastMeetings = meetings.filter((m) => new Date(m.scheduled_start) < now);

  const displayedMeetings = tab === 'upcoming' ? upcomingMeetings : pastMeetings;

  return (
    <>
      <WorkspacePageHeader
        title={t.nav.meetings}
        subtitle=""
      />
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--craly-border)', paddingBottom: '12px' }}>
        <button
          type="button"
          className={`btn ${tab === 'upcoming' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setTab('upcoming')}
        >
          {t.nav.meetings} ({upcomingMeetings.length})
        </button>
        <button
          type="button"
          className={`btn ${tab === 'past' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setTab('past')}
        >
          {t.nav.meetings} ({pastMeetings.length})
        </button>
      </div>

      {loading ? (
        <LoadingState label={t.common.loading} />
      ) : displayedMeetings.length === 0 ? (
        <EmptyState
          title={t.nav.meetings}
          subtitle=""
          action={<Button href="/business/inbox" variant="primary">{t.nav.inbox}</Button>}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {displayedMeetings.map((m) => {
            const startDate = new Date(m.scheduled_start);
            const endDate = new Date(m.scheduled_end);
            const formattedTime = `${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

            return (
              <div
                key={m.id}
                style={{
                  background: 'var(--craly-white)',
                  border: '1px solid var(--craly-border)',
                  borderRadius: '16px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '17px', color: 'var(--craly-navy)' }}>{m.title}</h3>
                    <span style={{ fontSize: '13px', color: 'var(--craly-muted)', fontWeight: 600 }}>
                      With {m.other_party_name}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: 'var(--craly-mint)', color: 'var(--craly-teal-dark)' }}>
                    Google Meet
                  </span>
                </div>

                <div style={{ padding: '12px', background: 'var(--craly-off-white)', borderRadius: '10px', fontSize: '13px', color: 'var(--craly-navy)' }}>
                  📅 <strong>{formatDate(m.scheduled_start)}</strong>
                  <br />
                  ⏰ {formattedTime}
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  {m.google_meet_url && tab === 'upcoming' && (
                    <a
                      href={m.google_meet_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn--primary btn--sm"
                      style={{ flex: 1, textDecoration: 'none', textAlign: 'center' }}
                    >
                      📹 Join Meeting
                    </a>
                  )}
                  <Link
                    href={`/business/inbox`}
                    className="btn btn--ghost btn--sm"
                    style={{ flex: 1, textDecoration: 'none', textAlign: 'center' }}
                  >
                    Open Inbox
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
