import sql from '../db/index';
import { toPgTextArrayLiteral } from './pgArray';

/**
 * The single, canonical contractor <-> requirement eligibility rule. Every
 * place that decides "can this contractor see/apply-to/be-notified-about
 * this requirement" must use one of the two builders below, so an
 * opportunity that appears in a contractor's list can always be applied
 * to, dashboard counts always agree with the list, and notifications never
 * drift from what's actually shown.
 *
 * These are deliberately loose hard filters — they only rule out clear
 * non-fits. How good a fit is (skills, exact vs nearby location, industry,
 * full vs partial capacity) is expressed by the match score in
 * contractorPortalController (calculateOpportunityMatch), not by hiding
 * the requirement.
 *
 * Eligibility requires ALL of:
 *   1. contractor.workforce_size >= MIN_WORKFORCE_COVERAGE (70%) of
 *      requirement.workers_required — the same "close to requirement"
 *      threshold the score uses; a requirement can be filled by more than
 *      one contractor.
 *   2. Location — ANY of:
 *        - contractor city and requirement city match as whole words
 *          ("Mumbai, India" ~ "mumbai", "Pune." ~ "Pune")
 *        - requirement city is one of contractor.service_areas
 *        - contractor.state == requirement.state
 *      Text is compared after lowercasing and collapsing punctuation /
 *      whitespace (see normSql).
 *   3. contractor.availability must NOT be 'NOT_AVAILABLE' or 'SUSPENDED'
 *      (contractor -> requirements direction only checks this on the
 *      notifications side, matching previous behaviour).
 *   4. If the requirement specifies experience_required (> 0), the contractor
 *      must have at least that much experience. Missing contractor
 *      experience is rejected if experience is required.
 *
 * Industry is NOT a hard filter: manpower contractors routinely supply
 * workers across industries, so an industry mismatch only lowers the score.
 *
 * A NULL/blank requirement city AND state is treated as "no location
 * constraint" — this only matters for requirements published before the
 * city/state columns existed (see migration 1788800000000).
 */

/** Minimum share of requirement.workers_required a contractor must be able to supply. */
export const MIN_WORKFORCE_COVERAGE = 0.7;

/**
 * SQL expression normalising free text for comparison: lowercase, every run
 * of non-alphanumerics collapsed to one space, trimmed.
 * "  Mumbai, India " -> "mumbai india", "pune." -> "pune".
 */
function normSql(expr: ReturnType<typeof sql>) {
  return sql`TRIM(REGEXP_REPLACE(LOWER(COALESCE(${expr}, '')), '[^a-z0-9]+', ' ', 'g'))`;
}

/** Same normalisation as normSql, for JS values. */
export function normalizeMatchText(val: string | null | undefined): string {
  return (val || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export interface MatchContractorProfile {
  workforce_size: number | null;
  industry: string | null;
  city: string | null;
  state: string | null;
  service_areas: string[] | null;
  availability: string | null;
  years_experience: number | null;
}

export interface MatchRequirement {
  workers_required: number;
  industry: string | null;
  city: string | null;
  state: string | null;
  experience_required: number | null;
}

/**
 * Splits an industry string into lowercase keywords, stripping common
 * connective words and punctuation (e.g. "Construction & Infrastructure"
 * -> ["construction", "infrastructure"]).
 */
export function extractIndustryKeywords(ind: string | null | undefined): string[] {
  if (!ind) return [];
  const stopWords = new Set(['and', '&', 'or', 'the', 'in', 'of', 'for', 'to', 'a', 'an']);
  return ind
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !stopWords.has(w));
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
  const city = normalizeMatchText(cp.city);
  const state = normalizeMatchText(cp.state);
  const yearsExperience = cp.years_experience;
  const hasExperience = yearsExperience !== null && yearsExperience !== undefined;
  // sql.array() is unreliable inside a dynamic query fragment like this one
  // (same issue documented on toPgTextArrayLiteral in pgArray.ts — it can
  // send the parameter as a plain comma-joined string instead of a proper
  // text[], producing "malformed array literal" and making the whole
  // opportunities query throw for any contractor with service_areas set).
  // Building the literal ourselves and casting it explicitly sidesteps that.
  const serviceAreasLiteral = toPgTextArrayLiteral(
    (cp.service_areas || []).flatMap((sa) => String(sa).split(',')).map(normalizeMatchText).filter(Boolean),
  );
  const reqCity = normSql(sql`mr.city`);
  const reqState = normSql(sql`mr.state`);

  return sql`(
    -- 1. Worker capacity: can supply at least MIN_WORKFORCE_COVERAGE of the headcount
    (${workforce}::numeric >= mr.workers_required * ${MIN_WORKFORCE_COVERAGE}::numeric)
    -- 2. Location: city (whole-word), service area, or same state
    AND (
      (${reqCity} = '' AND ${reqState} = '')
      OR (${reqCity} != '' AND ${city}::text != '' AND (
        (' ' || ${city}::text || ' ') LIKE ('% ' || ${reqCity} || ' %')
        OR (' ' || ${reqCity} || ' ') LIKE ('% ' || ${city}::text || ' %')
      ))
      OR (${reqCity} != '' AND ${reqCity} = ANY(${serviceAreasLiteral}::text[]))
      OR (${reqState} != '' AND ${state}::text != '' AND ${reqState} = ${state}::text)
    )
    -- 3. Experience hard requirement: contractor must meet or exceed required experience
    AND (
      mr.experience_required IS NULL OR mr.experience_required <= 0
      OR (${hasExperience} AND ${yearsExperience ?? 0} >= mr.experience_required)
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
  const city = normalizeMatchText(mr.city);
  const state = normalizeMatchText(mr.state);
  const experienceRequired = mr.experience_required ?? 0;
  const conCity = normSql(sql`cp.city`);
  const conState = normSql(sql`cp.state`);

  return sql`(
    -- 1. Worker capacity: can supply at least MIN_WORKFORCE_COVERAGE of the headcount
    cp.workforce_size IS NOT NULL
    AND cp.workforce_size >= ${workersRequired}::numeric * ${MIN_WORKFORCE_COVERAGE}::numeric
    -- 2. Location: city (whole-word), service area, or same state
    AND (
      (${city}::text = '' AND ${state}::text = '')
      OR (${city}::text != '' AND ${conCity} != '' AND (
        (' ' || ${conCity} || ' ') LIKE ('% ' || ${city}::text || ' %')
        OR (' ' || ${city}::text || ' ') LIKE ('% ' || ${conCity} || ' %')
      ))
      OR (${city}::text != '' AND EXISTS (
        SELECT 1
        FROM unnest(COALESCE(cp.service_areas, ARRAY[]::text[])) sa_raw,
             unnest(string_to_array(sa_raw, ',')) sa
        WHERE ${normSql(sql`sa`)} = ${city}::text
      ))
      OR (${state}::text != '' AND ${conState} != '' AND ${conState} = ${state}::text)
    )
    -- 3. Availability: don't match contractors who can't take work
    AND (
      cp.availability IS NULL
      OR cp.availability NOT IN ('NOT_AVAILABLE', 'SUSPENDED')
    )
    -- 4. Experience hard requirement: contractor must meet or exceed required experience
    AND (
      ${experienceRequired} <= 0
      OR (cp.years_experience IS NOT NULL AND cp.years_experience >= ${experienceRequired})
    )
  )`;
}
