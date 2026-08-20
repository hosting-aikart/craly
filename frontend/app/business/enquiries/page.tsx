'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/useAuth';
import { listEnquiries, type Enquiry } from '@/lib/api/enquiries';
import EnquiryListItem from '@/components/enquiries/EnquiryListItem';
import EmptyState from '@/components/ui/EmptyState';
import LoadingState from '@/components/ui/LoadingState';
import Button from '@/components/ui/Button';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import '@/components/enquiries/Inbox.css';

export default function BusinessEnquiriesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'business') { router.push('/contractor/dashboard'); return; }

    listEnquiries()
      .then(({ data }) => setEnquiries(data))
      .catch((err) => setError(err instanceof Error ? err.message : t.common.error))
      .finally(() => setLoading(false));
  }, [authLoading, user, router, t.common.error]);

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
            subtitle={t.businessDashboard.noEnquiries}
            action={<Button href="/contractors" variant="primary" size="sm">{t.nav.contractors}</Button>}
          />
        ) : (
          <div className="inbox-page__list">
            {enquiries.map((enq) => (
              <EnquiryListItem
                key={enq.id}
                enquiry={enq}
                viewer="business"
                href={`/business/enquiries/${enq.id}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
