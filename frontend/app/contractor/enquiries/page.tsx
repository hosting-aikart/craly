'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/useAuth';
import { listEnquiries, type Enquiry } from '@/lib/api/enquiries';
import EnquiryListItem from '@/components/enquiries/EnquiryListItem';
import { CONTRACTOR_TABS, matchesContractorTab, type ContractorTab } from '@/components/enquiries/enquiryStatus';
import EmptyState from '@/components/ui/EmptyState';
import LoadingState from '@/components/ui/LoadingState';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import '@/components/enquiries/Inbox.css';

export default function ContractorEnquiriesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<ContractorTab>('all');

  const tabLabels: Record<ContractorTab, string> = {
    all: t.enquiries.allTab,
    new: t.enquiries.pendingTab,
    responded: t.enquiries.respondedTab,
    closed: t.enquiries.closedTab,
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'contractor') { router.push('/business/dashboard'); return; }

    listEnquiries()
      .then(({ data }) => setEnquiries(data))
      .catch((err) => setError(err instanceof Error ? err.message : t.common.error))
      .finally(() => setLoading(false));
  }, [authLoading, user, router, t.common.error]);

  const filtered = useMemo(
    () => enquiries.filter((enq) => matchesContractorTab(enq.status, tab)),
    [enquiries, tab],
  );

  if (authLoading || loading || !user) {
    return (
      <div className="inbox-page">
        <LoadingState label={t.common.loading} />
      </div>
    );
  }

  return (
    <div className="inbox-page">
      <div className="inbox-page__inner">
        <div className="inbox-page__header">
          <p className="inbox-page__eyebrow">{t.enquiries.pageTitle.toUpperCase()}</p>
          <h1 className="inbox-page__heading">{t.enquiries.pageTitle}</h1>
        </div>

        {error ? (
          <EmptyState title={t.common.error} subtitle={error} />
        ) : enquiries.length === 0 ? (
          <EmptyState
            title={t.enquiries.emptyEnquiries}
            subtitle="When businesses contact you, their requirements will appear here."
          />
        ) : (
          <>
            <div className="inbox-page__tabs" role="tablist">
              {CONTRACTOR_TABS.map((tabKey) => (
                <button
                  key={tabKey}
                  role="tab"
                  aria-selected={tab === tabKey}
                  className={`inbox-page__tab ${tab === tabKey ? 'inbox-page__tab--active' : ''}`}
                  onClick={() => setTab(tabKey)}
                >
                  {tabLabels[tabKey]}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <EmptyState title={t.enquiries.emptyEnquiries} subtitle="" />
            ) : (
              <div className="inbox-page__list">
                {filtered.map((enq) => (
                  <EnquiryListItem
                    key={enq.id}
                    enquiry={enq}
                    viewer="contractor"
                    href={`/contractor/enquiries/${enq.id}`}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
