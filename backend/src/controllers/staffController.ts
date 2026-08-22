import { Request, Response, NextFunction } from 'express';
import sql from '../db/index';
import { z } from 'zod';
import type { AppError } from '../middlewares/errorHandler';

// Schema for adding a new contractor profile
const createContractorSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  contactPerson: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  industry: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  workforceSize: z.union([z.number(), z.string().transform((v) => parseInt(v, 10))]).optional(),
  yearsExperience: z.union([z.number(), z.string().transform((v) => parseInt(v, 10))]).optional(),
  skills: z.array(z.string()).optional(),
  serviceAreas: z.array(z.string()).optional(),
  availability: z.enum(['AVAILABLE', 'CURRENTLY_AT_CAPACITY', 'NOT_AVAILABLE', 'PAUSED', 'SUSPENDED']).optional(),
  notes: z.string().optional(),
});

// Schema for updating a contractor profile
const updateContractorSchema = z.object({
  companyName: z.string().min(1).optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  workforceSize: z.union([z.number(), z.string().transform((v) => parseInt(v, 10))]).optional(),
  yearsExperience: z.union([z.number(), z.string().transform((v) => parseInt(v, 10))]).optional(),
  description: z.string().optional(),
  availability: z.enum(['AVAILABLE', 'CURRENTLY_AT_CAPACITY', 'NOT_AVAILABLE', 'PAUSED', 'SUSPENDED']).optional(),
  availabilityNote: z.string().optional(),
  serviceAreas: z.array(z.string()).optional(),
  notes: z.string().optional(),
  verificationStatus: z.enum(['unverified', 'pending', 'verified']).optional(),
});

// Schema for updating engagement status
const updateEngagementStatusSchema = z.object({
  status: z.enum(['SELECTED', 'CONTACTING', 'IN_DISCUSSION', 'CONFIRMED', 'CLOSED']),
});

/**
 * GET /api/staff/dashboard-stats
 * Metrics summary for Craly Staff dashboard.
 */
export async function getStaffDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [{ count: totalContractors }] = await sql`SELECT COUNT(*)::int FROM contractor_profiles`;
    const [{ count: recentlyAddedCount }] = await sql`
      SELECT COUNT(*)::int FROM contractor_profiles WHERE created_at >= NOW() - INTERVAL '30 days'
    `;
    const [{ count: pendingEngagementsCount }] = await sql`
      SELECT COUNT(*)::int FROM applications WHERE status IN ('SELECTED', 'UNDER_REVIEW', 'SHORTLISTED')
    `;

    const [{ count: unreadNotificationsCount }] = await sql`
      SELECT COUNT(*)::int FROM notifications WHERE user_id = ${req.user!.sub} AND is_read = false
    `;

    const recentContractors = await sql`
      SELECT id, company_name, city, state, workforce_size, availability, created_at
      FROM contractor_profiles
      ORDER BY created_at DESC
      LIMIT 5
    `;

    const recentNotifications = await sql`
      SELECT id, type, title, message, reference_id, is_read, created_at
      FROM notifications
      WHERE user_id = ${req.user!.sub}
      ORDER BY created_at DESC
      LIMIT 5
    `;

    res.json({
      data: {
        totalContractors,
        recentlyAddedCount,
        pendingEngagementsCount,
        unreadNotificationsCount,
        recentContractors,
        recentNotifications,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/staff/contractors
 * Returns list of contractor profiles with search and filter support.
 */
export async function getContractors(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const q = (req.query.q as string) || '';
    const city = (req.query.city as string) || '';
    const availability = (req.query.availability as string) || '';
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '20', 10);
    const offset = (page - 1) * limit;

    const contractors = await sql`
      SELECT 
        cp.id,
        cp.company_name,
        cp.phone,
        cp.city,
        cp.state,
        cp.workforce_size,
        cp.years_experience,
        cp.availability,
        cp.availability_note,
        cp.verification_status,
        cp.created_at,
        cp.updated_at
      FROM contractor_profiles cp
      WHERE (${q} = '' OR cp.company_name ILIKE ${'%' + q + '%'} OR cp.city ILIKE ${'%' + q + '%'})
        AND (${city} = '' OR cp.city ILIKE ${'%' + city + '%'})
        AND (${availability} = '' OR cp.availability = ${availability})
      ORDER BY cp.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [{ count: total }] = await sql`
      SELECT COUNT(*)::int
      FROM contractor_profiles cp
      WHERE (${q} = '' OR cp.company_name ILIKE ${'%' + q + '%'} OR cp.city ILIKE ${'%' + q + '%'})
        AND (${city} = '' OR cp.city ILIKE ${'%' + city + '%'})
        AND (${availability} = '' OR cp.availability = ${availability})
    `;

    res.json({
      data: contractors,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/staff/contractors
 * Creates a new contractor profile record directly by Staff.
 */
export async function createContractor(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = createContractorSchema.safeParse(req.body);
    if (!parsed.success) {
      const err: AppError = new Error(parsed.error.issues[0]?.message ?? 'Invalid contractor data');
      err.statusCode = 400;
      return next(err);
    }

    const {
      companyName,
      phone,
      industry,
      city,
      state,
      workforceSize,
      yearsExperience,
      serviceAreas,
      availability,
      notes,
    } = parsed.data;

    const [contractor] = await sql`
      INSERT INTO contractor_profiles (
        company_name, phone, description, city, state, workforce_size,
        years_experience, service_areas, availability, availability_note,
        verification_status, created_by
      )
      VALUES (
        ${companyName}, ${phone || null}, ${industry || null}, ${city || null}, ${state || null},
        ${workforceSize || null}, ${yearsExperience || null}, ${serviceAreas || null},
        ${availability || 'AVAILABLE'}, ${notes || null}, 'pending', ${req.user!.sub}
      )
      RETURNING id, company_name, city, state, workforce_size, availability, created_at
    `;

    res.status(201).json({
      data: contractor,
      message: 'Contractor profile created successfully.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/staff/contractors/:id
 * Single contractor detail view.
 */
export async function getContractorById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const [contractor] = await sql`
      SELECT 
        cp.id,
        cp.company_name,
        cp.description,
        cp.phone,
        cp.city,
        cp.state,
        cp.workforce_size,
        cp.years_experience,
        cp.availability,
        cp.availability_note,
        cp.service_areas,
        cp.verification_status,
        cp.verification_note,
        cp.overall_rating,
        cp.created_at,
        cp.updated_at
      FROM contractor_profiles cp
      WHERE cp.id = ${id}
    `;

    if (!contractor) {
      const err: AppError = new Error('Contractor not found');
      err.statusCode = 404;
      return next(err);
    }

    res.json({ data: contractor });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/staff/contractors/:id
 * Update contractor profile information.
 */
export async function updateContractor(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const parsed = updateContractorSchema.safeParse(req.body);
    if (!parsed.success) {
      const err: AppError = new Error(parsed.error.issues[0]?.message ?? 'Invalid update data');
      err.statusCode = 400;
      return next(err);
    }

    const [existing] = await sql`SELECT id FROM contractor_profiles WHERE id = ${id}`;
    if (!existing) {
      const err: AppError = new Error('Contractor not found');
      err.statusCode = 404;
      return next(err);
    }

    const {
      companyName,
      phone,
      city,
      state,
      workforceSize,
      yearsExperience,
      description,
      availability,
      availabilityNote,
      serviceAreas,
      notes,
    } = parsed.data;

    const [updated] = await sql`
      UPDATE contractor_profiles
      SET
        company_name = COALESCE(${companyName ?? null}, company_name),
        phone = COALESCE(${phone ?? null}, phone),
        city = COALESCE(${city ?? null}, city),
        state = COALESCE(${state ?? null}, state),
        workforce_size = COALESCE(${workforceSize ?? null}, workforce_size),
        years_experience = COALESCE(${yearsExperience ?? null}, years_experience),
        description = COALESCE(${description ?? null}, description),
        availability = COALESCE(${availability ?? null}, availability),
        availability_note = COALESCE(${availabilityNote ?? notes ?? null}, availability_note),
        service_areas = COALESCE(${serviceAreas ?? null}, service_areas),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    res.json({
      data: updated,
      message: 'Contractor profile updated successfully.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/staff/engagements
 * Returns selection engagements for staff coordination.
 */
export async function getStaffEngagements(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const engagements = await sql`
      SELECT 
        app.id AS application_id,
        app.status AS application_status,
        app.proposed_workforce,
        app.availability_date,
        app.proposed_rate,
        app.created_at AS selection_date,
        mr.id AS requirement_id,
        mr.title AS requirement_title,
        mr.location AS requirement_location,
        mr.workers_required AS requirement_workers_required,
        bp.company_name AS manufacturer_name,
        bp.city AS manufacturer_city,
        cp.id AS contractor_id,
        cp.company_name AS contractor_name,
        cp.phone AS contractor_phone
      FROM applications app
      JOIN manpower_requirements mr ON mr.id = app.requirement_id
      JOIN business_profiles bp ON bp.id = mr.manufacturer_id
      JOIN contractor_profiles cp ON cp.id = app.contractor_id
      ORDER BY app.updated_at DESC
    `;

    res.json({ data: engagements });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/staff/engagements/:id/status
 * Update engagement status (e.g. CONTACTING, IN_DISCUSSION, CONFIRMED, CLOSED).
 */
export async function updateEngagementStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const parsed = updateEngagementStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      const err: AppError = new Error('Invalid engagement status');
      err.statusCode = 400;
      return next(err);
    }

    const { status } = parsed.data;

    const [updated] = await sql`
      UPDATE applications
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, status, updated_at
    `;

    if (!updated) {
      const err: AppError = new Error('Engagement/Application not found');
      err.statusCode = 404;
      return next(err);
    }

    res.json({
      data: updated,
      message: `Engagement status updated to ${status}`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/staff/notifications
 * Returns notifications for Staff.
 */
export async function getStaffNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const notifications = await sql`
      SELECT id, type, title, message, reference_id, is_read, created_at
      FROM notifications
      WHERE user_id = ${req.user!.sub}
      ORDER BY created_at DESC
    `;

    res.json({ data: notifications });
  } catch (err) {
    next(err);
  }
}
