import { Request, Response, NextFunction } from 'express';
import sql from '../db/index';
import { z } from 'zod';
import { createNotification, notifyUsersByRole } from '../utils/notifications';
import { requirementEligibilityCondition, extractIndustryKeywords } from '../utils/opportunityMatching';
import { notifyApplicationEvent, notifyManufacturerNewApplication } from '../utils/whatsappNotifications';
import type { AppError } from '../middlewares/errorHandler';

// Validator for submitting an application
const applySchema = z.object({
  proposedWorkforce: z.union([z.number(), z.string().transform((v) => parseInt(v, 10))]).pipe(z.number().positive('Proposed workforce must be greater than 0')),
  availabilityDate: z.string().min(1, 'Availability date is required'),
  relevantExperience: z.string().optional(),
  message: z.string().optional(),
  proposedRate: z.union([z.number(), z.string().transform((v) => parseFloat(v))]).optional(),
});

export interface ContractorFullProfile {
  id: string;
  company_name: string;
  phone: string | null;
  workforce_size: number | null;
  industry: string | null;
  years_experience: number | null;
  city: string | null;
  state: string | null;
  service_areas: string[] | null;
  skills: string[] | null;
  availability: string | null;
  onboarding_complete: boolean;
  verification_status: string;
  overall_rating: number | null;
  ghosting_count: number;
  repeat_engagement_count: number;
  certification_status: string;
  created_at: string;
}

/**
 * Helper to retrieve contractor_profiles row for the logged in user
 */
async function getContractorFullProfile(userId: string): Promise<ContractorFullProfile> {
  const [profile] = await sql<ContractorFullProfile[]>`
    SELECT id, company_name, phone, workforce_size, industry, years_experience,
           city, state, service_areas, skills, availability,
           onboarding_complete, verification_status,
           overall_rating, ghosting_count, repeat_engagement_count,
           certification_status, created_at
    FROM contractor_profiles
    WHERE user_id = ${userId}
  `;
  if (!profile) {
    const err: AppError = new Error('Contractor profile not found for this user');
    err.statusCode = 404;
    throw err;
  }
  return profile;
}

/**
 * Contractor Application / Approval workflow gate: normal marketplace
 * access (viewing/applying to opportunities, being counted in dashboard
 * stats) is only available once Staff/Admin has approved the contractor
 * (verification_status = 'verified') — same rule as
 * PUBLICLY_DISCOVERABLE_CONDITION (contractorVisibility.ts), just
 * evaluated in JS here since the profile row is already loaded. Enforced
 * server-side (403) so an under-review contractor can't bypass the
 * frontend's "Application Under Review" screen by calling the API
 * directly.
 */
function isApprovedForMarketplace(cp: ContractorFullProfile): boolean {
  return cp.onboarding_complete && cp.verification_status === 'verified';
}

function forbiddenNotApproved(): AppError {
  const err: AppError = new Error(
    'Your contractor application is still under review. You will get full marketplace access once Craly Operations approves your account.',
  );
  err.statusCode = 403;
  return err;
}

/**
 * Weighted opportunity match scoring (display-only, NOT the eligibility gate).
 *
 * Six factors are independently scored 0.0–1.0 and combined using fixed
 * weights that sum to 100.  The final score is a true percentage (0–100)
 * where 0 means "barely eligible" and 100 means "perfect fit on every
 * axis."  Each factor produces a human-readable reason string for the UI.
 *
 * The hard eligibility filter lives in ../utils/opportunityMatching.ts
 * (requirementEligibilityCondition) — this function only runs on rows
 * that already passed that gate.
 *
 * IMPORTANT: Uses the structured `city`/`state` columns for location
 * scoring (not the freeform `location` text) so that scoring and
 * eligibility always agree.
 */

interface MatchFactor {
  weight: number;
  score: number;      // 0.0 – 1.0
  reasons: string[];
}

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

/**
 * Skills matching: compares contractor.skills[] against
 * requirement.required_skills[] using case-insensitive includes() for
 * fuzzy tolerance (e.g. "MIG Welding" matches "MIG", "Electrical Wiring"
 * matches "Electrical").  Returns a 0.0–1.0 score based on the fraction
 * of required skills that were matched.
 */
function scoreSkillsOverlap(
  contractorSkills: string[] | null,
  requiredSkills: string[] | null,
): MatchFactor {
  const reasons: string[] = [];

  if (!requiredSkills || requiredSkills.length === 0) {
    return { weight: 30, score: 1.0, reasons: ['No specific skills required'] };
  }

  if (!contractorSkills || contractorSkills.length === 0) {
    reasons.push(`0 of ${requiredSkills.length} required skills matched`);
    return { weight: 30, score: 0, reasons };
  }

  const normalizedContractor = contractorSkills.map(normalize);
  const matched: string[] = [];

  for (const reqSkill of requiredSkills) {
    const reqNorm = normalize(reqSkill);
    const found = normalizedContractor.some(
      (cs) => cs.includes(reqNorm) || reqNorm.includes(cs),
    );
    if (found) matched.push(reqSkill);
  }

  const score = matched.length / requiredSkills.length;

  if (matched.length === requiredSkills.length) {
    reasons.push(`All ${matched.length} required skills matched (${matched.join(', ')})`);
  } else if (matched.length > 0) {
    reasons.push(`${matched.length} of ${requiredSkills.length} required skills matched (${matched.join(', ')})`);
  } else {
    reasons.push(`0 of ${requiredSkills.length} required skills matched`);
  }

  return { weight: 30, score, reasons };
}

function scoreWorkforceCapacity(
  contractorSize: number | null,
  workersRequired: number | null,
): MatchFactor {
  const reasons: string[] = [];

  if (!workersRequired || workersRequired <= 0) {
    return { weight: 20, score: 1.0, reasons: ['No workforce requirement specified'] };
  }

  const size = contractorSize ?? 0;
  if (size >= workersRequired * 1.5) {
    reasons.push(`Workforce: ${size} available vs ${workersRequired} needed — ample surplus capacity`);
    return { weight: 20, score: 1.0, reasons };
  }
  if (size >= workersRequired) {
    reasons.push(`Workforce: ${size} available vs ${workersRequired} needed — meets requirement`);
    return { weight: 20, score: 1.0, reasons };
  }
  if (size >= workersRequired * 0.7) {
    reasons.push(`Workforce: ${size} available vs ${workersRequired} needed — close to requirement`);
    return { weight: 20, score: 0.5, reasons };
  }

  reasons.push(`Workforce: ${size} available vs ${workersRequired} needed — below requirement`);
  return { weight: 20, score: 0, reasons };
}

function scoreLocationPrecision(
  contractor: ContractorFullProfile,
  opCity: string | null,
  opState: string | null,
): MatchFactor {
  const reasons: string[] = [];

  if ((!opCity || !opCity.trim()) && (!opState || !opState.trim())) {
    return { weight: 20, score: 1.0, reasons: ['No location constraint on requirement'] };
  }

  const reqCity = opCity ? normalize(opCity) : '';
  const reqState = opState ? normalize(opState) : '';
  const conCity = contractor.city ? normalize(contractor.city) : '';
  const conState = contractor.state ? normalize(contractor.state) : '';

  // 1. Exact city match
  if (reqCity && conCity && conCity === reqCity) {
    reasons.push(`Exact city match: ${contractor.city}`);
    return { weight: 20, score: 1.0, reasons };
  }

  // 2. City found in service_areas (coverage area match)
  if (reqCity && contractor.service_areas && Array.isArray(contractor.service_areas)) {
    const flatAreas = contractor.service_areas
      .flatMap((sa) => String(sa).split(','))
      .map((s) => s.trim())
      .filter(Boolean);

    const matchedArea = flatAreas.find((sa) => normalize(sa) === reqCity);
    if (matchedArea) {
      reasons.push(`Coverage area match: ${matchedArea} in your service areas`);
      return { weight: 20, score: 0.8, reasons };
    }
  }

  // 3. State-only match (weaker)
  if (reqState && conState && conState === reqState) {
    reasons.push(`Same state: ${contractor.state}`);
    return { weight: 20, score: 0.5, reasons };
  }

  reasons.push('Location does not closely match');
  return { weight: 20, score: 0, reasons };
}

function scoreExperienceFit(
  contractorExperience: number | null,
  experienceRequired: number | null,
): MatchFactor {
  const reasons: string[] = [];

  if (!experienceRequired || experienceRequired <= 0) {
    return { weight: 15, score: 1.0, reasons: ['No experience requirement specified'] };
  }

  const exp = contractorExperience ?? 0;

  if (exp >= experienceRequired * 1.5) {
    reasons.push(`Minimum Experience: ${experienceRequired} years (${exp} yrs available — highly experienced)`);
    return { weight: 15, score: 1.0, reasons };
  }
  if (exp >= experienceRequired) {
    reasons.push(`Minimum Experience: ${experienceRequired} years (${exp} yrs available — meets requirement)`);
    return { weight: 15, score: 1.0, reasons };
  }
  reasons.push(`Minimum Experience: ${experienceRequired} years (${exp} yrs available — below requirement)`);
  return { weight: 15, score: 0, reasons };
}

function scoreIndustryMatch(
  contractorIndustry: string | null,
  requirementIndustry: string | null,
): MatchFactor {
  if (!requirementIndustry || !requirementIndustry.trim()) {
    return { weight: 10, score: 1.0, reasons: ['No industry constraint on requirement'] };
  }
  if (!contractorIndustry || !contractorIndustry.trim()) {
    return { weight: 10, score: 0.5, reasons: ['Industry not specified in contractor profile'] };
  }
  const normCon = normalize(contractorIndustry);
  const normReq = normalize(requirementIndustry);
  if (normCon === normReq || normCon.includes(normReq) || normReq.includes(normCon)) {
    return { weight: 10, score: 1.0, reasons: [`Industry match: ${requirementIndustry}`] };
  }
  const conKeywords = extractIndustryKeywords(contractorIndustry);
  const reqKeywords = extractIndustryKeywords(requirementIndustry);
  const hasKeywordOverlap = conKeywords.some((ck) =>
    reqKeywords.some((rk) => ck.includes(rk) || rk.includes(ck)),
  );
  if (hasKeywordOverlap) {
    return { weight: 10, score: 1.0, reasons: [`Industry match: ${requirementIndustry}`] };
  }
  return { weight: 10, score: 0, reasons: ['Industry does not match'] };
}

function scoreReliability(contractor: ContractorFullProfile): MatchFactor {
  const reasons: string[] = [];
  let score = 0.6; // Neutral default for contractors with no history

  const hasHistory =
    (contractor.overall_rating !== null && contractor.overall_rating > 0) ||
    contractor.ghosting_count > 0 ||
    contractor.repeat_engagement_count > 0;

  if (!hasHistory) {
    reasons.push('New contractor — no engagement history yet');
    return { weight: 5, score, reasons };
  }

  // Rating contributes 0.0–0.5 of this factor's score
  if (contractor.overall_rating !== null && contractor.overall_rating > 0) {
    const ratingPortion = Math.min(contractor.overall_rating / 5.0, 1.0) * 0.5;
    score = ratingPortion;
    reasons.push(`Rating: ${contractor.overall_rating}/5`);
  }

  // Ghosting penalizes
  if (contractor.ghosting_count > 0) {
    const penalty = Math.min(contractor.ghosting_count * 0.1, 0.3);
    score = Math.max(score - penalty, 0);
    reasons.push(`${contractor.ghosting_count} ghosting incident(s) recorded`);
  }

  // Repeat engagements reward
  if (contractor.repeat_engagement_count > 0) {
    const bonus = Math.min(contractor.repeat_engagement_count * 0.05, 0.2);
    score = Math.min(score + bonus, 1.0);
    reasons.push(`${contractor.repeat_engagement_count} repeat engagement(s)`);
  }

  // Certification bonus
  if (contractor.certification_status === 'certified') {
    score = Math.min(score + 0.15, 1.0);
    reasons.push('Certified contractor');
  }

  return { weight: 5, score: Math.round(score * 100) / 100, reasons };
}

export function calculateOpportunityMatch(op: any, contractor: ContractorFullProfile) {
  const factors: MatchFactor[] = [
    scoreSkillsOverlap(contractor.skills, op.required_skills),
    scoreWorkforceCapacity(contractor.workforce_size, op.workers_required),
    scoreLocationPrecision(contractor, op.city, op.state),
    scoreExperienceFit(contractor.years_experience, op.experience_required),
    scoreIndustryMatch(contractor.industry, op.industry),
    scoreReliability(contractor),
  ];

  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  const weightedSum = factors.reduce((sum, f) => sum + f.weight * f.score, 0);

  const match_score = Math.round((weightedSum / totalWeight) * 100);

  let match_level = 'FAIR';
  if (match_score >= 85) match_level = 'EXCELLENT';
  else if (match_score >= 70) match_level = 'GREAT';
  else if (match_score >= 50) match_level = 'GOOD';

  // Flatten all factor reasons into a single array for the UI
  const match_reasons = factors.flatMap((f) => f.reasons);

  return { match_score, match_level, match_reasons };
}

/**
 * GET /api/contractor-portal/opportunities
 * Returns published/open manpower requirements MATCHED to the contractor profile.
 * Includes `has_applied` boolean and `application_status` for the caller.
 */
export async function getOpportunities(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cp = await getContractorFullProfile(req.user!.sub);

    if (!cp.onboarding_complete || cp.workforce_size === null || cp.workforce_size === undefined) {
      res.json({ data: [], profile_incomplete: true });
      return;
    }

    if (!isApprovedForMarketplace(cp)) {
      res.json({ data: [], profile_incomplete: false, application_under_review: true });
      return;
    }

    const eligibility = requirementEligibilityCondition(cp);

    const opportunities = await sql`
      SELECT
        mr.id,
        mr.title,
        mr.description,
        mr.industry,
        mr.location,
        mr.city,
        mr.state,
        mr.workers_required,
        mr.required_skills,
        mr.start_date,
        mr.duration,
        mr.experience_required,
        mr.budget_min,
        mr.budget_max,
        mr.status,
        mr.created_at,
        mr.published_at,
        app.id AS my_application_id,
        app.status AS my_application_status
      FROM manpower_requirements mr
      LEFT JOIN applications app
        ON app.requirement_id = mr.id AND app.contractor_id = ${cp.id}
      WHERE mr.status IN ('PUBLISHED', 'APPLICATIONS_OPEN')
        AND ${eligibility}
      ORDER BY mr.published_at DESC NULLS LAST, mr.created_at DESC
    `;

    const data = opportunities
      .map((op) => {
        const match = calculateOpportunityMatch(op, cp);
        return {
          ...op,
          has_applied: !!op.my_application_id,
          match_score: match.match_score,
          match_level: match.match_level,
          match_reasons: match.match_reasons,
        };
      })
      .sort((a, b) => b.match_score - a.match_score);

    res.json({ data, profile_incomplete: false });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/contractor-portal/opportunities/:id
 * Single opportunity detail view — matched to caller's contractor profile.
 */
export async function getOpportunityById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const cp = await getContractorFullProfile(req.user!.sub);

    if (!cp.onboarding_complete || cp.workforce_size === null || cp.workforce_size === undefined) {
      const err: AppError = new Error('Your contractor profile is incomplete. Please complete your profile to view opportunities.');
      err.statusCode = 403;
      return next(err);
    }

    if (!isApprovedForMarketplace(cp)) {
      return next(forbiddenNotApproved());
    }

    const eligibility = requirementEligibilityCondition(cp);

    const [opportunity] = await sql`
      SELECT
        mr.id,
        mr.title,
        mr.description,
        mr.industry,
        mr.location,
        mr.city,
        mr.state,
        mr.workers_required,
        mr.required_skills,
        mr.start_date,
        mr.duration,
        mr.experience_required,
        mr.budget_min,
        mr.budget_max,
        mr.status,
        mr.created_at,
        mr.published_at,
        app.id AS my_application_id,
        app.status AS my_application_status,
        app.created_at AS my_application_submitted_at
      FROM manpower_requirements mr
      LEFT JOIN applications app
        ON app.requirement_id = mr.id AND app.contractor_id = ${cp.id}
      WHERE mr.id = ${id}
        AND mr.status IN ('PUBLISHED', 'APPLICATIONS_OPEN')
        AND ${eligibility}
    `;

    if (!opportunity) {
      const err: AppError = new Error('Opportunity not found or not eligible based on matching criteria');
      err.statusCode = 403;
      return next(err);
    }

    const match = calculateOpportunityMatch(opportunity, cp);

    res.json({
      data: {
        ...opportunity,
        has_applied: !!opportunity.my_application_id,
        match_score: match.match_score,
        match_level: match.match_level,
        match_reasons: match.match_reasons,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/contractor-portal/opportunities/:id/apply
 * Submits an application for a manpower requirement (safety enforced).
 */
export async function applyToOpportunity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: requirementId } = req.params;
    const cp = await getContractorFullProfile(req.user!.sub);

    if (!cp.onboarding_complete || cp.workforce_size === null || cp.workforce_size === undefined) {
      const err: AppError = new Error('Your contractor profile is incomplete. Please complete your profile to apply.');
      err.statusCode = 403;
      return next(err);
    }

    if (!isApprovedForMarketplace(cp)) {
      return next(forbiddenNotApproved());
    }

    const parsed = applySchema.safeParse(req.body);
    if (!parsed.success) {
      const err: AppError = new Error(parsed.error.issues[0]?.message ?? 'Invalid application input');
      err.statusCode = 400;
      return next(err);
    }

    const eligibility = requirementEligibilityCondition(cp);

    // Verify requirement exists, is open, AND matches contractor criteria —
    // uses the exact same eligibility condition as getOpportunities/
    // getOpportunityById, so an opportunity that appears in the list can
    // never be rejected here for a different reason.
    const [eligibleReq] = await sql`
      SELECT id, title, manufacturer_id, status FROM manpower_requirements mr
      WHERE mr.id = ${requirementId}
        AND mr.status IN ('PUBLISHED', 'APPLICATIONS_OPEN')
        AND ${eligibility}
    `;

    if (!eligibleReq) {
      const err: AppError = new Error('You are not eligible to apply for this opportunity based on matching criteria');
      err.statusCode = 403;
      return next(err);
    }

    // Check duplicate application
    const [existing] = await sql`
      SELECT id FROM applications WHERE requirement_id = ${requirementId} AND contractor_id = ${cp.id}
    `;

    if (existing) {
      const err: AppError = new Error('You have already applied for this opportunity');
      err.statusCode = 409;
      return next(err);
    }

    const { proposedWorkforce, availabilityDate, relevantExperience, message, proposedRate } = parsed.data;

    // Insert application
    const [application] = await sql`
      INSERT INTO applications (
        requirement_id, contractor_id, proposed_workforce, availability_date,
        relevant_experience, message, proposed_rate, status
      )
      VALUES (
        ${requirementId}, ${cp.id}, ${proposedWorkforce}, ${availabilityDate},
        ${relevantExperience ?? null}, ${message ?? null}, ${proposedRate ?? null}, 'SUBMITTED'
      )
      RETURNING id, status, created_at
    `;

    // Trigger APPLICATION_SUBMITTED notification for Ops Head and Field Staff
    await notifyUsersByRole('ops_head', {
      type: 'APPLICATION_SUBMITTED',
      title: 'New Contractor Application',
      message: `${cp.company_name} submitted an application for "${eligibleReq.title}"`,
      referenceId: application.id,
    });

    await notifyUsersByRole('field_staff', {
      type: 'APPLICATION_SUBMITTED',
      title: 'New Contractor Application',
      message: `${cp.company_name} submitted an application for "${eligibleReq.title}"`,
      referenceId: application.id,
    });

    // Notify manufacturer user linked to manufacturer_id if available
    const [mUser] = await sql`SELECT user_id, company_name, phone FROM business_profiles WHERE id = ${eligibleReq.manufacturer_id}`;
    if (mUser?.user_id) {
      await createNotification({
        userId: mUser.user_id,
        type: 'APPLICATION_SUBMITTED',
        title: 'New Application Received',
        message: `${cp.company_name} applied for your requirement "${eligibleReq.title}"`,
        referenceId: application.id,
      });
    }

    // WhatsApp: confirmation to the contractor, alert to the manufacturer.
    // A repeat submit can't double-send — the duplicate check above (and
    // applications_req_contractor_unique) rejects it with 409 first.
    const applicationRef = { id: application.id, requirementTitle: eligibleReq.title };
    await notifyApplicationEvent(
      { contractorId: cp.id, userId: req.user!.sub, phone: cp.phone, companyName: cp.company_name },
      'application_submitted',
      applicationRef,
      'submitted',
    );
    if (mUser) {
      await notifyManufacturerNewApplication(
        { userId: mUser.user_id, phone: mUser.phone, companyName: mUser.company_name },
        applicationRef,
      );
    }

    res.status(201).json({
      data: {
        id: application.id,
        status: application.status,
        created_at: application.created_at,
        message: 'Application submitted successfully.',
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/contractor-portal/applications
 * Returns all applications submitted by the logged in contractor.
 */
export async function getMyApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cp = await getContractorFullProfile(req.user!.sub);

    const applications = await sql`
      SELECT
        app.id,
        app.requirement_id,
        app.proposed_workforce,
        app.availability_date,
        app.relevant_experience,
        app.message,
        app.proposed_rate,
        app.status AS application_status,
        app.created_at AS submitted_at,
        app.updated_at AS last_updated_at,
        mr.title AS requirement_title,
        mr.location AS requirement_location,
        mr.industry AS requirement_industry,
        mr.workers_required AS requirement_workers_required,
        mr.status AS requirement_status
      FROM applications app
      JOIN manpower_requirements mr ON mr.id = app.requirement_id
      WHERE app.contractor_id = ${cp.id}
      ORDER BY app.created_at DESC
    `;

    res.json({ data: applications });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/contractor-portal/applications/:id
 * Single application detail view (contractor ownership enforced).
 */
export async function getApplicationById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const cp = await getContractorFullProfile(req.user!.sub);

    const [application] = await sql`
      SELECT
        app.id,
        app.requirement_id,
        app.proposed_workforce,
        app.availability_date,
        app.relevant_experience,
        app.message,
        app.proposed_rate,
        app.status AS application_status,
        app.created_at AS submitted_at,
        app.updated_at AS last_updated_at,
        mr.title AS requirement_title,
        mr.description AS requirement_description,
        mr.location AS requirement_location,
        mr.industry AS requirement_industry,
        mr.workers_required AS requirement_workers_required,
        mr.start_date AS requirement_start_date,
        mr.duration AS requirement_duration,
        mr.status AS requirement_status
      FROM applications app
      JOIN manpower_requirements mr ON mr.id = app.requirement_id
      WHERE app.id = ${id} AND app.contractor_id = ${cp.id}
    `;

    if (!application) {
      const err: AppError = new Error('Application not found');
      err.statusCode = 404;
      return next(err);
    }

    res.json({ data: application });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/contractor-portal/dashboard-stats
 * Returns counts for contractor dashboard metrics based on matched criteria.
 */
export async function getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cp = await getContractorFullProfile(req.user!.sub);

    let opportunitiesCount = 0;

    if (isApprovedForMarketplace(cp) && cp.workforce_size !== null && cp.workforce_size !== undefined) {
      const eligibility = requirementEligibilityCondition(cp);

      const [{ count }] = await sql`
        SELECT COUNT(*)::int FROM manpower_requirements mr
        WHERE mr.status IN ('PUBLISHED', 'APPLICATIONS_OPEN')
          AND ${eligibility}
      `;
      opportunitiesCount = count;
    }

    // Active applications count for contractor
    const [{ count: activeApplicationsCount }] = await sql`
      SELECT COUNT(*)::int FROM applications
      WHERE contractor_id = ${cp.id} AND status IN ('SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED')
    `;

    // Selected applications count for contractor
    const [{ count: selectedApplicationsCount }] = await sql`
      SELECT COUNT(*)::int FROM applications
      WHERE contractor_id = ${cp.id} AND status = 'SELECTED'
    `;

    res.json({
      data: {
        opportunitiesCount,
        activeApplicationsCount,
        selectedApplicationsCount,
      },
    });
  } catch (err) {
    next(err);
  }
}
