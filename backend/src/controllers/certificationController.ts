import { Request, Response, NextFunction } from 'express';
import sql from '../db/index';
import { createAssessmentSchema, revokeCertificationSchema } from '../validators/certificationValidators';
import { logAudit } from '../utils/auditLog';
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

/**
 * POST /api/internal/contractors/:id/certification/assessments
 * Ops Head only (route-gated). Prima Facie Certified requires Standard
 * Verified first (§10) — enforced here, not just documented. Records the
 * assessment (in-person or remote — never an automated "expert assessment"
 * system, per scope) and, on approval, flips certification_status with a
 * one-year expiry. Evidence (GPS-tagged photos etc.) is just
 * contractor_documents rows of type `verification_evidence`, linked back
 * to this assessment.
 */
export async function createCertificationAssessment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: contractorId } = req.params;
    const parsed = createAssessmentSchema.safeParse(req.body);
    if (!parsed.success) return next(badRequest(parsed.error.issues[0]?.message ?? 'Invalid input'));
    const { assessmentType, assessmentDate, decision, notes, evidenceDocumentIds } = parsed.data;

    const [contractor] = await sql`SELECT id, verification_status FROM contractor_profiles WHERE id = ${contractorId}`;
    if (!contractor) return next(notFound('Contractor not found'));
    if (contractor.verification_status !== 'verified') {
      return next(badRequest('Contractor must be Standard Verified before a certification assessment can be recorded'));
    }

    const assessment = await sql.begin(async (tx) => {
      const [row] = await tx`
        INSERT INTO contractor_certification_assessments (
          contractor_id, assessment_type, assessor_id, assessment_date, decision, notes
        ) VALUES (
          ${contractorId}, ${assessmentType}, ${req.user!.sub}, ${assessmentDate}, ${decision}, ${notes ?? null}
        )
        RETURNING *
      `;

      if (evidenceDocumentIds?.length) {
        await tx`
          UPDATE contractor_documents SET certification_assessment_id = ${row.id}
          WHERE id IN ${tx(evidenceDocumentIds)} AND contractor_id = ${contractorId}
        `;
      }

      if (decision === 'approved') {
        await tx`
          UPDATE contractor_profiles SET
            certification_status = 'certified',
            certified_at = now(),
            certified_expires_at = now() + interval '1 year',
            updated_at = now()
          WHERE id = ${contractorId}
        `;
      }

      return row;
    });

    await logAudit(req.user!.sub, `certification_assessment:${decision}`, 'contractor', contractorId, notes, {
      assessmentId: assessment.id,
      assessmentType,
    });

    res.status(201).json({ data: assessment });
  } catch (err) {
    next(err);
  }
}

/** GET /api/internal/contractors/:id/certification/assessments */
export async function listCertificationAssessments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: contractorId } = req.params;
    const rows = await sql`
      SELECT a.*, u.email AS assessor_email,
        COALESCE(
          (SELECT json_agg(json_build_object('id', d.id, 'fileName', d.file_name))
           FROM contractor_documents d WHERE d.certification_assessment_id = a.id),
          '[]'
        ) AS evidence
      FROM contractor_certification_assessments a
      LEFT JOIN users u ON u.id = a.assessor_id
      WHERE a.contractor_id = ${contractorId}
      ORDER BY a.assessment_date DESC, a.created_at DESC
    `;
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/internal/contractors/:id/certification/revoke
 * Ops Head only. Mandatory reason — this is always a reviewed decision,
 * never a silent override (§16).
 */
export async function revokeCertification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: contractorId } = req.params;
    const parsed = revokeCertificationSchema.safeParse(req.body);
    if (!parsed.success) return next(badRequest(parsed.error.issues[0]?.message ?? 'A reason is required'));
    const { reason } = parsed.data;

    const [updated] = await sql`
      UPDATE contractor_profiles SET
        certification_status = 'none',
        certified_at = NULL,
        certified_expires_at = NULL,
        updated_at = now()
      WHERE id = ${contractorId}
      RETURNING id, certification_status
    `;
    if (!updated) return next(notFound('Contractor not found'));

    await logAudit(req.user!.sub, 'certification:revoked', 'contractor', contractorId, reason);

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}
