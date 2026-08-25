'use client';

import { useEffect, useState, useMemo } from 'react';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { listEnquiries, type Enquiry } from '@/lib/api/enquiries';
import EnquiryListItem from '@/components/enquiries/EnquiryListItem';
import EmptyState from '@/components/ui/EmptyState';
import LoadingState from '@/components/ui/LoadingState';
import Button from '@/components/ui/Button';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import '@/components/enquiries/Inbox.css';

type BusinessEnquiryTab = 'all' | 'pending' | 'accepted' | 'declined' | 'closed';

export default function BusinessEnquiriesPage() {
  const { t } = useLanguage();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<BusinessEnquiryTab>('all');

  useEffect(() => {
    listEnquiries()
      .then(({ data }) => setEnquiries(data))
      .catch((err) => setError(err instanceof Error ? err.message : t.common.error))
      .finally(() => setLoading(false));
  }, [t.common.error]);

  const filteredEnquiries = useMemo(() => {
    return enquiries.filter((e) => {
      const st = String(e.status).toUpperCase();
      if (tab === 'all') return true;
      if (tab === 'pending') return st === 'NEW' || st === 'UNDER_REVIEW';
      if (tab === 'accepted') return st === 'BROKERING' || st === 'CONTACTED' || st === 'IN_PROGRESS';
      if (tab === 'declined') return st === 'DECLINED';
      if (tab === 'closed') return st === 'CLOSED_EXPIRED' || st === 'COMPLETED' || st === 'WON' || st === 'LOST';
      return true;
    });
  }, [enquiries, tab]);

  const tabLabels: Record<BusinessEnquiryTab, string> = {
    all: t.enquiries.tabs.all,
    pending: t.enquiries.tabs.pending,
    accepted: t.enquiries.tabs.accepted,
    declined: t.enquiries.tabs.declined,
    closed: t.enquiries.tabs.closed,
  };

  return (
    <>
      <WorkspacePageHeader
        title={t.enquiries.pageTitle}
        subtitle={t.enquiries.businessSubtitle}
      />
      <div className="inbox-page__tabs" role="tablist" style={{ marginBottom: '20px' }}>
        {(['all', 'pending', 'accepted', 'declined', 'closed'] as BusinessEnquiryTab[]).map((tabKey) => (
          <button
            key={tabKey}
            type="button"
            className={`inbox-page__tab ${tab === tabKey ? 'inbox-page__tab--active' : ''}`}
            onClick={() => setTab(tabKey)}
          >
            {tabLabels[tabKey]}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState label={t.common.loading} />
      ) : error ? (
        <EmptyState title={t.common.error} subtitle={error} />
      ) : enquiries.length === 0 ? (
        <EmptyState
          title={t.enquiries.emptyEnquiries}
          subtitle={t.enquiries.businessSubtitle}
          action={<Button href="/business/requirements" variant="primary" size="sm">{t.nav.findContractors}</Button>}
        />
      ) : filteredEnquiries.length === 0 ? (
        <EmptyState title={t.enquiries.emptyEnquiries} subtitle="" />
      ) : (
        <div className="inbox-page__list">
          {filteredEnquiries.map((enq) => (
            <EnquiryListItem
              key={enq.id}
              enquiry={enq}
              viewer="business"
              href={`/business/enquiries/${enq.id}`}
            />
          ))}
        </div>
      )}
    </>
  );
}
