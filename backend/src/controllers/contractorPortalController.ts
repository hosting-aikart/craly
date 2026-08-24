import { Request, Response, NextFunction } from 'express';
import sql from '../db/index';
import { z } from 'zod';
import { createNotification, notifyUsersByRole } from '../utils/notifications';
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
  workforce_size: number | null;
  industry: string | null;
  years_experience: number | null;
  city: string | null;
  state: string | null;
  service_areas: string[] | null;
  onboarding_complete: boolean;
}

/**
 * Helper to retrieve contractor_profiles row for the logged in user
 */
async function getContractorFullProfile(userId: string): Promise<ContractorFullProfile> {
  const [profile] = await sql<ContractorFullProfile[]>`
    SELECT id, company_name, workforce_size, industry, years_experience, city, state, service_areas, onboarding_complete
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
 * Opportunity matching checks workforce capacity, industry, experience,
 * and location compatibility (Base City, State, or Coverage Areas / service_areas).
 */
function calculateOpportunityMatch(op: any, contractor: ContractorFullProfile) {
  let score = 70;
  const reasons: string[] = [];

  if (contractor.workforce_size && op.workers_required) {
    if (contractor.workforce_size >= op.workers_required * 1.5) {
      score += 15;
      reasons.push('Ample workforce capacity');
    } else {
      score += 10;
      reasons.push('Meets workforce requirements');
    }
  }

  if (contractor.industry && op.industry && contractor.industry.toLowerCase() === op.industry.toLowerCase()) {
    score += 10;
    reasons.push('Exact industry match');
  }

  if (op.experience_required) {
    const contractorExperience = contractor.years_experience || 0;
    if (contractorExperience >= op.experience_required * 1.5) {
      score += 15;
      reasons.push('Highly experienced for this role');
    } else if (contractorExperience >= op.experience_required) {
      score += 10;
      reasons.push('Meets experience requirement');
    }
  }

  if (op.location) {
    const locLower = op.location.toLowerCase();
    let locationMatched = false;

    // 1. Base City Check
    if (contractor.city) {
      const cityLower = contractor.city.toLowerCase().trim();
      if (cityLower && (locLower.includes(cityLower) || cityLower.includes(locLower))) {
        score += 15;
        reasons.push(`Location match (Base City: ${contractor.city})`);
        locationMatched = true;
      }
    }

    // 2. Coverage Area (Service Areas) Check
    if (contractor.service_areas && Array.isArray(contractor.service_areas)) {
      const flatAreas = contractor.service_areas
        .flatMap((sa) => String(sa).split(','))
        .map((s) => s.trim())
        .filter(Boolean);

      const matchedArea = flatAreas.find((sa) => {
        const saLower = sa.toLowerCase();
        return locLower.includes(saLower) || saLower.includes(locLower);
      });

      if (matchedArea) {
        score += 15;
        reasons.push(`Location match (Coverage Area: ${matchedArea})`);
        locationMatched = true;
      }
    }

    // 3. Base State Check
    if (!locationMatched && contractor.state) {
      const stateLower = contractor.state.toLowerCase().trim();
      if (stateLower && (locLower.includes(stateLower) || stateLower.includes(locLower))) {
        score += 10;
        reasons.push(`Location match (State: ${contractor.state})`);
      }
    }
  }

  const match_score = Math.min(score, 100);
  let match_level = 'GOOD';
  if (match_score >= 90) match_level = 'EXCELLENT';
  else if (match_score >= 80) match_level = 'GREAT';

  return { match_score, match_level, match_reasons: reasons };
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

    const contractorCity = cp.city || '';
    const contractorState = cp.state || '';
    const serviceAreas = cp.service_areas || [];
    const contractorIndustry = cp.industry || '';
    const contractorWorkforce = cp.workforce_size || 0;
    const contractorExperience = cp.years_experience || 0;

    const opportunities = await sql`
      SELECT
        mr.id,
        mr.title,
        mr.description,
        mr.industry,
        mr.location,
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
        -- 1. Contractor workforce size >= requirement workers_required
        AND (${contractorWorkforce} >= mr.workers_required)
        -- 2. Contractor industry matches requirement industry
        AND (
          mr.industry IS NULL
          OR TRIM(mr.industry) = ''
          OR (${contractorIndustry} != '' AND LOWER(TRIM(${contractorIndustry})) = LOWER(TRIM(mr.industry)))
        )
        -- 3. Contractor years of experience >= requirement's required experience
        AND (
          mr.experience_required IS NULL
          OR ${contractorExperience} >= mr.experience_required
        )
        -- 4. Requirement location compatible with contractor's base city, state, or coverage areas (service_areas)
        AND (
          mr.location IS NULL
          OR TRIM(mr.location) = ''
          OR (${contractorCity} != '' AND LOWER(TRIM(mr.location)) LIKE '%' || LOWER(TRIM(${contractorCity})) || '%')
          OR (${contractorCity} != '' AND LOWER(TRIM(${contractorCity})) LIKE '%' || LOWER(TRIM(mr.location)) || '%')
          OR (${contractorState} != '' AND LOWER(TRIM(mr.location)) LIKE '%' || LOWER(TRIM(${contractorState})) || '%')
          OR (${contractorState} != '' AND LOWER(TRIM(${contractorState})) LIKE '%' || LOWER(TRIM(mr.location)) || '%')
          OR EXISTS (
            SELECT 1
            FROM unnest(${sql.array(serviceAreas)}::text[]) sa
            WHERE sa != '' AND (
              LOWER(TRIM(mr.location)) LIKE '%' || LOWER(TRIM(sa)) || '%'
              OR LOWER(TRIM(sa)) LIKE '%' || LOWER(TRIM(mr.location)) || '%'
            )
          )
        )
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

    const contractorCity = cp.city || '';
    const contractorState = cp.state || '';
    const serviceAreas = cp.service_areas || [];
    const contractorIndustry = cp.industry || '';
    const contractorWorkforce = cp.workforce_size || 0;
    const contractorExperience = cp.years_experience || 0;

    const [opportunity] = await sql`
      SELECT
        mr.id,
        mr.title,
        mr.description,
        mr.industry,
        mr.location,
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
        AND (${contractorWorkforce} >= mr.workers_required)
        AND (
          mr.industry IS NULL
          OR TRIM(mr.industry) = ''
          OR (${contractorIndustry} != '' AND LOWER(TRIM(${contractorIndustry})) = LOWER(TRIM(mr.industry)))
        )
        AND (
          mr.experience_required IS NULL
          OR ${contractorExperience} >= mr.experience_required
        )
        AND (
          mr.location IS NULL
          OR TRIM(mr.location) = ''
          OR (${contractorCity} != '' AND LOWER(TRIM(mr.location)) LIKE '%' || LOWER(TRIM(${contractorCity})) || '%')
          OR (${contractorCity} != '' AND LOWER(TRIM(${contractorCity})) LIKE '%' || LOWER(TRIM(mr.location)) || '%')
          OR (${contractorState} != '' AND LOWER(TRIM(mr.location)) LIKE '%' || LOWER(TRIM(${contractorState})) || '%')
          OR (${contractorState} != '' AND LOWER(TRIM(${contractorState})) LIKE '%' || LOWER(TRIM(mr.location)) || '%')
          OR EXISTS (
            SELECT 1
            FROM unnest(${sql.array(serviceAreas)}::text[]) sa
            WHERE sa != '' AND (
              LOWER(TRIM(mr.location)) LIKE '%' || LOWER(TRIM(sa)) || '%'
              OR LOWER(TRIM(sa)) LIKE '%' || LOWER(TRIM(mr.location)) || '%'
            )
          )
        )
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

    const parsed = applySchema.safeParse(req.body);
    if (!parsed.success) {
      const err: AppError = new Error(parsed.error.issues[0]?.message ?? 'Invalid application input');
      err.statusCode = 400;
      return next(err);
    }

    const contractorCity = cp.city || '';
    const contractorIndustry = cp.industry || '';
    const contractorWorkforce = cp.workforce_size || 0;
    const contractorExperience = cp.years_experience || 0;

    // Verify requirement exists, is open, AND matches contractor criteria
    const [eligibleReq] = await sql`
      SELECT id, title, manufacturer_id, status FROM manpower_requirements mr
      WHERE mr.id = ${requirementId}
        AND mr.status IN ('PUBLISHED', 'APPLICATIONS_OPEN')
        AND (${contractorWorkforce} >= mr.workers_required)
        AND (
          mr.industry IS NULL
          OR TRIM(mr.industry) = ''
          OR (${contractorIndustry} != '' AND LOWER(TRIM(${contractorIndustry})) = LOWER(TRIM(mr.industry)))
        )
        AND (
          mr.experience_required IS NULL
          OR ${contractorExperience} >= mr.experience_required
        )
        AND (
          mr.location IS NULL
          OR TRIM(mr.location) = ''
          OR (${contractorCity} != '' AND LOWER(TRIM(mr.location)) LIKE '%' || LOWER(TRIM(${contractorCity})) || '%')
          OR (${contractorCity} != '' AND LOWER(TRIM(${contractorCity})) LIKE '%' || LOWER(TRIM(mr.location)) || '%')
        )
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
    const [mUser] = await sql`SELECT user_id FROM business_profiles WHERE id = ${eligibleReq.manufacturer_id}`;
    if (mUser?.user_id) {
      await createNotification({
        userId: mUser.user_id,
        type: 'APPLICATION_SUBMITTED',
        title: 'New Application Received',
        message: `${cp.company_name} applied for your requirement "${eligibleReq.title}"`,
        referenceId: application.id,
      });
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

    if (cp.onboarding_complete && cp.workforce_size !== null && cp.workforce_size !== undefined) {
      const contractorCity = cp.city || '';
      const contractorIndustry = cp.industry || '';
      const contractorWorkforce = cp.workforce_size || 0;
      const contractorExperience = cp.years_experience || 0;

      const [{ count }] = await sql`
        SELECT COUNT(*)::int FROM manpower_requirements mr
        WHERE mr.status IN ('PUBLISHED', 'APPLICATIONS_OPEN')
          AND (${contractorWorkforce} >= mr.workers_required)
          AND (
            mr.industry IS NULL
            OR TRIM(mr.industry) = ''
            OR (${contractorIndustry} != '' AND LOWER(TRIM(${contractorIndustry})) = LOWER(TRIM(mr.industry)))
          )
          AND (
            mr.experience_required IS NULL
            OR ${contractorExperience} >= mr.experience_required
          )
          AND (
            mr.location IS NULL
            OR TRIM(mr.location) = ''
            OR (${contractorCity} != '' AND LOWER(TRIM(mr.location)) LIKE '%' || LOWER(TRIM(${contractorCity})) || '%')
            OR (${contractorCity} != '' AND LOWER(TRIM(${contractorCity})) LIKE '%' || LOWER(TRIM(mr.location)) || '%')
          )
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
