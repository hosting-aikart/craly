import { Request, Response, NextFunction } from 'express';
import sql from '../db/index';
import { createCertificateSchema, updateCertificateSchema } from '../validators/certificateValidators';
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
 * POST /api/internal/contractors/:id/certificates
 * Ops Head or Field Staff — logging a license/credential (optionally
 * linked to an already-uploaded document) is not itself a trust decision,
 * so both roles may create one. Generic model: works for an electrical
 * license, SSPC/NACE, safety certification, refractory/furnace credentials,
 * or any future industry credential without a schema change (§12).
 */
export async function createCertificate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: contractorId } = req.params;
    const parsed = createCertificateSchema.safeParse(req.body);
    if (!parsed.success) return next(badRequest(parsed.error.issues[0]?.message ?? 'Invalid input'));
    const { certificateType, industry, documentId, issueDate, expiryDate, notes } = parsed.data;

    const [row] = await sql`
      INSERT INTO contractor_certificates (
        contractor_id, certificate_type, industry, document_id, issue_date, expiry_date, notes
      ) VALUES (
        ${contractorId}, ${certificateType}, ${industry ?? null}, ${documentId ?? null},
        ${issueDate ?? null}, ${expiryDate ?? null}, ${notes ?? null}
      )
      RETURNING *
    `;

    await logAudit(req.user!.sub, 'certificate:created', 'contractor_certificate', row.id, undefined, { contractorId });

    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
}

/** GET /api/internal/contractors/:id/certificates */
export async function listCertificates(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: contractorId } = req.params;
    const rows = await sql`
      SELECT c.*, d.file_name AS document_file_name
      FROM contractor_certificates c
      LEFT JOIN contractor_documents d ON d.id = c.document_id
      WHERE c.contractor_id = ${contractorId}
      ORDER BY c.expiry_date ASC NULLS LAST, c.created_at DESC
    `;
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/internal/contractors/:id/certificates/:certId
 * Ops Head only — status changes (esp. `revoked`) are a trust decision.
 */
export async function updateCertificate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: contractorId, certId } = req.params;
    const parsed = updateCertificateSchema.safeParse(req.body);
    if (!parsed.success) return next(badRequest(parsed.error.issues[0]?.message ?? 'Invalid input'));
    const { status, notes, expiryDate } = parsed.data;

    const [updated] = await sql`
      UPDATE contractor_certificates SET
        status = COALESCE(${status ?? null}, status),
        notes = COALESCE(${notes ?? null}, notes),
        expiry_date = COALESCE(${expiryDate ?? null}, expiry_date),
        updated_at = now()
      WHERE id = ${certId} AND contractor_id = ${contractorId}
      RETURNING *
    `;
    if (!updated) return next(notFound('Certificate not found'));

    await logAudit(req.user!.sub, `certificate:${status ?? 'updated'}`, 'contractor_certificate', certId, notes, { contractorId });

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}
