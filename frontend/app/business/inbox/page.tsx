'use client';

import { useEffect, useState } from 'react';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import Conversation from '@/components/enquiries/Conversation';
import { listEnquiries, type EnquiryDetail } from '@/lib/api/enquiries';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { relativeTime } from '@/lib/util/relativeTime';
import '@/components/enquiries/Inbox.css';

export default function BusinessInboxPage() {
  const { t } = useLanguage();
  const [acceptedEnquiries, setAcceptedEnquiries] = useState<EnquiryDetail[]>([]);
  const [selectedEnquiry, setSelectedEnquiry] = useState<EnquiryDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const loadInbox = () => {
    listEnquiries()
      .then(({ data }) => {
        // Inbox strictly shows enquiries actively being brokered.
        const accepted = (data as EnquiryDetail[]).filter((e) => {
          const st = String(e.status).toUpperCase();
          return st === 'BROKERING' || st === 'CONTACTED' || st === 'IN_PROGRESS';
        });
        setAcceptedEnquiries(accepted);
        if (accepted.length > 0 && (!selectedEnquiry || !accepted.some((x) => x.id === selectedEnquiry.id))) {
          setSelectedEnquiry(accepted[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadInbox();
  }, []);

  return (
    <>
      <WorkspacePageHeader
        title={t.nav.inbox}
        subtitle={t.enquiries.pageSubtitle}
      />
      {loading ? (
        <LoadingState label={t.common.loading} />
      ) : acceptedEnquiries.length === 0 ? (
        <EmptyState
          title={t.enquiries.emptyEnquiries}
          subtitle=""
          action={<Button href="/business/enquiries" variant="primary">{t.nav.enquiries}</Button>}
        />
      ) : (
        <div className="inbox-workspace" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px', minHeight: '600px' }}>
          {/* Left Column: Conversations List */}
          <div className="inbox-sidebar" style={{ background: 'var(--craly-white)', border: '1px solid var(--craly-border)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: 'var(--craly-navy)' }}>{t.nav.inbox}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
              {acceptedEnquiries.map((e) => {
                const isSelected = selectedEnquiry?.id === e.id;
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setSelectedEnquiry(e)}
                    style={{
                      textAlign: 'left',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: isSelected ? '1px solid var(--craly-teal)' : '1px solid var(--craly-border)',
                      background: isSelected ? 'var(--craly-mint)' : 'var(--craly-white)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '14px', color: 'var(--craly-navy)' }}>{e.other_party_name}</strong>
                      {e.has_unread && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--craly-teal)' }} />}
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--craly-muted)' }}>
                      {e.category_name || 'Labour Supply'} {e.workers_required ? `• ${e.workers_required} workers` : ''}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--craly-muted)', opacity: 0.8 }}>
                      {relativeTime(e.updated_at)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Active Conversation View */}
          {selectedEnquiry && (
            <div className="inbox-chat-view" style={{ background: 'var(--craly-white)', border: '1px solid var(--craly-border)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--craly-border)', paddingBottom: '16px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--craly-navy)' }}>{selectedEnquiry.other_party_name}</h2>
                  <span style={{ fontSize: '13px', color: 'var(--craly-muted)' }}>
                    {selectedEnquiry.category_name || 'Labour Supply'} {selectedEnquiry.workers_required ? `• ${selectedEnquiry.workers_required} workers` : ''} {selectedEnquiry.location ? `in ${selectedEnquiry.location}` : ''}
                  </span>
                </div>
              </div>

              <Conversation
                enquiryId={selectedEnquiry.id}
                viewerUserId=""
                businessUserId={selectedEnquiry.business_user_id || ''}
                contractorUserId={selectedEnquiry.contractor_user_id || ''}
                businessName={selectedEnquiry.business_name || selectedEnquiry.other_party_name || 'Business'}
                contractorName={selectedEnquiry.contractor_name || selectedEnquiry.other_party_name || 'Contractor'}
                status={selectedEnquiry.status}
                onMessageSent={loadInbox}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}
