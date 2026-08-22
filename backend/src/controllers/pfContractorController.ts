import { Request, Response, NextFunction } from 'express';
import sql from '../db/index';
import {
  createPfContractorSchema,
  updatePfContractorSchema,
  updateVerificationSchema,
  updateAvailabilitySchema,
} from '../validators/pfContractorValidators';
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
  // Reuses the audit_logs table that already exists for the admin workspace,
  // rather than standing up a second competing audit trail.
  await sql`
    INSERT INTO audit_logs (admin_id, action, target_type, target_id, reason)
    VALUES (${adminId}, ${action}, 'contractor', ${targetId}, ${reason ?? null})
  `;
}

// Operates on `contractor_profiles`/`contractor_categories` — the table
// every other system (enquiries, messages, the public directory, both
// admin controllers) already keys off. The short-lived `pf_contractors`
// fork this file originally targeted has been retired; see
// docs/open-decisions.md for why the table changed but the API shape didn't.
const SELECT_WITH_CATEGORIES = sql`
  SELECT c.*,
    COALESCE(
      (SELECT json_agg(json_build_object('id', sc.id, 'name', sc.name, 'slug', sc.slug))
       FROM contractor_categories cc
       JOIN service_categories sc ON sc.id = cc.category_id
       WHERE cc.contractor_id = c.id),
      '[]'
    ) AS categories,
    -- Lets the frontend know whether "Submit for Operations Review" (which
    -- operates on the request, not the contractor directly — see
    -- contractorRequestController.submitContractorRequestForReview) is even
    -- reachable for this record. Most contractors originate from a request;
    -- one created directly via createPfContractor (a walk-in met in the
    -- field with no prior lead) has none.
    (SELECT r.id FROM contractor_onboarding_requests r WHERE r.contractor_profile_id = c.id LIMIT 1) AS request_id
  FROM contractor_profiles c
`;

/**
 * POST /api/internal/contractors
 * Field Intelligence Staff or Ops Head — creates the contractor record from
 * field-collected data. The contractor never logs in to do this themselves
 * (`user_id` stays null for every record created through this endpoint).
 */
export async function createPfContractor(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = createPfContractorSchema.safeParse(req.body);
    if (!parsed.success) return next(badRequest(parsed.error.issues[0]?.message ?? 'Invalid input'));
    const { companyName, phone, city, serviceAreas, yearsInBusiness, workforceCount, overseasInterest, description, notes, categoryIds } = parsed.data;

    // onboarding_complete starts false — a freshly staff-created profile
    // isn't published to the public directory until Ops Head verifies it
    // (see updatePfContractorVerification below, which flips this to true
    // at the same moment verification_status becomes 'verified').
    const contractor = await sql.begin(async (tx) => {
      const [row] = await tx`
        INSERT INTO contractor_profiles (
          company_name, phone, city, service_areas, years_experience,
          workforce_size, overseas_interest, description, notes, created_by, onboarding_complete
        ) VALUES (
          ${companyName}, ${phone ?? null}, ${city ?? null},
          ${serviceAreas ?? null}, ${yearsInBusiness ?? null}, ${workforceCount ?? null},
          ${overseasInterest ?? false}, ${description ?? null}, ${notes ?? null}, ${req.user!.sub}, false
        )
        RETURNING id
      `;
      if (categoryIds?.length) {
        await tx`DELETE FROM contractor_categories WHERE contractor_id = ${row.id}`;
        for (const categoryId of categoryIds) {
          await tx`
            INSERT INTO contractor_categories (contractor_id, category_id)
            VALUES (${row.id}, ${categoryId})
            ON CONFLICT DO NOTHING
          `;
        }
      }
      return row;
    });

    await logAudit(req.user!.sub, 'contractor:created', contractor.id);

    res.status(201).json({ data: { id: contractor.id } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/internal/contractors
 * Optional ?verificationStatus= filter — powers the Ops Head's review queue.
 */
export async function listPfContractors(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const verificationStatus = typeof req.query.verificationStatus === 'string' ? req.query.verificationStatus : undefined;

    const rows = await sql`
      ${SELECT_WITH_CATEGORIES}
      WHERE (${verificationStatus ?? null}::text IS NULL OR c.verification_status = ${verificationStatus ?? null})
      ORDER BY c.created_at DESC
    `;
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

/** GET /api/internal/contractors/:id */
export async function getPfContractor(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const [row] = await sql`${SELECT_WITH_CATEGORIES} WHERE c.id = ${id}`;
    if (!row) return next(notFound('Contractor not found'));
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/internal/contractors/:id — ordinary field edits. */
export async function updatePfContractor(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const parsed = updatePfContractorSchema.safeParse(req.body);
    if (!parsed.success) return next(badRequest(parsed.error.issues[0]?.message ?? 'Invalid input'));
    const { companyName, phone, city, serviceAreas, yearsInBusiness, workforceCount, overseasInterest, description, notes, categoryIds } = parsed.data;

    const updated = await sql.begin(async (tx) => {
      const [row] = await tx`
        UPDATE contractor_profiles SET
          company_name = COALESCE(${companyName ?? null}, company_name),
          phone = COALESCE(${phone ?? null}, phone),
          city = COALESCE(${city ?? null}, city),
          service_areas = COALESCE(${serviceAreas ?? null}, service_areas),
          years_experience = COALESCE(${yearsInBusiness ?? null}, years_experience),
          workforce_size = COALESCE(${workforceCount ?? null}, workforce_size),
          overseas_interest = COALESCE(${overseasInterest ?? null}, overseas_interest),
          description = COALESCE(${description ?? null}, description),
          notes = COALESCE(${notes ?? null}, notes),
          updated_at = now()
        WHERE id = ${id}
        RETURNING id
      `;
      if (!row) throw notFound('Contractor not found');
      if (categoryIds) {
        await tx`DELETE FROM contractor_categories WHERE contractor_id = ${id}`;
        for (const categoryId of categoryIds) {
          await tx`
            INSERT INTO contractor_categories (contractor_id, category_id)
            VALUES (${id}, ${categoryId})
            ON CONFLICT DO NOTHING
          `;
        }
      }
      return row;
    });

    // Field Staff edits weren't audited before — needed for "who edited
    // contractor" in My Activity / staff accountability (spec §10).
    await logAudit(req.user!.sub, 'contractor:updated', id);

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/internal/contractors/:id/verification
 * Ops Head only (enforced by the route's requireRole). Every call is
 * audit-logged — no silent overrides (§37). This is now the *only*
 * verification-update path — see adminWorkspaceController.reviewVerification,
 * which calls through to the same table.
 */
export async function updatePfContractorVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const parsed = updateVerificationSchema.safeParse(req.body);
    if (!parsed.success) return next(badRequest(parsed.error.issues[0]?.message ?? 'Invalid status'));
    const { status, note } = parsed.data;

    // Verifying a contractor is also what publishes them to the public
    // directory (gated on onboarding_complete) — this is the "Publish
    // contractor in directory" step in the onboarding flow, done in one
    // action rather than a separate toggle staff could forget to flip.
    const [updated] = await sql`
      UPDATE contractor_profiles SET
        verification_status = ${status},
        verification_note = ${note ?? null},
        onboarding_complete = CASE WHEN ${status} = 'verified' THEN true ELSE onboarding_complete END,
        updated_at = now()
      WHERE id = ${id}
      RETURNING id, verification_status, verification_note, onboarding_complete
    `;
    if (!updated) return next(notFound('Contractor not found'));

    await logAudit(req.user!.sub, `verification_status:${status}`, id, note);
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/internal/contractors/:id/availability
 * Either staff role can relay AVAILABLE/AT_CAPACITY/etc., since it's just
 * recording what the contractor told them (§5/§63) — but only Ops Head can
 * SUSPEND, since that's always meant to be a reviewed decision (§61).
 */
export async function updatePfContractorAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const parsed = updateAvailabilitySchema.safeParse(req.body);
    if (!parsed.success) return next(badRequest(parsed.error.issues[0]?.message ?? 'Invalid availability'));
    const { availability, note } = parsed.data;

    if (availability === 'SUSPENDED' && req.user!.role !== 'ops_head') {
      const err: AppError = new Error('Only Ops Head can suspend a contractor');
      err.statusCode = 403;
      return next(err);
    }

    const [updated] = await sql`
      UPDATE contractor_profiles SET availability = ${availability}, availability_note = ${note ?? null}, updated_at = now()
      WHERE id = ${id}
      RETURNING id, availability, availability_note
    `;
    if (!updated) return next(notFound('Contractor not found'));

    // Every availability change is now logged, not just SUSPENDED — "changed
    // availability" is one of the staff actions spec §10 requires tracking.
    await logAudit(req.user!.sub, `availability:${availability}`, id, note);
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}
