import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import multer from 'multer';
import sql from '../db/index';
import { buildWorksitePhotoStorageKey, putObject, getSignedGetUrl, deleteObject } from '../utils/r2';
import {
  validateWorksitePhotoFile,
  sanitizeDisplayFileName,
  MAX_WORKSITE_PHOTO_SIZE_BYTES,
  MAX_WORKSITE_PHOTOS_COUNT,
} from '../utils/fileValidation';
import { logAudit } from '../utils/auditLog';
import type { AppError } from '../middlewares/errorHandler';

function badRequest(message: string): AppError {
  const err: AppError = new Error(message);
  err.statusCode = 400;
  return err;
}

function notFound(message: string): AppError {
  const err: AppError = new Error(message);
  err.statusCode = 404;
  return err;
}

// Multer memory storage — buffers stored in memory then streamed to Cloudflare R2
const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_WORKSITE_PHOTO_SIZE_BYTES,
    files: MAX_WORKSITE_PHOTOS_COUNT,
  },
}).fields([
  { name: 'photos', maxCount: MAX_WORKSITE_PHOTOS_COUNT },
  { name: 'photo', maxCount: MAX_WORKSITE_PHOTOS_COUNT },
  { name: 'files', maxCount: MAX_WORKSITE_PHOTOS_COUNT },
  { name: 'file', maxCount: MAX_WORKSITE_PHOTOS_COUNT },
]);

export function worksitePhotoUpload(req: Request, res: Response, next: NextFunction): void {
  uploadMiddleware(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(badRequest(`File exceeds the 10MB limit.`));
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return next(badRequest(`Cannot upload more than ${MAX_WORKSITE_PHOTOS_COUNT} photos at once.`));
        }
        return next(badRequest(err.message));
      }
      return next(err);
    }
    next();
  });
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

/**
 * GET /api/contractor-portal/worksite-photos
 * Returns all worksite photos for the authenticated contractor with signed URLs.
 */
export async function getMyWorksitePhotos(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const contractorId = await getContractorIdFromUserId(req.user!.sub);

    const rows = await sql`
      SELECT id, contractor_id, storage_key, file_name, mime_type, size_bytes,
             caption, display_order, created_at, updated_at
      FROM contractor_worksite_photos
      WHERE contractor_id = ${contractorId}
      ORDER BY display_order ASC, created_at ASC
    `;

    // Mint signed URLs for all photos (valid for 1 hour for smooth browsing)
    const photosWithUrls = await Promise.all(
      rows.map(async (row) => {
        let url = '';
        try {
          url = await getSignedGetUrl(row.storage_key, 3600);
        } catch (e) {
          // If R2 generation fails for an individual item, log but continue
          console.error(`Failed to generate signed URL for worksite photo ${row.id}:`, e);
        }
        return {
          id: row.id,
          contractorId: row.contractor_id,
          fileName: row.file_name,
          mimeType: row.mime_type,
          sizeBytes: row.size_bytes,
          caption: row.caption,
          displayOrder: row.display_order,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          url,
        };
      })
    );

    const count = photosWithUrls.length;
    res.json({
      data: photosWithUrls,
      meta: {
        count,
        max: MAX_WORKSITE_PHOTOS_COUNT,
        remaining: Math.max(0, MAX_WORKSITE_PHOTOS_COUNT - count),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/contractor-portal/worksite-photos
 * Uploads 1 or more worksite photos (up to remaining limit, total max 10).
 */
export async function uploadMyWorksitePhotos(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const contractorId = await getContractorIdFromUserId(req.user!.sub);

    // Extract files from multer
    const files: Express.Multer.File[] = [];
    if (req.files) {
      if (Array.isArray(req.files)) {
        files.push(...req.files);
      } else {
        const fileRecord = req.files as Record<string, Express.Multer.File[]>;
        if (fileRecord.photos) files.push(...fileRecord.photos);
        if (fileRecord.photo) files.push(...fileRecord.photo);
        if (fileRecord.files) files.push(...fileRecord.files);
        if (fileRecord.file) files.push(...fileRecord.file);
      }
    }
    if (req.file) {
      files.push(req.file);
    }

    if (files.length === 0) {
      return next(badRequest('No photos were uploaded. Please select at least one photo.'));
    }

    // Check existing count in database
    const [{ count }] = await sql`
      SELECT count(*)::int AS count
      FROM contractor_worksite_photos
      WHERE contractor_id = ${contractorId}
    `;

    const remainingSlots = MAX_WORKSITE_PHOTOS_COUNT - count;

    if (remainingSlots <= 0) {
      return next(
        badRequest(
          `Maximum limit of ${MAX_WORKSITE_PHOTOS_COUNT} photos reached. Please delete existing photos before uploading replacements.`
        )
      );
    }

    if (files.length > remainingSlots) {
      return next(
        badRequest(
          `Upload exceeds maximum limit of ${MAX_WORKSITE_PHOTOS_COUNT} photos. You currently have ${count} photo(s) and can only upload ${remainingSlots} more.`
        )
      );
    }

    // Validate each file before uploading any to storage
    for (const file of files) {
      if (file.size > MAX_WORKSITE_PHOTO_SIZE_BYTES || file.buffer.length > MAX_WORKSITE_PHOTO_SIZE_BYTES) {
        return next(
          badRequest(
            `"${file.originalname}" exceeds the 10MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`
          )
        );
      }

      const validation = validateWorksitePhotoFile(file.buffer);
      if (!validation.ok) {
        return next(badRequest(`"${file.originalname}": ${validation.reason}`));
      }
    }

    // Upload validated files to Cloudflare R2 and insert metadata into DB
    const uploadedPhotos = [];
    const captions: string[] = Array.isArray(req.body.captions)
      ? req.body.captions
      : typeof req.body.caption === 'string'
      ? [req.body.caption]
      : [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validation = validateWorksitePhotoFile(file.buffer);
      const photoId = randomUUID();
      const storageKey = buildWorksitePhotoStorageKey(contractorId, photoId);
      const mimeType = validation.mimeType || 'image/jpeg';
      const fileName = sanitizeDisplayFileName(file.originalname || `photo-${i + 1}.jpg`);
      const caption = captions[i] || (files.length === 1 && typeof req.body.caption === 'string' ? req.body.caption : null);

      // Store in Cloudflare R2
      await putObject(storageKey, file.buffer, mimeType);

      // Insert into PostgreSQL
      const [inserted] = await sql`
        INSERT INTO contractor_worksite_photos (
          id, contractor_id, storage_key, file_name, mime_type, size_bytes,
          caption, display_order
        ) VALUES (
          ${photoId}, ${contractorId}, ${storageKey}, ${fileName}, ${mimeType}, ${file.size},
          ${caption}, ${count + i}
        )
        RETURNING id, contractor_id, file_name, mime_type, size_bytes, caption, display_order, created_at, updated_at
      `;

      // Generate signed URL for immediate preview
      const url = await getSignedGetUrl(storageKey, 3600);

      uploadedPhotos.push({
        id: inserted.id,
        contractorId: inserted.contractor_id,
        fileName: inserted.file_name,
        mimeType: inserted.mime_type,
        sizeBytes: inserted.size_bytes,
        caption: inserted.caption,
        displayOrder: inserted.display_order,
        createdAt: inserted.created_at,
        updatedAt: inserted.updated_at,
        url,
      });

      await logAudit(req.user!.sub, 'worksite_photo:upload', 'contractor_worksite_photo', photoId, undefined, {
        contractorId,
        fileName,
        sizeBytes: file.size,
      });
    }

    const newTotal = count + uploadedPhotos.length;
    res.status(201).json({
      data: uploadedPhotos,
      meta: {
        count: newTotal,
        max: MAX_WORKSITE_PHOTOS_COUNT,
        remaining: Math.max(0, MAX_WORKSITE_PHOTOS_COUNT - newTotal),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/contractor-portal/worksite-photos/:photoId
 * Deletes a worksite photo from Cloudflare R2 and PostgreSQL database.
 */
export async function deleteMyWorksitePhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const contractorId = await getContractorIdFromUserId(req.user!.sub);
    const { photoId } = req.params;

    const [photo] = await sql`
      SELECT id, storage_key, file_name FROM contractor_worksite_photos
      WHERE id = ${photoId} AND contractor_id = ${contractorId}
    `;

    if (!photo) {
      return next(notFound('Worksite photo not found or does not belong to your company'));
    }

    // Delete from Cloudflare R2
    try {
      await deleteObject(photo.storage_key);
    } catch (e) {
      console.warn(`Could not delete R2 object ${photo.storage_key}:`, e);
    }

    // Delete row from DB
    await sql`DELETE FROM contractor_worksite_photos WHERE id = ${photoId} AND contractor_id = ${contractorId}`;

    // Get updated count
    const [{ count }] = await sql`
      SELECT count(*)::int AS count
      FROM contractor_worksite_photos
      WHERE contractor_id = ${contractorId}
    `;

    await logAudit(req.user!.sub, 'worksite_photo:delete', 'contractor_worksite_photo', photoId, undefined, {
      contractorId,
      fileName: photo.file_name,
    });

    res.json({
      data: { id: photoId, deleted: true },
      meta: {
        count,
        max: MAX_WORKSITE_PHOTOS_COUNT,
        remaining: Math.max(0, MAX_WORKSITE_PHOTOS_COUNT - count),
      },
    });
  } catch (err) {
    next(err);
  }
}
