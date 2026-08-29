import { Request, Response, NextFunction } from 'express';
import sql from '../db/index';
import { z } from 'zod';
import type { AppError } from '../middlewares/errorHandler';
import { getSignedGetUrl } from '../utils/r2';
import { toPgTextArrayLiteral } from '../utils/pgArray';
import { createNotification } from '../utils/notifications';
import { logAudit } from '../utils/auditLog';
import { hashPassword } from '../utils/password';

// Schema for adding a new contractor profile. email + password are now
// required — Staff sets a temporary password directly so the account is
// login-ready immediately (product decision: a contractor Staff adds must
// be able to log in and apply to opportunities themselves, not just exist
// as an unreachable directory record).
const createContractorSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  contactPerson: z.string().optional(),
  email: z.string().email('A valid email is required to create a login'),
  password: z.string().min(8, 'Temporary password must be at least 8 characters'),
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

// Schema for unlisting / relisting a contractor
const updateContractorListingSchema = z.object({
  isUnlisted: z.boolean(),
  reason: z.string().optional(),
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
    const listingStatus = (req.query.listingStatus as string) || '';
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
        cp.is_unlisted,
        cp.unlisted_reason,
        cp.unlisted_at,
        cp.created_at,
        cp.updated_at
      FROM contractor_profiles cp
      WHERE (${q} = '' OR cp.company_name ILIKE ${'%' + q + '%'} OR cp.city ILIKE ${'%' + q + '%'})
        AND (${city} = '' OR cp.city ILIKE ${'%' + city + '%'})
        AND (${availability} = '' OR cp.availability = ${availability})
        AND (${listingStatus} = '' OR (${listingStatus} = 'unlisted' AND cp.is_unlisted = true) OR (${listingStatus} = 'listed' AND cp.is_unlisted = false))
      ORDER BY cp.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [{ count: total }] = await sql`
      SELECT COUNT(*)::int
      FROM contractor_profiles cp
      WHERE (${q} = '' OR cp.company_name ILIKE ${'%' + q + '%'} OR cp.city ILIKE ${'%' + q + '%'})
        AND (${city} = '' OR cp.city ILIKE ${'%' + city + '%'})
        AND (${availability} = '' OR cp.availability = ${availability})
        AND (${listingStatus} = '' OR (${listingStatus} = 'unlisted' AND cp.is_unlisted = true) OR (${listingStatus} = 'listed' AND cp.is_unlisted = false))
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
      email,
      password,
      phone,
      industry,
      skills,
      city,
      state,
      workforceSize,
      yearsExperience,
      serviceAreas,
      availability,
      notes,
    } = parsed.data;

    const existingUser = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existingUser.length > 0) {
      const err: AppError = new Error('An account with this email already exists');
      err.statusCode = 409;
      return next(err);
    }

    const passwordHash = await hashPassword(password);

    // Creates a real login (users row) alongside the profile — a
    // Staff-added contractor must be able to sign in and use the
    // Contractor Portal themselves (apply to opportunities, manage KYC),
    // not just exist as a directory record Staff edits on their behalf.
    const contractor = await sql.begin(async (tx) => {
      const [newUser] = await tx`
        INSERT INTO users (email, password_hash, role, is_active)
        VALUES (${email}, ${passwordHash}, 'contractor', true)
        RETURNING id
      `;

      const [profile] = await tx`
        INSERT INTO contractor_profiles (
          user_id, company_name, phone, description, industry, skills, city, state, workforce_size,
          years_experience, service_areas, availability, availability_note,
          verification_status, onboarding_complete, created_by
        )
        VALUES (
          ${newUser.id}, ${companyName}, ${phone || null}, ${industry || null}, ${industry || null}, ${toPgTextArrayLiteral(skills || [])}::text[], ${city || null}, ${state || null},
          ${workforceSize || null}, ${yearsExperience || null}, ${serviceAreas || null},
          ${availability || 'AVAILABLE'}, ${notes || null}, 'pending', true, ${req.user!.sub}
        )
        RETURNING id, company_name, city, state, workforce_size, availability, created_at
      `;

      await tx`
        INSERT INTO organization_members (user_id, contractor_profile_id, org_role, status)
        VALUES (${newUser.id}, ${profile.id}, 'admin', 'active')
        ON CONFLICT DO NOTHING
      `;

      return profile;
    });

    await logAudit(req.user!.sub, 'contractor:created_with_login', 'contractor_profile', contractor.id, undefined, { email });

    res.status(201).json({
      data: contractor,
      message: `Contractor profile created with a login for ${email}. Share the temporary password with them directly.`,
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
        cp.is_unlisted,
        cp.unlisted_reason,
        cp.unlisted_at,
        cp.unlisted_by,
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
 * PATCH /api/staff/contractors/:id/listing
 * Staff & Admin endpoint to unlist or relist a contractor profile.
 */
export async function updateContractorListingStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const parsed = updateContractorListingSchema.safeParse(req.body);
    if (!parsed.success) {
      const err: AppError = new Error(parsed.error.issues[0]?.message ?? 'Invalid listing status data');
      err.statusCode = 400;
      return next(err);
    }

    const { isUnlisted, reason } = parsed.data;

    const [existing] = await sql`
      SELECT id, user_id, company_name, is_unlisted, unlisted_reason
      FROM contractor_profiles
      WHERE id = ${id}
    `;
    if (!existing) {
      const err: AppError = new Error('Contractor not found');
      err.statusCode = 404;
      return next(err);
    }

    const [updated] = await sql`
      UPDATE contractor_profiles
      SET is_unlisted = ${isUnlisted},
          unlisted_reason = ${isUnlisted ? (reason?.trim() || null) : null},
          unlisted_at = ${isUnlisted ? sql`NOW()` : null},
          unlisted_by = ${isUnlisted ? req.user!.sub : null},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, company_name, is_unlisted, unlisted_reason, unlisted_at, unlisted_by, updated_at
    `;

    // Audit log
    await logAudit(
      req.user!.sub,
      isUnlisted ? 'contractor:unlisted' : 'contractor:relisted',
      'contractor_profile',
      id,
      reason?.trim() || undefined,
      {
        previous: { is_unlisted: existing.is_unlisted, unlisted_reason: existing.unlisted_reason },
        current: { is_unlisted: isUnlisted, unlisted_reason: reason?.trim() || null },
      }
    );

    // Notify contractor user if associated
    if (existing.user_id) {
      await createNotification({
        userId: existing.user_id,
        type: isUnlisted ? 'CONTRACTOR_UNLISTED' : 'CONTRACTOR_RELISTED',
        title: isUnlisted ? 'Contractor Profile Unlisted' : 'Contractor Profile Relisted',
        message: isUnlisted
          ? `Your contractor profile has been unlisted from public discovery.${reason?.trim() ? ` Reason: ${reason.trim()}` : ''}`
          : 'Your contractor profile has been relisted and is now discoverable on the public directory.',
        referenceId: id,
      });
    }

    res.json({
      data: updated,
      message: isUnlisted
        ? `Contractor "${existing.company_name}" has been unlisted.`
        : `Contractor "${existing.company_name}" has been relisted and is now public.`,
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
    // Only applications the manufacturer has actually SELECTED (or that are
    // already further along in staff coordination) become an "engagement" —
    // a merely-submitted application isn't Staff's concern yet. This is
    // also the one query in the app authorized to return both parties'
    // contact details together: manufacturer phone/email and contractor
    // phone/email, joined via users for email. Never reuse this join
    // pattern in a manufacturer- or contractor-facing endpoint.
    const engagements = await sql`
      SELECT
        app.id AS application_id,
        app.status AS application_status,
        app.proposed_workforce,
        app.availability_date,
        app.proposed_rate,
        app.updated_at AS selection_date,
        mr.id AS requirement_id,
        mr.title AS requirement_title,
        mr.location AS requirement_location,
        mr.workers_required AS requirement_workers_required,
        bp.company_name AS manufacturer_name,
        bp.city AS manufacturer_city,
        bp.phone AS manufacturer_phone,
        bu.email AS manufacturer_email,
        cp.id AS contractor_id,
        cp.company_name AS contractor_name,
        cp.phone AS contractor_phone,
        cu.email AS contractor_email
      FROM applications app
      JOIN manpower_requirements mr ON mr.id = app.requirement_id
      JOIN business_profiles bp ON bp.id = mr.manufacturer_id
      LEFT JOIN users bu ON bu.id = bp.user_id
      JOIN contractor_profiles cp ON cp.id = app.contractor_id
      LEFT JOIN users cu ON cu.id = cp.user_id
      WHERE app.status IN ('SELECTED', 'CONTACTING', 'IN_DISCUSSION', 'CONFIRMED', 'CLOSED')
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
const ENGAGEMENT_STATUSES = ['SELECTED', 'CONTACTING', 'IN_DISCUSSION', 'CONFIRMED', 'CLOSED'];

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

    // An engagement only exists once the manufacturer has already SELECTED
    // a contractor — this guards against fast-forwarding a merely-submitted
    // application straight to CONFIRMED without that step happening first.
    const [existing] = await sql`
      SELECT id, status, requirement_id, contractor_id FROM applications WHERE id = ${id}
    `;
    if (!existing) {
      const err: AppError = new Error('Engagement/Application not found');
      err.statusCode = 404;
      return next(err);
    }
    if (!ENGAGEMENT_STATUSES.includes(existing.status)) {
      const err: AppError = new Error('This application has not been selected by the manufacturer yet — nothing for Staff to coordinate.');
      err.statusCode = 400;
      return next(err);
    }

    const [updated] = await sql`
      UPDATE applications
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, status, updated_at
    `;

    // Deal confirmed is a real milestone for the contractor — worth a
    // notification. The intermediate CONTACTING/IN_DISCUSSION steps are
    // Staff's own working states and don't need to ping either party.
    if (status === 'CONFIRMED') {
      const [contractor] = await sql`SELECT user_id FROM contractor_profiles WHERE id = ${existing.contractor_id}`;
      if (contractor?.user_id) {
        await createNotification({
          userId: contractor.user_id,
          type: 'ENGAGEMENT_CONFIRMED',
          title: 'Deal confirmed',
          message: 'Craly Staff has confirmed your engagement. They will be in touch to finalize the details.',
          referenceId: id,
        });
      }
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

/**
 * GET /api/staff/verification/contractors
 * Returns contractors requiring KYC / Document review with status filter support.
 */
export async function getStaffVerificationContractors(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const statusFilter = (req.query.status as string) || '';

    const contractors = await sql`
      SELECT 
        cp.id,
        cp.company_name,
        cp.city,
        cp.state,
        cp.phone,
        cp.verification_status,
        cp.verification_note,
        cp.created_at,
        cp.user_id,
        u.email AS user_email,
        COALESCE(doc_counts.pending_count, 0)::int AS pending_docs_count,
        COALESCE(doc_counts.total_count, 0)::int AS total_docs_count,
        doc_counts.last_submitted_at
      FROM contractor_profiles cp
      LEFT JOIN users u ON u.id = cp.user_id
      LEFT JOIN (
        SELECT 
          contractor_id,
          COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
          COUNT(*)::int AS total_count,
          MAX(created_at) AS last_submitted_at
        FROM contractor_documents
        GROUP BY contractor_id
      ) doc_counts ON doc_counts.contractor_id = cp.id
      WHERE (${statusFilter} = '' OR cp.verification_status = ${statusFilter})
      ORDER BY 
        CASE WHEN cp.verification_status IN ('pending', 'under_review') THEN 0 ELSE 1 END,
        doc_counts.last_submitted_at DESC NULLS LAST,
        cp.created_at DESC
    `;

    res.json({ data: contractors });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/staff/verification/contractors/:id
 * Returns contractor basic info, uploaded documents, and verification review history for Staff review.
 */
export async function getStaffVerificationContractorById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const [contractor] = await sql`
      SELECT 
        cp.id, cp.company_name, cp.phone, cp.city, cp.state, cp.industry,
        cp.workforce_size, cp.years_experience, cp.verification_status,
        cp.verification_note, cp.last_verified_at, cp.created_at, cp.user_id,
        cp.description, cp.skills, cp.service_areas,
        u.email AS user_email
      FROM contractor_profiles cp
      LEFT JOIN users u ON u.id = cp.user_id
      WHERE cp.id = ${id}
    `;

    if (!contractor) {
      const err: AppError = new Error('Contractor not found');
      err.statusCode = 404;
      return next(err);
    }

    const documents = await sql`
      SELECT 
        d.id, d.document_type, d.file_name, d.mime_type, d.size_bytes, d.status,
        d.issue_date, d.expiry_date, d.created_at, d.updated_at,
        d.metadata->>'reviewer_note' AS reviewer_note
      FROM contractor_documents d
      WHERE d.contractor_id = ${id}
      ORDER BY d.created_at DESC
    `;

    const reviewHistory = await sql`
      SELECT 
        vr.id, vr.status, vr.notes, vr.created_at,
        u.email AS reviewer_email
      FROM verification_reviews vr
      LEFT JOIN users u ON u.id = vr.reviewer_admin_id
      WHERE vr.contractor_id = ${id}
      ORDER BY vr.created_at DESC
    `;

    res.json({
      data: {
        contractor,
        documents,
        reviewHistory,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/staff/verification/contractors/:id/documents/:documentId/signed-url
 * Mints temporary (120s) presigned R2 URL for Staff to view/download contractor document.
 */
export async function getStaffDocumentSignedUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: contractorId, documentId } = req.params;

    const [doc] = await sql`
      SELECT id, document_type, storage_key FROM contractor_documents
      WHERE id = ${documentId} AND contractor_id = ${contractorId}
    `;

    if (!doc) {
      const err: AppError = new Error('Document not found');
      err.statusCode = 404;
      return next(err);
    }

    const intent = req.query.intent === 'download' ? 'download' : 'view';
    const url = await getSignedGetUrl(doc.storage_key, 120);

    await logAudit(req.user!.sub, `document:${intent}`, 'contractor_document', documentId, undefined, { contractorId });

    res.json({ data: { url, expiresInSeconds: 120 } });
  } catch (err) {
    next(err);
  }
}

const reviewStaffDocumentSchema = z.object({
  decision: z.enum(['approved', 'rejected', 'replacement_requested']),
  note: z.string().trim().max(1000).optional(),
}).superRefine((val, ctx) => {
  if (val.decision !== 'approved' && !val.note) {
    ctx.addIssue({ code: 'custom', message: 'A reason/note is required when rejecting or requesting replacement', path: ['note'] });
  }
});

/**
 * PATCH /api/staff/verification/contractors/:id/documents/:documentId/review
 * Staff reviews a contractor document (Approve, Reject, Request Replacement).
 */
export async function reviewStaffDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: contractorId, documentId } = req.params;
    const parsed = reviewStaffDocumentSchema.safeParse(req.body);
    if (!parsed.success) {
      const err: AppError = new Error(parsed.error.issues[0]?.message ?? 'Invalid review input');
      err.statusCode = 400;
      return next(err);
    }

    const { decision, note } = parsed.data;

    const [doc] = await sql`
      SELECT id, contractor_id, document_type, file_name FROM contractor_documents
      WHERE id = ${documentId} AND contractor_id = ${contractorId}
    `;

    if (!doc) {
      const err: AppError = new Error('Document not found');
      err.statusCode = 404;
      return next(err);
    }

    // Update document status and store reviewer note in metadata
    const [updatedDoc] = await sql`
      UPDATE contractor_documents
      SET 
        status = ${decision},
        metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{reviewer_note}', to_jsonb(${note ?? ''}::text)),
        updated_at = now()
      WHERE id = ${documentId} AND contractor_id = ${contractorId}
      RETURNING id, document_type, status
    `;

    // Log review in verification_reviews table
    await sql`
      INSERT INTO verification_reviews (contractor_id, reviewer_admin_id, status, notes)
      VALUES (${contractorId}, ${req.user!.sub}, ${decision}, ${note ?? null})
    `;

    // Determine overall contractor verification status update based on all documents
    const allDocs = await sql`
      SELECT status FROM contractor_documents WHERE contractor_id = ${contractorId}
    `;

    let overallStatus = 'under_review';
    if (allDocs.some((d) => d.status === 'rejected')) {
      overallStatus = 'rejected';
    } else if (allDocs.some((d) => d.status === 'replacement_requested')) {
      overallStatus = 'needs_changes';
    } else if (allDocs.length > 0 && allDocs.every((d) => d.status === 'approved')) {
      overallStatus = 'verified';
    }

    await sql`
      UPDATE contractor_profiles
      SET 
        verification_status = ${overallStatus},
        verification_note = ${note ?? null},
        last_verified_at = CASE WHEN ${overallStatus} = 'verified' THEN now() ELSE last_verified_at END,
        updated_at = now()
      WHERE id = ${contractorId}
    `;

    // Send in-app notification to contractor user if bound
    const [contractor] = await sql`
      SELECT user_id FROM contractor_profiles WHERE id = ${contractorId}
    `;

    if (contractor?.user_id) {
      let title = 'KYC Document Update';
      let message = `Your document "${doc.file_name}" status was updated to ${decision.replace('_', ' ')}.`;

      if (decision === 'approved') {
        title = 'KYC Document Approved';
        message = `Your ${doc.document_type.replace('_', ' ')} document (${doc.file_name}) has been approved by Craly Staff.`;
      } else if (decision === 'rejected') {
        title = 'KYC Document Rejected';
        message = `Your ${doc.document_type.replace('_', ' ')} document (${doc.file_name}) was rejected. Reason: ${note}`;
      } else if (decision === 'replacement_requested') {
        title = 'Document Replacement Required';
        message = `Replacement requested for ${doc.document_type.replace('_', ' ')} document (${doc.file_name}). Reason: ${note}`;
      }

      await createNotification({
        userId: contractor.user_id,
        type: 'KYC_DOCUMENT_REVIEW',
        title,
        message,
        referenceId: documentId,
      });
    }

    await logAudit(req.user!.sub, `document:${decision}`, 'contractor_document', documentId, note, { contractorId });

    res.json({
      data: {
        document: updatedDoc,
        overallContractorStatus: overallStatus,
      },
    });
  } catch (err) {
    next(err);
  }
}

const updateOverallVerificationSchema = z.object({
  status: z.enum(['pending', 'under_review', 'verified', 'rejected', 'needs_changes']),
  note: z.string().trim().max(1000).optional(),
});

/**
 * PATCH /api/staff/verification/contractors/:id/status
 * Staff updates overall contractor verification status directly.
 */
export async function updateStaffContractorVerificationStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: contractorId } = req.params;
    const parsed = updateOverallVerificationSchema.safeParse(req.body);
    if (!parsed.success) {
      const err: AppError = new Error(parsed.error.issues[0]?.message ?? 'Invalid status input');
      err.statusCode = 400;
      return next(err);
    }

    const { status, note } = parsed.data;

    const [updated] = await sql`
      UPDATE contractor_profiles
      SET 
        verification_status = ${status},
        verification_note = ${note ?? null},
        last_verified_at = CASE WHEN ${status} = 'verified' THEN now() ELSE last_verified_at END,
        updated_at = now()
      WHERE id = ${contractorId}
      RETURNING id, company_name, verification_status, verification_note
    `;

    if (!updated) {
      const err: AppError = new Error('Contractor not found');
      err.statusCode = 404;
      return next(err);
    }

    await sql`
      INSERT INTO verification_reviews (contractor_id, reviewer_admin_id, status, notes)
      VALUES (${contractorId}, ${req.user!.sub}, ${status}, ${note ?? null})
    `;

    const [contractor] = await sql`
      SELECT user_id FROM contractor_profiles WHERE id = ${contractorId}
    `;

    if (contractor?.user_id) {
      await createNotification({
        userId: contractor.user_id,
        type: 'CONTRACTOR_VERIFICATION_STATUS',
        title: `Account Verification Status: ${status.replace('_', ' ').toUpperCase()}`,
        message: note ? `Your verification status was updated to ${status}. Feedback: ${note}` : `Your verification status was updated to ${status}.`,
        referenceId: contractorId,
      });
    }

    await logAudit(req.user!.sub, `verification:${status}`, 'contractor_profile', contractorId, note);

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}
