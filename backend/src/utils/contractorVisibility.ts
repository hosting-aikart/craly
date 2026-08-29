import sql from '../db/index';

/**
 * Single source of truth for "is this contractor discoverable by
 * manufacturers/the public" — reused by every path where a business or
 * anonymous visitor can find or open a contractor (directory listing,
 * single profile view, and enquiry intake), so the rule can't drift
 * between them.
 *
 * A contractor must have finished onboarding, be staff-approved
 * (verification_status = 'verified'), AND not be SUSPENDED. The
 * verification_status check is what keeps a brand-new self-signup
 * contractor (Contractor Application / Approval workflow — see
 * contractor_profiles.verification_status, staffController.ts) out of the
 * public directory/enquiry intake until Staff/Admin explicitly approves
 * them; onboarding_complete alone used to be treated as sufficient here,
 * but that only ever held for staff-created (Prima Facie) contractors,
 * whose onboarding_complete is itself gated on verification_status =
 * 'verified' (see pfContractorController.updatePfContractorVerification) —
 * self-signup contractors set onboarding_complete = true themselves just
 * by finishing their profile form (profileController.updateMyProfile),
 * well before any staff review. Requiring verification_status = 'verified'
 * here closes that gap for both paths uniformly.
 *
 * Suspending a contractor never deletes or alters their record — it only
 * removes them from this condition, so their enquiries/ratings/jobs/audit
 * logs/verification stay intact and internal staff (pfContractorController,
 * the generic admin controller) keep querying `contractor_profiles`
 * directly, unfiltered, since Ops Head/Field Staff must still be able to
 * see and manage suspended (or under-review) contractors.
 *
 * Every query using this fragment must alias `contractor_profiles` as `cp`.
 */
export const PUBLICLY_DISCOVERABLE_CONDITION = sql`(cp.onboarding_complete = true AND cp.verification_status = 'verified' AND cp.availability <> 'SUSPENDED' AND cp.is_unlisted = false)`;
