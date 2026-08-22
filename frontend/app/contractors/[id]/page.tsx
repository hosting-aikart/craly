'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getContractor, type ContractorDetail } from '@/lib/api/contractors';
import { useAuth } from '@/lib/auth/useAuth';
import EmptyState from '@/components/ui/EmptyState';
import LoadingState from '@/components/ui/LoadingState';
import Button from '@/components/ui/Button';
import ContractorProfileCard from '@/components/contractors/ContractorProfileCard';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import '../contractors.css';
import './profile.css';

export default function ContractorProfilePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [contractor, setContractor] = useState<ContractorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (user && id) {
      if (user.role === 'business') {
        router.replace(`/business/contractors/${id}`);
      } else if (user.role === 'admin') {
        router.replace('/admin/dashboard');
      } else {
        router.replace('/contractor/dashboard');
      }
    }
  }, [user, authLoading, id, router]);

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

  return (
    <ContractorProfileCard
      contractor={contractor}
      backHref="/contractors"
      backLabel={t.contractorDetail.backToDirectory}
      cta={
        user?.role !== 'contractor' ? (
          user?.role === 'business' ? (
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
          )
        ) : undefined
      }
    />
  );
}
