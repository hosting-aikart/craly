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

/**
 * Helper to retrieve contractor_profiles.id for the logged in user
 */
async function getContractorProfileId(userId: string): Promise<string> {
  const [profile] = await sql`SELECT id FROM contractor_profiles WHERE user_id = ${userId}`;
  if (!profile) {
    const err: AppError = new Error('Contractor profile not found for this user');
    err.statusCode = 404;
    throw err;
  }
  return profile.id;
}

/**
 * Helper to compute personalized match score and reasons for a contractor
 */
function calculateOpportunityMatch(op: any, contractor: any) {
  let score = 45; // baseline open opportunity score
  const reasons: string[] = [];

  // 1. Location match
  if (contractor?.city && op.location) {
    const opLoc = op.location.toLowerCase();
    const cCity = contractor.city.toLowerCase();
    const cState = (contractor.state || '').toLowerCase();
    if (opLoc.includes(cCity) || cCity.includes(opLoc)) {
      score += 25;
      reasons.push(`Location match (${contractor.city})`);
    } else if (cState && opLoc.includes(cState)) {
      score += 15;
      reasons.push(`Regional state match (${contractor.state})`);
    }
  }

  // 2. Workforce capacity match
  if (contractor?.workforce_size && op.workers_required) {
    if (contractor.workforce_size >= op.workers_required) {
      score += 20;
      reasons.push(`Capacity match (${contractor.workforce_size} workers available vs ${op.workers_required} needed)`);
    } else if (contractor.workforce_size >= Math.ceil(op.workers_required * 0.5)) {
      score += 10;
      reasons.push(`Partial capacity match (${contractor.workforce_size} workers)`);
    }
  }

  // 3. Experience match
  if (contractor?.years_experience !== null && contractor?.years_experience !== undefined && op.experience_required) {
    if (contractor.years_experience >= op.experience_required) {
      score += 15;
      reasons.push(`Experience qualified (${contractor.years_experience}+ years)`);
    }
  } else if (contractor?.years_experience && contractor.years_experience >= 2) {
    score += 8;
  }

  score = Math.min(score, 98);
  const match_level: 'HIGH' | 'MEDIUM' | 'LOW' = score >= 75 ? 'HIGH' : score >= 55 ? 'MEDIUM' : 'LOW';

  return {
    match_score: score,
    match_level,
    match_reasons: reasons,
  };
}

/**
 * GET /api/contractor-portal/opportunities
 * Returns published/open manpower requirements scored and personalized for the caller contractor.
 */
export async function getOpportunities(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [contractor] = await sql`
      SELECT 
        cp.id,
        cp.company_name,
        cp.city,
        cp.state,
        cp.workforce_size,
        cp.years_experience
      FROM contractor_profiles cp
      WHERE cp.user_id = ${req.user!.sub}
    `;

    if (!contractor) {
      const err: AppError = new Error('Contractor profile not found for this user');
      err.statusCode = 404;
      return next(err);
    }

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
        ON app.requirement_id = mr.id AND app.contractor_id = ${contractor.id}
      WHERE mr.status IN ('PUBLISHED', 'APPLICATIONS_OPEN')
      ORDER BY mr.published_at DESC NULLS LAST, mr.created_at DESC
    `;

    const data = opportunities
      .map((op) => {
        const match = calculateOpportunityMatch(op, contractor);
        return {
          ...op,
          has_applied: !!op.my_application_id,
          match_score: match.match_score,
          match_level: match.match_level,
          match_reasons: match.match_reasons,
        };
      })
      .sort((a, b) => b.match_score - a.match_score);

    res.json({ data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/contractor-portal/opportunities/:id
 * Single opportunity detail view.
 */
export async function getOpportunityById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const contractorId = await getContractorProfileId(req.user!.sub);

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
        ON app.requirement_id = mr.id AND app.contractor_id = ${contractorId}
      WHERE mr.id = ${id}
    `;

    if (!opportunity) {
      const err: AppError = new Error('Opportunity not found');
      err.statusCode = 404;
      return next(err);
    }

    if (!['PUBLISHED', 'APPLICATIONS_OPEN'].includes(opportunity.status)) {
      const err: AppError = new Error('This opportunity is no longer open for applications');
      err.statusCode = 400;
      return next(err);
    }

    const [contractor] = await sql`
      SELECT 
        cp.id,
        cp.company_name,
        cp.city,
        cp.state,
        cp.workforce_size,
        cp.years_experience
      FROM contractor_profiles cp
      WHERE cp.user_id = ${req.user!.sub}
    `;

    const match = calculateOpportunityMatch(opportunity, contractor);

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
 * Submits an application for a manpower requirement.
 */
export async function applyToOpportunity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: requirementId } = req.params;
    const contractorId = await getContractorProfileId(req.user!.sub);

    const parsed = applySchema.safeParse(req.body);
    if (!parsed.success) {
      const err: AppError = new Error(parsed.error.issues[0]?.message ?? 'Invalid application input');
      err.statusCode = 400;
      return next(err);
    }

    const { proposedWorkforce, availabilityDate, relevantExperience, message, proposedRate } = parsed.data;

    // Check requirement exists and is open
    const [requirement] = await sql`
      SELECT id, title, manufacturer_id, status FROM manpower_requirements WHERE id = ${requirementId}
    `;

    if (!requirement) {
      const err: AppError = new Error('Requirement not found');
      err.statusCode = 404;
      return next(err);
    }

    if (!['PUBLISHED', 'APPLICATIONS_OPEN'].includes(requirement.status)) {
      const err: AppError = new Error('This requirement is not accepting applications');
      err.statusCode = 400;
      return next(err);
    }

    // Check duplicate application
    const [existing] = await sql`
      SELECT id FROM applications WHERE requirement_id = ${requirementId} AND contractor_id = ${contractorId}
    `;

    if (existing) {
      const err: AppError = new Error('You have already applied for this opportunity');
      err.statusCode = 409;
      return next(err);
    }

    // Insert application
    const [application] = await sql`
      INSERT INTO applications (
        requirement_id, contractor_id, proposed_workforce, availability_date,
        relevant_experience, message, proposed_rate, status
      )
      VALUES (
        ${requirementId}, ${contractorId}, ${proposedWorkforce}, ${availabilityDate},
        ${relevantExperience ?? null}, ${message ?? null}, ${proposedRate ?? null}, 'SUBMITTED'
      )
      RETURNING id, status, created_at
    `;

    // Retrieve contractor company name for notification message
    const [cProfile] = await sql`SELECT company_name FROM contractor_profiles WHERE id = ${contractorId}`;
    const contractorName = cProfile?.company_name || 'A contractor';

    // Trigger APPLICATION_SUBMITTED notification for Ops Head and Field Staff
    await notifyUsersByRole('ops_head', {
      type: 'APPLICATION_SUBMITTED',
      title: 'New Contractor Application',
      message: `${contractorName} submitted an application for "${requirement.title}"`,
      referenceId: application.id,
    });

    await notifyUsersByRole('field_staff', {
      type: 'APPLICATION_SUBMITTED',
      title: 'New Contractor Application',
      message: `${contractorName} submitted an application for "${requirement.title}"`,
      referenceId: application.id,
    });

    // Notify manufacturer user linked to manufacturer_id if available
    const [mUser] = await sql`SELECT user_id FROM business_profiles WHERE id = ${requirement.manufacturer_id}`;
    if (mUser?.user_id) {
      await createNotification({
        userId: mUser.user_id,
        type: 'APPLICATION_SUBMITTED',
        title: 'New Application Received',
        message: `${contractorName} applied for your requirement "${requirement.title}"`,
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
    const contractorId = await getContractorProfileId(req.user!.sub);

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
      WHERE app.contractor_id = ${contractorId}
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
    const contractorId = await getContractorProfileId(req.user!.sub);

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
      WHERE app.id = ${id} AND app.contractor_id = ${contractorId}
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
 * Returns counts for contractor dashboard metrics.
 */
export async function getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const contractorId = await getContractorProfileId(req.user!.sub);

    // Published requirements count
    const [{ count: opportunitiesCount }] = await sql`
      SELECT COUNT(*)::int FROM manpower_requirements WHERE status IN ('PUBLISHED', 'APPLICATIONS_OPEN')
    `;

    // Active applications count for contractor
    const [{ count: activeApplicationsCount }] = await sql`
      SELECT COUNT(*)::int FROM applications 
      WHERE contractor_id = ${contractorId} AND status IN ('SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED')
    `;

    // Selected applications count for contractor
    const [{ count: selectedApplicationsCount }] = await sql`
      SELECT COUNT(*)::int FROM applications 
      WHERE contractor_id = ${contractorId} AND status = 'SELECTED'
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
