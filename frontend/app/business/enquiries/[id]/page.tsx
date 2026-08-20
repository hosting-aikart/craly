'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/useAuth';
import { getEnquiry, closeEnquiry, type EnquiryDetail } from '@/lib/api/enquiries';
import { formatDate } from '@/lib/util/date';
import StatusPill from '@/components/enquiries/StatusPill';
import Conversation from '@/components/enquiries/Conversation';
import EmptyState from '@/components/ui/EmptyState';
import LoadingState from '@/components/ui/LoadingState';
import Button from '@/components/ui/Button';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import '@/components/enquiries/EnquiryDetail.css';

export default function BusinessEnquiryDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();

  const [enquiry, setEnquiry] = useState<EnquiryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [closing, setClosing] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    getEnquiry(id)
      .then(({ data }) => setEnquiry(data))
      .catch((err) => setError(err instanceof Error ? err.message : t.common.error))
      .finally(() => setLoading(false));
  }, [id, t.common.error]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'business') { router.push('/contractor/dashboard'); return; }
    load();
  }, [authLoading, user, router, load]);

  const handleClose = async () => {
    setClosing(true);
    try {
      await closeEnquiry(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setClosing(false);
    }
  };

  if (authLoading || loading || !user) {
    return (
      <div className="enquiry-detail-page">
        <LoadingState label={t.common.loading} />
      </div>
    );
  }

  if (error || !enquiry) {
    return (
      <div className="enquiry-detail-page">
        <EmptyState
          title={t.enquiries.emptyEnquiries}
          subtitle={error || ''}
          action={<Button href="/business/enquiries" variant="secondary" size="sm">{t.common.back}</Button>}
        />
      </div>
    );
  }

  return (
    <div className="enquiry-detail-page">
      <div className="enquiry-detail-page__inner">
        <Link href="/business/enquiries" className="enquiry-detail-page__back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M11 18l-6-6 6-6" />
          </svg>
          {t.common.back}
        </Link>

        <div className="enquiry-detail-card">
          <div className="enquiry-detail-card__header">
            <div>
              <p>{t.auth.contractorRoleTitle.toUpperCase()}</p>
              <h1>{enquiry.contractor_name}</h1>
            </div>
            <StatusPill status={enquiry.status} viewer="business" />
          </div>

          <div className="enquiry-detail-card__grid">
            {enquiry.category_name && (
              <div className="enquiry-detail-card__field">
                <span>{t.contractors.filterCategory}</span>
                <strong>{enquiry.category_name}</strong>
              </div>
            )}
            {enquiry.workers_required != null && (
              <div className="enquiry-detail-card__field">
                <span>{t.contractors.workforceLabel}</span>
                <strong>{enquiry.workers_required}</strong>
              </div>
            )}
            {enquiry.location && (
              <div className="enquiry-detail-card__field">
                <span>{t.contractors.filterState}</span>
                <strong>{enquiry.location}</strong>
              </div>
            )}
            {enquiry.start_date && (
              <div className="enquiry-detail-card__field">
                <span>{t.enquiries.date}</span>
                <strong>{formatDate(enquiry.start_date)}</strong>
              </div>
            )}
            {enquiry.duration && (
              <div className="enquiry-detail-card__field">
                <span>{t.contractors.experienceLabel}</span>
                <strong>{enquiry.duration}</strong>
              </div>
            )}
          </div>

          <p className="enquiry-detail-card__desc-label">{t.contractorDetail.messageLabel}</p>
          <p className="enquiry-detail-card__desc">{enquiry.message}</p>

          {enquiry.status !== 'closed' && (
            <div className="enquiry-detail-card__actions">
              <Button variant="secondary" size="sm" onClick={handleClose} disabled={closing}>
                {closing ? t.common.loading : t.enquiries.closedTab}
              </Button>
            </div>
          )}
        </div>

        <div className="conversation-card">
          <h2>{t.enquiries.messageHistory}</h2>
          <Conversation
            enquiryId={enquiry.id}
            viewerUserId={user.id}
            businessUserId={enquiry.business_user_id}
            contractorUserId={enquiry.contractor_user_id}
            businessName={enquiry.business_name}
            contractorName={enquiry.contractor_name}
            status={enquiry.status}
            onMessageSent={load}
          />
        </div>
      </div>
    </div>
  );
}
