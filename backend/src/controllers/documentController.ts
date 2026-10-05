import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import multer from 'multer';
import sql from '../db/index';
import { buildDocumentStorageKey, putObject, getSignedGetUrl, deleteObject } from '../utils/r2';
import { validateDocumentFile, sanitizeDisplayFileName, MAX_DOCUMENT_SIZE_BYTES } from '../utils/fileValidation';
import { uploadDocumentSchema, reviewDocumentSchema, SENSITIVE_DOCUMENT_TYPES } from '../validators/documentValidators';
import { logAudit } from '../utils/auditLog';
import { notifyContractorVerificationChange, notifyKycDocumentReviewed } from '../utils/whatsappNotifications';
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

async function getContractorIdFromUserId(userId: string): Promise<string> {
  const [row] = await sql`SELECT id FROM contractor_profiles WHERE user_id = ${userId}`;
  if (!row) {
    const err: AppError = new Error('Contractor profile not found for this user');
    err.statusCode = 404;
    throw err;
  }
  return row.id;
}

function isSensitive(documentType: string): boolean {
  return (SENSITIVE_DOCUMENT_TYPES as string[]).includes(documentType);
}

/**
 * POST /api/contractor-portal/documents
 * Logged-in contractor uploads a KYC/verification document directly to Cloudflare R2.
 */
export async function uploadMyDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const contractorId = await getContractorIdFromUserId(req.user!.sub);

    if (!req.file) return next(badRequest('No file was uploaded (expected multipart field "file")'));

    const validation = validateDocumentFile(req.file.buffer);
    if (!validation.ok) return next(badRequest(validation.reason ?? 'Invalid file'));

    const parsed = uploadDocumentSchema.safeParse(req.body);
    if (!parsed.success) return next(badRequest(parsed.error.issues[0]?.message ?? 'Invalid input'));
    const { documentType, issueDate, expiryDate, certificationAssessmentId } = parsed.data;

    const documentId = randomUUID();
    const storageKey = buildDocumentStorageKey(contractorId, documentId);

    // Upload file buffer directly to Cloudflare R2
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

    // Reset status to pending if previously rejected or needs_changes
    const [profile] = await sql`
      WITH prev AS (
        SELECT id, verification_status FROM contractor_profiles WHERE id = ${contractorId} FOR UPDATE
      )
      UPDATE contractor_profiles cp
      SET verification_status = CASE 
        WHEN cp.verification_status IN ('rejected', 'needs_changes') THEN 'pending'
        ELSE cp.verification_status 
      END,
      updated_at = now()
      FROM prev
      WHERE cp.id = prev.id
      RETURNING cp.user_id, cp.company_name, cp.phone, cp.verification_status, cp.updated_at, prev.verification_status AS previous_status
    `;
    if (profile) {
      // Resubmission after rejected/needs_changes → "under review" message.
      await notifyContractorVerificationChange(
        { contractorId, userId: profile.user_id, phone: profile.phone, companyName: profile.company_name },
        profile.previous_status,
        profile.verification_status,
        profile.updated_at,
      );
    }

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
 * GET /api/contractor-portal/documents
 * Logged-in contractor lists their uploaded KYC & verification documents.
 */
export async function listMyDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const contractorId = await getContractorIdFromUserId(req.user!.sub);

    const rows = await sql`
      SELECT d.id, d.document_type, d.file_name, d.mime_type, d.size_bytes, d.status,
             d.issue_date, d.expiry_date, d.created_at, d.updated_at
      FROM contractor_documents d
      WHERE d.contractor_id = ${contractorId}
      ORDER BY d.created_at DESC
    `;

    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/contractor-portal/documents/:documentId/signed-url
 * Logged-in contractor gets a short-lived (120s) signed R2 URL to view/download their document.
 */
export async function getMyDocumentSignedUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const contractorId = await getContractorIdFromUserId(req.user!.sub);
    const { documentId } = req.params;

    const [doc] = await sql`
      SELECT id, document_type, storage_key FROM contractor_documents
      WHERE id = ${documentId} AND contractor_id = ${contractorId}
    `;
    if (!doc) return next(notFound('Document not found'));

    const intent = req.query.intent === 'download' ? 'download' : 'view';
    const url = await getSignedGetUrl(doc.storage_key, 120);

    await logAudit(req.user!.sub, `document:${intent}`, 'contractor_document', documentId, undefined, { contractorId });

    res.json({ data: { url, expiresInSeconds: 120 } });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/contractor-portal/documents/:documentId
 * Logged-in contractor deletes an uploaded document from R2 and DB.
 */
export async function deleteMyDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const contractorId = await getContractorIdFromUserId(req.user!.sub);
    const { documentId } = req.params;

    const [doc] = await sql`
      SELECT id, document_type, storage_key FROM contractor_documents
      WHERE id = ${documentId} AND contractor_id = ${contractorId}
    `;
    if (!doc) return next(notFound('Document not found'));

    await deleteObject(doc.storage_key);
    await sql`DELETE FROM contractor_documents WHERE id = ${documentId}`;

    await logAudit(req.user!.sub, 'document:delete', 'contractor_document', documentId, undefined, {
      contractorId,
      documentType: doc.document_type,
    });

    res.json({ data: { id: documentId, deleted: true } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/internal/contractors/:id/documents
 * Ops Head or Field Staff upload.
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
 * List documents for internal staff workspace.
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
 * Mints short-lived (120s) R2 signed URL for internal staff.
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
 * Ops Head only. Approve / reject / request replacement.
 */
export async function reviewDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: contractorId, documentId } = req.params;
    const parsed = reviewDocumentSchema.safeParse(req.body);
    if (!parsed.success) return next(badRequest(parsed.error.issues[0]?.message ?? 'Invalid input'));
    const { decision, note } = parsed.data;

    const [updated] = await sql`
      WITH prev AS (
        SELECT id, status FROM contractor_documents
        WHERE id = ${documentId} AND contractor_id = ${contractorId}
        FOR UPDATE
      )
      UPDATE contractor_documents d
      SET status = ${decision}, updated_at = now()
      FROM prev
      WHERE d.id = prev.id
      RETURNING d.id, d.document_type, d.status, d.updated_at, prev.status AS previous_status
    `;
    if (!updated) return next(notFound('Document not found'));

    await logAudit(req.user!.sub, `document:${decision}`, 'contractor_document', documentId, note, { contractorId });

    if (updated.previous_status !== decision) {
      const [contractor] = await sql`
        SELECT user_id, company_name, phone FROM contractor_profiles WHERE id = ${contractorId}
      `;
      if (contractor) {
        await notifyKycDocumentReviewed(
          { contractorId, userId: contractor.user_id, phone: contractor.phone, companyName: contractor.company_name },
          { id: updated.id, documentType: updated.document_type },
          decision,
          updated.updated_at,
        );
      }
    }

    res.json({ data: { id: updated.id, document_type: updated.document_type, status: updated.status } });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/internal/contractors/:id/documents/:documentId
 * Ops Head only. Deletes R2 object and metadata row.
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
