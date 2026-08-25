import sql from '../db/index';

/**
 * The single, canonical contractor <-> requirement eligibility rule. Every
 * place that decides "can this contractor see/apply-to/be-notified-about
 * this requirement" must use one of the two builders below, so an
 * opportunity that appears in a contractor's list can always be applied
 * to, dashboard counts always agree with the list, and notifications never
 * drift from what's actually shown.
 *
 * Eligibility requires ALL of:
 *   1. contractor.workforce_size >= requirement.workers_required
 *   2. industry matches (blank requirement industry = no constraint)
 *   3. contractor.years_experience >= requirement.experience_required
 *      (blank requirement experience_required = no constraint)
 *   4. contractor.availability = 'AVAILABLE'
 *   5. contractor.state == requirement.state (exact match, case/whitespace
 *      insensitive) — state alone is never sufficient on its own.
 *   6. AND contractor.city == requirement.city, OR requirement.city is one
 *      of contractor.service_areas (exact match, case/whitespace
 *      insensitive).
 *
 * A NULL/blank requirement city or state is treated as "no constraint" —
 * this only matters for requirements published before the city/state
 * columns existed (see migration 1788800000000) so old records don't
 * silently become permanently unmatchable.
 */

export interface MatchContractorProfile {
  workforce_size: number | null;
  industry: string | null;
  years_experience: number | null;
  availability: string | null;
  city: string | null;
  state: string | null;
  service_areas: string[] | null;
}

export interface MatchRequirement {
  workers_required: number;
  industry: string | null;
  experience_required: number | null;
  city: string | null;
  state: string | null;
}

/**
 * Builds the WHERE-clause fragment for querying `manpower_requirements`
 * rows (must be aliased `mr` in the surrounding query) against a single,
 * already-known contractor profile supplied as plain JS values. Used by
 * getOpportunities, getOpportunityById, applyToOpportunity, and
 * getDashboardStats in contractorPortalController.ts.
 */
export function requirementEligibilityCondition(cp: MatchContractorProfile) {
  const workforce = cp.workforce_size ?? 0;
  const industry = cp.industry || '';
  const experience = cp.years_experience ?? 0;
  const availability = cp.availability || '';
  const city = cp.city || '';
  const state = cp.state || '';
  const serviceAreas = cp.service_areas || [];

  return sql`(
    -- 1. Worker capacity
    (${workforce} >= mr.workers_required)
    -- 2. Industry
    AND (
      mr.industry IS NULL OR TRIM(mr.industry) = ''
      OR (${industry} != '' AND LOWER(TRIM(${industry})) = LOWER(TRIM(mr.industry)))
    )
    -- 3. Experience
    AND (
      mr.experience_required IS NULL OR ${experience} >= mr.experience_required
    )
    -- 4. Availability
    AND (${availability} = 'AVAILABLE')
    -- 5. State must match exactly
    AND (
      mr.state IS NULL OR TRIM(mr.state) = ''
      OR (${state} != '' AND LOWER(TRIM(${state})) = LOWER(TRIM(mr.state)))
    )
    -- 6. City must match exactly, OR requirement city is a covered service area
    AND (
      mr.city IS NULL OR TRIM(mr.city) = ''
      OR (${city} != '' AND LOWER(TRIM(${city})) = LOWER(TRIM(mr.city)))
      OR EXISTS (
        SELECT 1 FROM unnest(${sql.array(serviceAreas)}::text[]) sa
        WHERE LOWER(TRIM(sa)) = LOWER(TRIM(mr.city))
      )
    )
  )`;
}

/**
 * Builds the WHERE-clause fragment for querying `contractor_profiles` rows
 * (must be aliased `cp` in the surrounding query) against a single,
 * already-known requirement supplied as plain JS values. Used by
 * notifyMatchingContractors in notifications.ts. Logically identical to
 * requirementEligibilityCondition above, just with the roles of "SQL
 * column" and "JS parameter" swapped.
 */
export function contractorEligibilityCondition(mr: MatchRequirement) {
  const workersRequired = mr.workers_required;
  const industry = mr.industry || '';
  const experienceRequired = mr.experience_required ?? null;
  const city = mr.city || '';
  const state = mr.state || '';

  return sql`(
    -- 1. Worker capacity
    cp.workforce_size IS NOT NULL
    AND cp.workforce_size >= ${workersRequired}
    -- 2. Industry
    AND (
      ${industry} = ''
      OR (cp.industry IS NOT NULL AND TRIM(cp.industry) != '' AND LOWER(TRIM(cp.industry)) = LOWER(TRIM(${industry})))
    )
    -- 3. Experience
    AND (
      ${experienceRequired}::int IS NULL
      OR COALESCE(cp.years_experience, 0) >= ${experienceRequired}::int
    )
    -- 4. Availability
    AND cp.availability = 'AVAILABLE'
    -- 5. State must match exactly
    AND (
      ${state} = ''
      OR (cp.state IS NOT NULL AND TRIM(cp.state) != '' AND LOWER(TRIM(cp.state)) = LOWER(TRIM(${state})))
    )
    -- 6. City must match exactly, OR requirement city is a covered service area
    AND (
      ${city} = ''
      OR (cp.city IS NOT NULL AND TRIM(cp.city) != '' AND LOWER(TRIM(cp.city)) = LOWER(TRIM(${city})))
      OR EXISTS (
        SELECT 1 FROM unnest(COALESCE(cp.service_areas, ARRAY[]::text[])) sa
        WHERE LOWER(TRIM(sa)) = LOWER(TRIM(${city}))
      )
    )
  )`;
}
