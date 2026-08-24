import { Request, Response, NextFunction } from 'express';
import sql from '../db/index';
import { z } from 'zod';
import { createNotification, notifyUsersByRole } from '../utils/notifications';
import type { AppError } from '../middlewares/errorHandler';

/**
 * Helper to retrieve business_profiles.id for the logged in user
 */
async function getManufacturerProfile(userId: string): Promise<{ id: string; company_name: string }> {
  const [profile] = await sql`
    SELECT id, company_name FROM business_profiles WHERE user_id = ${userId}
  `;
  if (!profile) {
    const err: AppError = new Error('Manufacturer profile not found for this user');
    err.statusCode = 404;
    throw err;
  }
  return profile as { id: string; company_name: string };
}

// Requirement input validator schema
const createRequirementSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  industry: z.string().optional(),
  location: z.string().min(2, 'Location is required'),
  workersRequired: z.union([z.number(), z.string().transform((v) => parseInt(v, 10))]).pipe(z.number().positive('Workers required must be at least 1')),
  requiredSkills: z.union([z.array(z.string()), z.string()]).transform((val) => {
    if (Array.isArray(val)) return val;
    if (!val) return [];
    return val.split(',').map((s) => s.trim()).filter(Boolean);
  }),
  startDate: z.string().min(1, 'Start date is required'),
  duration: z.string().min(1, 'Duration is required'),
  experienceRequired: z.union([z.number(), z.string().transform((v) => parseInt(v, 10))]).optional().nullable(),
  budgetMin: z.union([z.number(), z.string().transform((v) => parseFloat(v))]).optional().nullable(),
  budgetMax: z.union([z.number(), z.string().transform((v) => parseFloat(v))]).optional().nullable(),
  action: z.enum(['draft', 'publish']).optional().default('draft'),
});

const updateRequirementSchema = createRequirementSchema.partial().extend({
  action: z.enum(['draft', 'publish']).optional(),
});

const updateApplicationStatusSchema = z.object({
  status: z.enum(['UNDER_REVIEW', 'SHORTLISTED', 'SELECTED', 'REJECTED']),
});

/**
 * GET /api/business-portal/dashboard-stats
 */
export async function getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const manufacturer = await getManufacturerProfile(req.user!.sub);

    const [{ count: activeRequirements }] = await sql`
      SELECT COUNT(*)::int FROM manpower_requirements
      WHERE manufacturer_id = ${manufacturer.id}
        AND status IN ('PUBLISHED', 'APPLICATIONS_OPEN', 'SELECTED', 'IN_PROGRESS')
    `;

    const [{ count: applicationsReceived }] = await sql`
      SELECT COUNT(app.id)::int FROM applications app
      JOIN manpower_requirements mr ON mr.id = app.requirement_id
      WHERE mr.manufacturer_id = ${manufacturer.id}
    `;

    const [{ count: selectedContractors }] = await sql`
      SELECT COUNT(app.id)::int FROM applications app
      JOIN manpower_requirements mr ON mr.id = app.requirement_id
      WHERE mr.manufacturer_id = ${manufacturer.id} AND app.status = 'SELECTED'
    `;

    const recentActivity = await sql`
      SELECT 
        'REQUIREMENT' AS type,
        mr.id,
        mr.title,
        mr.status,
        mr.created_at AS timestamp
      FROM manpower_requirements mr
      WHERE mr.manufacturer_id = ${manufacturer.id}
      ORDER BY mr.updated_at DESC
      LIMIT 5
    `;

    res.json({
      data: {
        activeRequirements,
        applicationsReceived,
        selectedContractors,
        recentActivity,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/business-portal/requirements
 */
export async function getRequirements(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const manufacturer = await getManufacturerProfile(req.user!.sub);
    const { status } = req.query;

    const statusFilter = status ? String(status).toUpperCase() : null;

    const requirements = await sql`
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
        mr.updated_at,
        COUNT(app.id)::int AS applications_count
      FROM manpower_requirements mr
      LEFT JOIN applications app ON app.requirement_id = mr.id
      WHERE mr.manufacturer_id = ${manufacturer.id}
        ${statusFilter ? sql`AND mr.status = ${statusFilter}` : sql``}
      GROUP BY mr.id
      ORDER BY mr.created_at DESC
    `;

    res.json({ data: requirements });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/business-portal/requirements/:id
 */
export async function getRequirementById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const manufacturer = await getManufacturerProfile(req.user!.sub);

    const [requirement] = await sql`
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
        mr.updated_at,
        COUNT(app.id)::int AS applications_count
      FROM manpower_requirements mr
      LEFT JOIN applications app ON app.requirement_id = mr.id
      WHERE mr.id = ${id} AND mr.manufacturer_id = ${manufacturer.id}
      GROUP BY mr.id
    `;

    if (!requirement) {
      const err: AppError = new Error('Requirement not found');
      err.statusCode = 404;
      return next(err);
    }

    res.json({ data: requirement });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/business-portal/requirements
 */
export async function createRequirement(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const manufacturer = await getManufacturerProfile(req.user!.sub);
    const parsed = createRequirementSchema.safeParse(req.body);

    if (!parsed.success) {
      const err: AppError = new Error(parsed.error.issues[0]?.message ?? 'Invalid requirement data');
      err.statusCode = 400;
      return next(err);
    }

    const data = parsed.data;
    const initialStatus = data.action === 'publish' ? 'PUBLISHED' : 'DRAFT';
    const publishedAt = data.action === 'publish' ? new Date().toISOString() : null;

    const [requirement] = await sql`
      INSERT INTO manpower_requirements (
        manufacturer_id,
        title,
        description,
        industry,
        location,
        workers_required,
        required_skills,
        start_date,
        duration,
        experience_required,
        budget_min,
        budget_max,
        status,
        published_at
      )
      VALUES (
        ${manufacturer.id},
        ${data.title},
        ${data.description ?? null},
        ${data.industry ?? null},
        ${data.location},
        ${data.workersRequired},
        ${sql.array(data.requiredSkills)},
        ${data.startDate},
        ${data.duration},
        ${data.experienceRequired ?? null},
        ${data.budgetMin ?? null},
        ${data.budgetMax ?? null},
        ${initialStatus},
        ${publishedAt}
      )
      RETURNING *
    `;

    res.status(201).json({
      data: requirement,
      message: initialStatus === 'PUBLISHED' ? 'Requirement created and published!' : 'Requirement draft saved.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/business-portal/requirements/:id
 */
export async function updateRequirement(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const manufacturer = await getManufacturerProfile(req.user!.sub);

    const [existing] = await sql`
      SELECT id, status FROM manpower_requirements WHERE id = ${id} AND manufacturer_id = ${manufacturer.id}
    `;

    if (!existing) {
      const err: AppError = new Error('Requirement not found');
      err.statusCode = 404;
      return next(err);
    }

    const parsed = updateRequirementSchema.safeParse(req.body);
    if (!parsed.success) {
      const err: AppError = new Error(parsed.error.issues[0]?.message ?? 'Invalid requirement input');
      err.statusCode = 400;
      return next(err);
    }

    const data = parsed.data;
    const nextStatus = data.action === 'publish' ? 'PUBLISHED' : (data.action === 'draft' ? 'DRAFT' : existing.status);
    const publishedAt = data.action === 'publish' ? new Date().toISOString() : undefined;

    const [updated] = await sql`
      UPDATE manpower_requirements
      SET
        title = COALESCE(${data.title ?? null}, title),
        description = COALESCE(${data.description ?? null}, description),
        industry = COALESCE(${data.industry ?? null}, industry),
        location = COALESCE(${data.location ?? null}, location),
        workers_required = COALESCE(${data.workersRequired ?? null}, workers_required),
        required_skills = CASE WHEN ${data.requiredSkills !== undefined} THEN ${sql.array(data.requiredSkills || [])} ELSE required_skills END,
        start_date = COALESCE(${data.startDate ?? null}, start_date),
        duration = COALESCE(${data.duration ?? null}, duration),
        experience_required = COALESCE(${data.experienceRequired ?? null}, experience_required),
        budget_min = COALESCE(${data.budgetMin ?? null}, budget_min),
        budget_max = COALESCE(${data.budgetMax ?? null}, budget_max),
        status = ${nextStatus},
        published_at = COALESCE(${publishedAt ?? null}, published_at),
        updated_at = NOW()
      WHERE id = ${id} AND manufacturer_id = ${manufacturer.id}
      RETURNING *
    `;

    res.json({
      data: updated,
      message: nextStatus === 'PUBLISHED' ? 'Requirement published!' : 'Requirement updated.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/business-portal/requirements/:id/publish
 */
export async function publishRequirement(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const manufacturer = await getManufacturerProfile(req.user!.sub);

    const [updated] = await sql`
      UPDATE manpower_requirements
      SET
        status = 'PUBLISHED',
        published_at = NOW(),
        updated_at = NOW()
      WHERE id = ${id} AND manufacturer_id = ${manufacturer.id}
      RETURNING *
    `;

    if (!updated) {
      const err: AppError = new Error('Requirement not found');
      err.statusCode = 404;
      return next(err);
    }

    res.json({
      data: updated,
      message: 'Requirement published successfully!',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/business-portal/requirements/:id
 */
export async function deleteRequirement(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const manufacturer = await getManufacturerProfile(req.user!.sub);

    const [deleted] = await sql`
      DELETE FROM manpower_requirements
      WHERE id = ${id} AND manufacturer_id = ${manufacturer.id}
      RETURNING id
    `;

    if (!deleted) {
      const err: AppError = new Error('Requirement not found');
      err.statusCode = 404;
      return next(err);
    }

    res.json({ message: 'Requirement deleted successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/business-portal/requirements/:id/applications
 */
export async function getRequirementApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const manufacturer = await getManufacturerProfile(req.user!.sub);

    // Ensure requirement belongs to caller
    const [reqRow] = await sql`
      SELECT id, title FROM manpower_requirements WHERE id = ${id} AND manufacturer_id = ${manufacturer.id}
    `;

    if (!reqRow) {
      const err: AppError = new Error('Requirement not found');
      err.statusCode = 404;
      return next(err);
    }

    const applications = await sql`
      SELECT 
        app.id,
        app.requirement_id,
        app.contractor_id,
        app.proposed_workforce,
        app.availability_date,
        app.relevant_experience,
        app.message,
        app.proposed_rate,
        app.status AS application_status,
        app.created_at AS submitted_at,
        app.updated_at AS last_updated_at,
        cp.company_name AS contractor_name,
        cp.city AS contractor_city,
        cp.state AS contractor_state
      FROM applications app
      JOIN contractor_profiles cp ON cp.id = app.contractor_id
      WHERE app.requirement_id = ${id}
      ORDER BY app.created_at DESC
    `;

    res.json({ data: applications });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/business-portal/applications
 * Returns all applications submitted for requirements owned by logged-in manufacturer.
 */
export async function getAllApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const manufacturer = await getManufacturerProfile(req.user!.sub);
    const { requirement_id, status } = req.query;

    const reqIdFilter = requirement_id ? String(requirement_id) : null;
    const statusFilter = status ? String(status).toUpperCase() : null;

    const applications = await sql`
      SELECT 
        app.id,
        app.requirement_id,
        app.contractor_id,
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
        mr.workers_required AS requirement_workers_required,
        mr.status AS requirement_status,
        cp.company_name AS contractor_name,
        cp.city AS contractor_city,
        cp.state AS contractor_state
      FROM applications app
      JOIN manpower_requirements mr ON mr.id = app.requirement_id
      JOIN contractor_profiles cp ON cp.id = app.contractor_id
      WHERE mr.manufacturer_id = ${manufacturer.id}
        ${reqIdFilter ? sql`AND app.requirement_id = ${reqIdFilter}` : sql``}
        ${statusFilter ? sql`AND app.status = ${statusFilter}` : sql``}
      ORDER BY app.created_at DESC
    `;

    res.json({ data: applications });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/business-portal/applications/:id
 */
export async function getApplicationById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const manufacturer = await getManufacturerProfile(req.user!.sub);

    const [application] = await sql`
      SELECT 
        app.id,
        app.requirement_id,
        app.contractor_id,
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
        mr.required_skills AS requirement_required_skills,
        mr.start_date AS requirement_start_date,
        mr.duration AS requirement_duration,
        mr.status AS requirement_status,
        cp.company_name AS contractor_name,
        cp.city AS contractor_city,
        cp.state AS contractor_state
      FROM applications app
      JOIN manpower_requirements mr ON mr.id = app.requirement_id
      JOIN contractor_profiles cp ON cp.id = app.contractor_id
      WHERE app.id = ${id} AND mr.manufacturer_id = ${manufacturer.id}
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
 * PATCH /api/business-portal/applications/:id/status
 */
export async function updateApplicationStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const manufacturer = await getManufacturerProfile(req.user!.sub);

    const parsed = updateApplicationStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      const err: AppError = new Error(parsed.error.issues[0]?.message ?? 'Invalid application status');
      err.statusCode = 400;
      return next(err);
    }

    const { status: newStatus } = parsed.data;

    // Verify application belongs to caller's requirement
    const [appDetail] = await sql`
      SELECT
        app.id,
        app.requirement_id,
        app.contractor_id,
        app.status AS current_status,
        mr.title AS requirement_title,
        mr.manufacturer_id,
        cp.company_name AS contractor_name,
        cp.user_id AS contractor_user_id
      FROM applications app
      JOIN manpower_requirements mr ON mr.id = app.requirement_id
      JOIN contractor_profiles cp ON cp.id = app.contractor_id
      WHERE app.id = ${id} AND mr.manufacturer_id = ${manufacturer.id}
    `;

    if (!appDetail) {
      const err: AppError = new Error('Application not found');
      err.statusCode = 404;
      return next(err);
    }

    // Update application status
    const [updatedApp] = await sql`
      UPDATE applications
      SET status = ${newStatus}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, requirement_id, status, updated_at
    `;

    let responseMessage = `Application status updated to ${newStatus}.`;

    // Notify the contractor that owns this application — every status
    // transition, not just SELECTED, so "My Applications" status changes
    // are never silent on their side.
    if (appDetail.contractor_user_id) {
      await createNotification({
        userId: appDetail.contractor_user_id,
        type: 'APPLICATION_STATUS_CHANGED',
        title: `Application ${newStatus.replace('_', ' ')}`,
        message: `Your application for "${appDetail.requirement_title}" is now ${newStatus.replace('_', ' ')}.`,
        referenceId: appDetail.id,
      });
    }

    // If SELECTED: update requirement status and notify Craly Staff
    if (newStatus === 'SELECTED') {
      await sql`
        UPDATE manpower_requirements
        SET status = 'SELECTED', updated_at = NOW()
        WHERE id = ${appDetail.requirement_id}
      `;

      responseMessage = 'Contractor selected. Craly Staff will coordinate the next step.';

      // Fire notifications to Craly Staff roles
      const notifTitle = 'Contractor Selected';
      const notifMessage = `Manufacturer "${manufacturer.company_name}" selected contractor "${appDetail.contractor_name}" for requirement "${appDetail.requirement_title}". Action: Contractor Selected.`;

      await notifyUsersByRole('ops_head', {
        type: 'CONTRACTOR_SELECTED',
        title: notifTitle,
        message: notifMessage,
        referenceId: appDetail.id,
      });

      await notifyUsersByRole('field_staff', {
        type: 'CONTRACTOR_SELECTED',
        title: notifTitle,
        message: notifMessage,
        referenceId: appDetail.id,
      });

      await notifyUsersByRole('admin', {
        type: 'CONTRACTOR_SELECTED',
        title: notifTitle,
        message: notifMessage,
        referenceId: appDetail.id,
      });
    }

    res.json({
      data: updatedApp,
      message: responseMessage,
    });
  } catch (err) {
    next(err);
  }
}
