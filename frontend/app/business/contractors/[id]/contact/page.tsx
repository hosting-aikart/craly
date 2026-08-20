'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/useAuth';
import { getContractor, type ContractorDetail } from '@/lib/api/contractors';
import { createEnquiry } from '@/lib/api/enquiries';
import EmptyState from '@/components/ui/EmptyState';
import LoadingState from '@/components/ui/LoadingState';
import Button from '@/components/ui/Button';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import '@/components/AuthForm.css';
import './contact.css';

export default function ContactContractorPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();

  const [contractor, setContractor] = useState<ContractorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [categoryId, setCategoryId] = useState('');
  const [location, setLocation] = useState('');
  const [workersRequired, setWorkersRequired] = useState('');
  const [startDate, setStartDate] = useState('');
  const [duration, setDuration] = useState('');
  const [message, setMessage] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'business') { router.push('/contractor/dashboard'); return; }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!id) return;
    getContractor(id)
      .then(({ data }) => setContractor(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await createEnquiry({
        contractorId: id,
        categoryId: categoryId ? Number(categoryId) : undefined,
        location: location || undefined,
        workersRequired: workersRequired ? Number(workersRequired) : undefined,
        startDate: startDate || undefined,
        duration: duration || undefined,
        message,
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading || !user) {
    return (
      <div className="contact-page">
        <LoadingState label={t.common.loading} />
      </div>
    );
  }

  if (notFound || !contractor) {
    return (
      <div className="contact-page">
        <EmptyState
          title={t.contractors.noResultsTitle}
          subtitle={t.contractors.noResultsDesc}
          action={<Button href="/contractors" variant="secondary" size="sm">{t.contractorDetail.backToDirectory}</Button>}
        />
      </div>
    );
  }

  if (sent) {
    return (
      <div className="contact-page">
        <div className="contact-success">
          <div className="contact-success__icon">✓</div>
          <h1>{t.contractorDetail.enquirySentSuccess}</h1>
          <p>
            {contractor.company_name} — {t.contractorDetail.contactModalSub}
          </p>
          <div className="contact-success__actions">
            <Button href="/business/enquiries" variant="primary">{t.businessDashboard.viewAllEnquiries}</Button>
            <Button href={`/contractors/${contractor.id}`} variant="secondary">{t.contractors.viewProfile}</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="contact-page">
      <div className="contact-page__inner">
        <Link href={`/contractors/${contractor.id}`} className="contact-page__back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M11 18l-6-6 6-6" />
          </svg>
          {t.contractorDetail.backToDirectory}
        </Link>

        <p className="contact-page__eyebrow">{t.contractorDetail.contactModalTitle.toUpperCase()}</p>
        <h1 className="contact-page__heading">{t.contractorDetail.contactModalTitle}</h1>
        <p className="contact-page__subtext">
          {t.contractorDetail.contactModalSub}
        </p>

        <form className="auth-form contact-form" onSubmit={handleSubmit}>
          {contractor.categories.length > 0 && (
            <label className="auth-field">
              <span>{t.contractors.filterCategory}</span>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">{t.contractors.allCategories}</option>
                {contractor.categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
          )}

          <div className="auth-row">
            <label className="auth-field">
              <span>{t.contractors.filterState}</span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Amravati, Maharashtra"
              />
            </label>
            <label className="auth-field">
              <span>{t.contractors.workforceLabel}</span>
              <input
                type="number"
                min={1}
                value={workersRequired}
                onChange={(e) => setWorkersRequired(e.target.value)}
                placeholder="e.g. 50"
              />
            </label>
          </div>

          <div className="auth-row">
            <label className="auth-field">
              <span>{t.enquiries.date}</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label className="auth-field">
              <span>{t.contractors.experienceLabel}</span>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 6 months"
              />
            </label>
          </div>

          <label className="auth-field">
            <span>{t.contractorDetail.messageLabel}</span>
            <textarea
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your requirement…"
            />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? t.contractorDetail.sendingBtn : t.contractorDetail.sendBtn}
          </button>
        </form>
      </div>
    </div>
  );
}
