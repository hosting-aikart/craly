'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getContractor, type ContractorDetail } from '@/lib/api/contractors';
import EmptyState from '@/components/ui/EmptyState';
import LoadingState from '@/components/ui/LoadingState';
import Button from '@/components/ui/Button';
import ContractorProfileCard from '@/components/contractors/ContractorProfileCard';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import '@/app/contractors/contractors.css';
import '@/app/contractors/[id]/profile.css';

/**
 * Manufacturer-facing contractor profile. Reached from the workspace
 * directory at /business/contractors — auth + role gating is already
 * handled by app/business/layout.tsx, so this page only needs to load the
 * contractor and render the shared profile display with the
 * manufacturer-appropriate CTA (contact form, no public login prompt).
 */
export default function BusinessContractorProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
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
          action={<Button href="/business/contractors" variant="secondary" size="sm">{t.contractorDetail.backToDirectory}</Button>}
        />
      </div>
    );
  }

  return (
    <>
      <WorkspacePageHeader title={contractor.company_name} subtitle={t.contractorDetail.companyInfoTitle} />
      <ContractorProfileCard
        contractor={contractor}
        backHref="/business/contractors"
        backLabel={t.contractorDetail.backToDirectory}
        cta={
          <>
            <Button href={`/business/contractors/${contractor.id}/contact`} variant="primary">
              {t.contractorDetail.contactBtn}
            </Button>
            <p className="profile-card__cta-note">
              {t.contractorDetail.contactModalSub}
            </p>
          </>
        }
      />
    </>
  );
}
