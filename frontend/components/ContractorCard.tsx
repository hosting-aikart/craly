import Link from 'next/link';
import ListedBadge from '@/components/ui/ListedBadge';
import type { ContractorListing } from '@/lib/api/contractors';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import './ContractorCard.css';

interface ContractorCardProps {
  contractor: ContractorListing;
  /**
   * Route prefix the card links into. Defaults to the public directory
   * (`/contractors`); pass `/business/contractors` when rendering inside the
   * manufacturer workspace so the profile link lands on the authenticated
   * route instead of bouncing through the public one.
   */
  basePath?: string;
}

/**
 * The directory's core unit — shown on /contractors and reused wherever
 * else contractors get listed (dashboards, saved lists) so the card never
 * has to be rebuilt per page.
 */
export default function ContractorCard({ contractor: c, basePath = '/contractors' }: ContractorCardProps) {
  const { t } = useLanguage();
  const location = [c.city, c.state].filter(Boolean).join(', ');

  return (
    <Link href={`${basePath}/${c.id}`} className="contractor-card">
      <ListedBadge compact />

      <h3 className="contractor-card__name">{c.company_name}</h3>
      {location && <p className="contractor-card__location">📍 {location}</p>}

      {c.description && <p className="contractor-card__desc">{c.description}</p>}

      {c.categories.length > 0 && (
        <div className="contractor-card__tags">
          {c.categories.slice(0, 3).map((cat) => (
            <span key={cat.id} className="contractor-card__tag">{cat.name}</span>
          ))}
          {c.categories.length > 3 && (
            <span className="contractor-card__tag contractor-card__tag--more">
              +{c.categories.length - 3}
            </span>
          )}
        </div>
      )}

      {(c.years_experience != null || c.workforce_size != null) && (
        <div className="contractor-card__stats">
          {c.years_experience != null && <span>{c.years_experience}+ {t.contractors.experienceLabel}</span>}
          {c.workforce_size != null && <span>{c.workforce_size}+ {t.contractors.workforceLabel}</span>}
        </div>
      )}

      <span className="contractor-card__cta">
        {t.contractors.viewProfile}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14" />
          <path d="M13 6l6 6-6 6" />
        </svg>
      </span>
    </Link>
  );
}
