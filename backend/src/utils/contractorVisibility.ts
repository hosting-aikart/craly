import sql from '../db/index';

/**
 * Single source of truth for "is this contractor discoverable by
 * manufacturers/the public" — reused by every path where a business or
 * anonymous visitor can find or open a contractor (directory listing,
 * single profile view, and enquiry intake), so the rule can't drift
 * between them.
 *
 * A contractor must have finished onboarding AND not be SUSPENDED.
 * Suspending a contractor never deletes or alters their record — it only
 * removes them from this condition, so their enquiries/ratings/jobs/audit
 * logs/verification stay intact and internal staff (pfContractorController,
 * the generic admin controller) keep querying `contractor_profiles`
 * directly, unfiltered, since Ops Head/Field Staff must still be able to
 * see and manage suspended contractors.
 *
 * Every query using this fragment must alias `contractor_profiles` as `cp`.
 */
export const PUBLICLY_DISCOVERABLE_CONDITION = sql`(cp.onboarding_complete = true AND cp.availability <> 'SUSPENDED')`;
