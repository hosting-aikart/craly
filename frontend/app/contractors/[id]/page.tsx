'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getContractor, type ContractorDetail } from '@/lib/api/contractors';
import { useAuth } from '@/lib/auth/useAuth';
import ListedBadge from '@/components/ui/ListedBadge';
import EmptyState from '@/components/ui/EmptyState';
import LoadingState from '@/components/ui/LoadingState';
import Button from '@/components/ui/Button';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import '../contractors.css';
import './profile.css';

export default function ContractorProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const { user } = useAuth();
  const { t } = useLanguage();
  const [contractor, setContractor] = useState<ContractorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);

    getContractor(id)
      .then(({ data }) => setContractor(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="directory">
        <LoadingState label={t.common.loading} />
      </div>
    );
  }

  if (notFound || !contractor) {
    return (
      <div className="directory">
        <EmptyState
          title={t.contractors.noResultsTitle}
          subtitle={t.contractors.noResultsDesc}
          action={<Button href="/contractors" variant="secondary" size="sm">{t.contractorDetail.backToDirectory}</Button>}
        />
      </div>
    );
  }

  const location = [contractor.city, contractor.state].filter(Boolean).join(', ');

  return (
    <div className="profile-page">
      <div className="profile-page__inner">
        <Link href="/contractors" className="profile-page__back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M11 18l-6-6 6-6" />
          </svg>
          {t.contractorDetail.backToDirectory}
        </Link>

        <div className="profile-card">
          <div className="profile-card__header">
            <div className="profile-card__avatar">{contractor.company_name.charAt(0).toUpperCase()}</div>
            <div>
              <ListedBadge />
              <h1 className="profile-card__name">{contractor.company_name}</h1>
              {location && <p className="profile-card__location">📍 {location}</p>}
            </div>
          </div>

          {contractor.categories.length > 0 && (
            <div className="profile-card__section">
              <h3>{t.onboarding.categories}</h3>
              <div className="profile-card__tags">
                {contractor.categories.map((c) => (
                  <span key={c.id} className="profile-card__tag">{c.name}</span>
                ))}
              </div>
            </div>
          )}

          {contractor.description && (
            <div className="profile-card__section">
              <h3>{t.contractorDetail.companyInfoTitle}</h3>
              <p className="profile-card__desc">{contractor.description}</p>
            </div>
          )}

          {(contractor.years_experience != null || contractor.workforce_size != null) && (
            <div className="profile-card__section">
              <h3>{t.contractorDetail.workforceTitle}</h3>
              <div className="profile-card__stats">
                {contractor.years_experience != null && (
                  <div className="profile-card__stat">
                    <strong>{contractor.years_experience}+</strong>
                    <span>{t.contractors.experienceLabel}</span>
                  </div>
                )}
                {contractor.workforce_size != null && (
                  <div className="profile-card__stat">
                    <strong>{contractor.workforce_size}+</strong>
                    <span>{t.contractors.workforceLabel}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {user?.role !== 'contractor' && (
            <div className="profile-card__cta">
              {user?.role === 'business' ? (
                <>
                  <Button href={`/business/contractors/${contractor.id}/contact`} variant="primary">
                    {t.contractorDetail.contactBtn}
                  </Button>
                  <p className="profile-card__cta-note">
                    {t.contractorDetail.contactModalSub}
                  </p>
                </>
              ) : (
                <>
                  <Button href="/login" variant="primary">{t.auth.logInTitle}</Button>
                  <p className="profile-card__cta-note">
                    {t.contractorDetail.contactModalSub}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
