import type { ContractorProfile } from '@/lib/api/profile';

export interface ProfileChecklistItem {
  label: string;
  detail: string;
  complete: boolean;
}

export interface ProfileCompletion {
  percent: number;
  items: ProfileChecklistItem[];
}

/**
 * Single source of truth for "how complete is this contractor's profile" —
 * used by both the dashboard and the profile page so the percentage shown
 * never disagrees between screens. Deliberately checks the same fields the
 * backend matching query (contractorPortalController.getOpportunities) and
 * KYC review actually use — industry/skills/location/workforce/service
 * areas are exactly what determines whether an opportunity ever matches, so
 * "profile complete" here means "eligible for real matching," not a vanity
 * number.
 */
export function computeProfileCompletion(profile: ContractorProfile): ProfileCompletion {
  const hasSkills = Array.isArray(profile.skills) && profile.skills.length > 0;
  const hasServiceAreas = Array.isArray(profile.service_areas) && profile.service_areas.length > 0;

  const items: ProfileChecklistItem[] = [
    {
      label: 'Company name',
      detail: profile.company_name || 'Not set',
      complete: Boolean(profile.company_name?.trim()),
    },
    {
      label: 'Industry',
      detail: profile.industry || 'Not declared',
      complete: Boolean(profile.industry?.trim()),
    },
    {
      label: 'Workforce size',
      detail: profile.workforce_size != null ? `${profile.workforce_size} workers` : 'Not declared',
      complete: profile.workforce_size != null && profile.workforce_size > 0,
    },
    {
      label: 'Base location',
      detail: [profile.city, profile.state].filter(Boolean).join(', ') || 'Not declared',
      complete: Boolean(profile.city?.trim() && profile.state?.trim()),
    },
    {
      label: 'Skills declared',
      detail: hasSkills ? `${profile.skills!.length} skill(s)` : 'None declared',
      complete: hasSkills,
    },
    {
      label: 'Service areas / coverage',
      detail: hasServiceAreas ? `${profile.service_areas!.length} area(s)` : 'None declared',
      complete: hasServiceAreas,
    },
    {
      label: 'Contact phone',
      detail: profile.phone || 'Not set',
      complete: Boolean(profile.phone?.trim()),
    },
  ];

  const completeCount = items.filter((i) => i.complete).length;
  const percent = Math.round((completeCount / items.length) * 100);

  return { percent, items };
}
