import { Request, Response, NextFunction } from 'express';
import sql from '../db/index';
import type { AppError } from '../middlewares/errorHandler';

/**
 * GET /api/admin/contractors
 * Returns contractor profiles for admin review and verification management.
 */
export async function listAdminContractors(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user!.role !== 'admin') {
      const err: AppError = new Error('Admin access required');
      err.statusCode = 403;
      return next(err);
    }

    const rows = await sql`
      SELECT cp.id, cp.user_id, cp.company_name, cp.city, cp.state,
             cp.verification_status, cp.verification_note, cp.created_at,
             u.email
      FROM contractor_profiles cp
      JOIN users u ON u.id = cp.user_id
      ORDER BY cp.created_at DESC
    `;

    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/contractors/:id/verify
 * Approves or rejects a contractor's verification status.
 */
export async function updateContractorVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user!.role !== 'admin') {
      const err: AppError = new Error('Admin access required');
      err.statusCode = 403;
      return next(err);
    }

    const { id } = req.params;
    const { status, note } = req.body;

    if (!['pending', 'verified', 'rejected'].includes(status)) {
      const err: AppError = new Error('Invalid status. Must be pending, verified, or rejected');
      err.statusCode = 400;
      return next(err);
    }

    const [updated] = await sql`
      UPDATE contractor_profiles
      SET verification_status = ${status},
          verification_note = ${note ?? null},
          updated_at = now()
      WHERE id = ${id}
      RETURNING id, company_name, verification_status, verification_note
    `;

    if (!updated) {
      const err: AppError = new Error('Contractor profile not found');
      err.statusCode = 404;
      return next(err);
    }

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}
