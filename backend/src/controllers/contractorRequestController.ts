import { Request, Response, NextFunction } from 'express';
import sql from '../db/index';
import {
  createContractorRequestSchema,
  updateContractorRequestStatusSchema,
} from '../validators/contractorRequestValidators';
import { notifyUsersByRole } from '../utils/notifications';
import type { AppError } from '../middlewares/errorHandler';

function notFound(message: string): AppError {
  const err: AppError = new Error(message);
  err.statusCode = 404;
  return err;
}
function badRequest(message: string): AppError {
  const err: AppError = new Error(message);
  err.statusCode = 400;
  return err;
}

async function logAudit(adminId: string, action: string, targetId: string, reason?: string): Promise<void> {
  await sql`
    INSERT INTO audit_logs (admin_id, action, target_type, target_id, reason)
    VALUES (${adminId}, ${action}, 'contractor_onboarding_request', ${targetId}, ${reason ?? null})
  `;
}

/**
 * POST /api/contractor-requests
 * Public — "List Your Company". No auth, no users row, no password. This
 * is a lead: Field Staff review it and, if it goes anywhere, create the
 * real contractor_profiles record themselves (see startContractorProfile).
 */
export async function createContractorRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = createContractorRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      const err: AppError = new Error(parsed.error.issues[0]?.message ?? 'Invalid input');
      err.statusCode = 400;
      return next(err);
    }
    const { companyName, contactPerson, phone, email, city, industry, workforceCount, skills, yearsExperience, message } = parsed.data;

    const [request] = await sql`
      INSERT INTO contractor_onboarding_requests (
        company_name, contact_person, phone, email, city, industry,
        workforce_count, skills, years_experience, message
      ) VALUES (
        ${companyName}, ${contactPerson}, ${phone}, ${email || null}, ${city}, ${industry},
        ${workforceCount ?? null}, ${skills ?? null}, ${yearsExperience ?? null}, ${message ?? null}
      )
      RETURNING id
    `;

    res.status(201).json({ data: { id: request.id } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/contractor-requests
 * Field Staff / Ops Head / Admin — optional ?status= filter for the queue.
 * LEFT JOINs the assigned staff member's email so the queue can show
 * "assigned field staff" (spec §3) without a second round trip.
 */
export async function listContractorRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;

    const rows = await sql`
      SELECT r.*, u.email AS assigned_to_email
      FROM contractor_onboarding_requests r
      LEFT JOIN users u ON u.id = r.assigned_to
      WHERE (${status ?? null}::text IS NULL OR r.status = ${status ?? null})
      ORDER BY r.created_at DESC
    `;
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/contractor-requests/:id
 * Adds the assigned staff email and an activity timeline sourced from the
 * shared `audit_logs` table (this request's own actions, plus the linked
 * contractor's, once one exists) — no separate audit trail (spec §4/§10).
 */
export async function getContractorRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const [row] = await sql`
      SELECT r.*, u.email AS assigned_to_email
      FROM contractor_onboarding_requests r
      LEFT JOIN users u ON u.id = r.assigned_to
      WHERE r.id = ${id}
    `;
    if (!row) return next(notFound('Request not found'));

    const activity = await sql`
      SELECT al.id, al.action, al.reason, al.created_at, al.target_type, u.email AS actor_email
      FROM audit_logs al
      JOIN users u ON u.id = al.admin_id
      WHERE al.target_id = ${id}
         OR (${row.contractor_profile_id ?? null}::uuid IS NOT NULL AND al.target_id = ${row.contractor_profile_id ?? null})
      ORDER BY al.created_at DESC
    `;

    res.json({ data: { ...row, activity } });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/contractor-requests/:id/status
 * Field Staff / Ops Head — move the request through [Contacted] / [Reject/Close] etc.
 */
export async function updateContractorRequestStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const parsed = updateContractorRequestStatusSchema.safeParse(req.body);
    if (!parsed.success) return next(badRequest(parsed.error.issues[0]?.message ?? 'Invalid status'));
    const { status, staffNotes } = parsed.data;

    const [updated] = await sql`
      UPDATE contractor_onboarding_requests SET
        status = ${status},
        staff_notes = COALESCE(${staffNotes ?? null}, staff_notes),
        assigned_to = COALESCE(assigned_to, ${req.user!.sub}),
        updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `;
    if (!updated) return next(notFound('Request not found'));

    await logAudit(req.user!.sub, `onboarding_request:${status}`, id, staffNotes);
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/contractor-requests/:id/start-profile
 * "[Start Profile]" — Field Staff / Ops Head. Creates the real
 * contractor_profiles record from the lead's data (not yet complete or
 * verified — onboarding_complete stays false until a human finishes and
 * verifies it), links the request to it, and advances the request to
 * PROFILE_IN_PROGRESS.
 */
export async function startContractorProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const [request] = await sql`SELECT * FROM contractor_onboarding_requests WHERE id = ${id}`;
    if (!request) return next(notFound('Request not found'));
    if (request.contractor_profile_id) {
      const err: AppError = new Error('A contractor profile has already been started for this request');
      err.statusCode = 400;
      return next(err);
    }

    const profile = await sql.begin(async (tx) => {
      const [row] = await tx`
        INSERT INTO contractor_profiles (
          company_name, phone, city, description, years_experience, workforce_size, created_by
        ) VALUES (
          ${request.company_name}, ${request.phone}, ${request.city}, ${request.message ?? null},
          ${request.years_experience ?? null}, ${request.workforce_count ?? null}, ${req.user!.sub}
        )
        RETURNING id
      `;

      await tx`
        UPDATE contractor_onboarding_requests SET
          status = 'PROFILE_IN_PROGRESS',
          contractor_profile_id = ${row.id},
          assigned_to = COALESCE(assigned_to, ${req.user!.sub}),
          updated_at = now()
        WHERE id = ${id}
      `;

      return row;
    });

    await logAudit(req.user!.sub, 'onboarding_request:start_profile', id);
    res.status(201).json({ data: { contractorProfileId: profile.id } });
  } catch (err) {
    next(err);
  }
}

// The same required-field set the frontend uses to compute profile
// completion % (spec §11) — kept here as the one server-side source of
// truth so "Submit for Operations Review" can't be reached with a profile
// the UI itself would call incomplete.
async function findMissingProfileFields(contractorId: string): Promise<string[]> {
  const [profile] = await sql`
    SELECT phone, city, years_experience, workforce_size, service_areas
    FROM contractor_profiles WHERE id = ${contractorId}
  `;
  if (!profile) return ['profile'];

  const missing: string[] = [];
  if (!profile.phone) missing.push('phone');
  if (!profile.city) missing.push('city');
  if (profile.years_experience === null) missing.push('yearsInBusiness');
  if (profile.workforce_size === null) missing.push('workforceCount');
  if (!profile.service_areas || profile.service_areas.length === 0) missing.push('serviceAreas');

  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM contractor_categories WHERE contractor_id = ${contractorId}`;
  if (count === 0) missing.push('categories');

  return missing;
}

/**
 * POST /api/contractor-requests/:id/submit-for-review
 * "Complete Data Collection" → "Submit for Operations Review" (spec §12).
 * Field Staff / Ops Head / Admin. Validates the linked contractor record is
 * actually complete, flips both lifecycles into their review states, logs
 * who/when, and hands the task off to every active Ops Head via a real
 * notification — Field Staff cannot change verification status after this.
 */
export async function submitContractorRequestForReview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const [request] = await sql`SELECT * FROM contractor_onboarding_requests WHERE id = ${id}`;
    if (!request) return next(notFound('Request not found'));
    if (!request.contractor_profile_id) {
      return next(badRequest('Start the contractor profile before submitting for review'));
    }

    const missing = await findMissingProfileFields(request.contractor_profile_id);
    if (missing.length > 0) {
      return next(badRequest(`Profile is missing required fields: ${missing.join(', ')}`));
    }

    // Deliberately does NOT touch contractor_profiles.verification_status —
    // that state machine (pending → under_review → verified/rejected/etc.)
    // belongs to the Ops Head verification module, which is explicitly out
    // of this task's scope (spec §20 "verification logic itself"). It's
    // already 'pending' by default from creation, which is exactly what the
    // existing verification queue looks for; this endpoint's job is only to
    // flip the *request's* own lifecycle and hand off the notification.
    const [contractor] = await sql`SELECT id, company_name FROM contractor_profiles WHERE id = ${request.contractor_profile_id}`;
    if (!contractor) return next(notFound('Linked contractor profile not found'));

    await sql`
      UPDATE contractor_onboarding_requests SET status = 'SUBMITTED_FOR_REVIEW', updated_at = now()
      WHERE id = ${id}
    `;

    await logAudit(req.user!.sub, 'onboarding_request:submitted_for_review', id);
    await sql`
      INSERT INTO audit_logs (admin_id, action, target_type, target_id)
      VALUES (${req.user!.sub}, 'profile:submitted_for_review', 'contractor', ${contractor.id})
    `;

    await notifyUsersByRole('ops_head', {
      type: 'PROFILE_SUBMITTED_FOR_REVIEW',
      title: 'Contractor profile ready for review',
      message: `${contractor.company_name} was submitted for verification review.`,
      referenceId: contractor.id,
    });

    res.json({ data: { requestId: id, contractorId: contractor.id, status: 'SUBMITTED_FOR_REVIEW' } });
  } catch (err) {
    next(err);
  }
}
