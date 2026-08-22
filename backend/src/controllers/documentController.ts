import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import multer from 'multer';
import sql from '../db/index';
import { buildDocumentStorageKey, putObject, getSignedGetUrl, deleteObject } from '../utils/r2';
import { validateDocumentFile, sanitizeDisplayFileName, MAX_DOCUMENT_SIZE_BYTES } from '../utils/fileValidation';
import { uploadDocumentSchema, reviewDocumentSchema, SENSITIVE_DOCUMENT_TYPES } from '../validators/documentValidators';
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
function forbidden(message: string): AppError {
  const err: AppError = new Error(message);
  err.statusCode = 403;
  return err;
}

// Memory storage only — the buffer goes straight to R2, never to disk or
// Postgres. Single file, single field ("file"), hard size cap.
export const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DOCUMENT_SIZE_BYTES, files: 1 },
}).single('file');

async function contractorExists(contractorId: string): Promise<boolean> {
  const [row] = await sql`SELECT id FROM contractor_profiles WHERE id = ${contractorId}`;
  return Boolean(row);
}

function isSensitive(documentType: string): boolean {
  return (SENSITIVE_DOCUMENT_TYPES as string[]).includes(documentType);
}

/**
 * POST /api/internal/contractors/:id/documents
 * Ops Head or Field Staff. Upload order is deliberate: generate the id,
 * PUT to R2, THEN write the metadata row — if R2 fails, nothing lands in
 * Postgres; a DB failure after a successful PUT leaves an orphaned R2
 * object, which is the safer failure direction than a DB row with no file.
 */
export async function uploadDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: contractorId } = req.params;
    if (!(await contractorExists(contractorId))) return next(notFound('Contractor not found'));

    if (!req.file) return next(badRequest('No file was uploaded (expected multipart field "file")'));

    const validation = validateDocumentFile(req.file.buffer);
    if (!validation.ok) return next(badRequest(validation.reason ?? 'Invalid file'));

    const parsed = uploadDocumentSchema.safeParse(req.body);
    if (!parsed.success) return next(badRequest(parsed.error.issues[0]?.message ?? 'Invalid input'));
    const { documentType, issueDate, expiryDate, certificationAssessmentId } = parsed.data;

    const documentId = randomUUID();
    const storageKey = buildDocumentStorageKey(contractorId, documentId);

    await putObject(storageKey, req.file.buffer, validation.mimeType!);

    const fileName = sanitizeDisplayFileName(req.file.originalname || 'document');

    const [row] = await sql`
      INSERT INTO contractor_documents (
        id, contractor_id, document_type, storage_key, file_name, mime_type, size_bytes,
        uploaded_by, issue_date, expiry_date, certification_assessment_id, status
      ) VALUES (
        ${documentId}, ${contractorId}, ${documentType}, ${storageKey}, ${fileName},
        ${validation.mimeType ?? null}, ${req.file.size}, ${req.user!.sub},
        ${issueDate ?? null}, ${expiryDate ?? null}, ${certificationAssessmentId ?? null}, 'pending'
      )
      RETURNING id, document_type, file_name, mime_type, size_bytes, status, issue_date, expiry_date, created_at
    `;

    await logAudit(req.user!.sub, 'document:upload', 'contractor_document', documentId, undefined, {
      contractorId,
      documentType,
    });

    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/internal/contractors/:id/documents
 * Aadhaar/PAN rows are excluded from the result entirely for Field Staff —
 * not merely blocked on view/download — so the list response itself never
 * carries sensitive-document data to that role.
 */
export async function listDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: contractorId } = req.params;
    if (!(await contractorExists(contractorId))) return next(notFound('Contractor not found'));

    const isFieldStaff = req.user!.role === 'field_staff';

    const rows = await sql`
      SELECT d.id, d.document_type, d.file_name, d.mime_type, d.size_bytes, d.status,
             d.issue_date, d.expiry_date, d.created_at, d.updated_at, d.certification_assessment_id,
             u.email AS uploaded_by_email
      FROM contractor_documents d
      LEFT JOIN users u ON u.id = d.uploaded_by
      WHERE d.contractor_id = ${contractorId}
        AND (${isFieldStaff} = FALSE OR d.document_type NOT IN ${sql(SENSITIVE_DOCUMENT_TYPES)})
      ORDER BY d.created_at DESC
    `;

    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/internal/contractors/:id/documents/:documentId/signed-url?intent=view|download
 * Mints a short-lived (120s) R2 signed URL. Re-checks the sensitive-type
 * rule server-side regardless of what the list endpoint already filtered —
 * this endpoint must never trust that the caller only asks for rows it can
 * see.
 */
export async function getDocumentSignedUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: contractorId, documentId } = req.params;
    const [doc] = await sql`
      SELECT id, document_type, storage_key FROM contractor_documents
      WHERE id = ${documentId} AND contractor_id = ${contractorId}
    `;
    if (!doc) return next(notFound('Document not found'));

    if (req.user!.role === 'field_staff' && isSensitive(doc.document_type)) {
      return next(forbidden('Field Staff cannot access this document'));
    }

    const intent = req.query.intent === 'download' ? 'download' : 'view';
    const url = await getSignedGetUrl(doc.storage_key, 120);

    await logAudit(req.user!.sub, `document:${intent}`, 'contractor_document', documentId, undefined, { contractorId });

    res.json({ data: { url, expiresInSeconds: 120 } });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/internal/contractors/:id/documents/:documentId/review
 * Ops Head only (enforced by the route). Approve / reject / request
 * replacement — a note is required for anything but approval.
 */
export async function reviewDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: contractorId, documentId } = req.params;
    const parsed = reviewDocumentSchema.safeParse(req.body);
    if (!parsed.success) return next(badRequest(parsed.error.issues[0]?.message ?? 'Invalid input'));
    const { decision, note } = parsed.data;

    const [updated] = await sql`
      UPDATE contractor_documents
      SET status = ${decision}, updated_at = now()
      WHERE id = ${documentId} AND contractor_id = ${contractorId}
      RETURNING id, document_type, status
    `;
    if (!updated) return next(notFound('Document not found'));

    await logAudit(req.user!.sub, `document:${decision}`, 'contractor_document', documentId, note, { contractorId });

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/internal/contractors/:id/documents/:documentId
 * Ops Head only. Deletes the R2 object first, then the metadata row — this
 * is the spec's "delete/anonymize": the audit_logs row survives (it doesn't
 * foreign-key the document), so the fact that a document existed and was
 * removed stays auditable even though the file content is gone.
 */
export async function deleteDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: contractorId, documentId } = req.params;
    const reason = typeof req.body?.reason === 'string' ? req.body.reason : undefined;

    const [doc] = await sql`
      SELECT id, document_type, storage_key FROM contractor_documents
      WHERE id = ${documentId} AND contractor_id = ${contractorId}
    `;
    if (!doc) return next(notFound('Document not found'));

    await deleteObject(doc.storage_key);
    await sql`DELETE FROM contractor_documents WHERE id = ${documentId}`;

    await logAudit(req.user!.sub, 'document:delete', 'contractor_document', documentId, reason, {
      contractorId,
      documentType: doc.document_type,
    });

    res.json({ data: { id: documentId, deleted: true } });
  } catch (err) {
    next(err);
  }
}
