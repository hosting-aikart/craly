import Link from 'next/link';
import type { ReactNode } from 'react';
import type { ContractorDetail } from '@/lib/api/contractors';
import ListedBadge from '@/components/ui/ListedBadge';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { IconMapPin } from '@/components/ui/Icons';

interface ContractorProfileCardProps {
  contractor: ContractorDetail;
  backHref: string;
  backLabel: string;
  /** Slot for the page's call-to-action (contact button, login prompt, etc.). */
  cta?: ReactNode;
}

/**
 * Shared profile display for a single contractor. Both the public directory
 * (`/contractors/:id`) and the manufacturer workspace (`/business/contractors/:id`)
 * show the same contractor data — only the back link and the call-to-action differ
 * between those two contexts, so those are passed in as props instead of forking
 * the whole page into two copies of this markup.
 */
export default function ContractorProfileCard({ contractor, backHref, backLabel, cta }: ContractorProfileCardProps) {
  const { t } = useLanguage();
  const location = [contractor.city, contractor.state].filter(Boolean).join(', ');

  return (
    <div className="profile-page">
      <div className="profile-page__inner">
        <Link href={backHref} className="profile-page__back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M11 18l-6-6 6-6" />
          </svg>
          {backLabel}
        </Link>

        <div className="profile-card">
          <div className="profile-card__header">
            <div className="profile-card__avatar">{contractor.company_name.charAt(0).toUpperCase()}</div>
            <div>
              <ListedBadge />
              <h1 className="profile-card__name">{contractor.company_name}</h1>
              {location && <p className="profile-card__location"><IconMapPin size={13} className="inline-icon" /> {location}</p>}
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

          {cta && <div className="profile-card__cta">{cta}</div>}
        </div>
      </div>
    </div>
  );
}
