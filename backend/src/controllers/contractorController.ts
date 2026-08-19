import { Request, Response, NextFunction } from 'express';
import sql from '../db/index';
import type { AppError } from '../middlewares/errorHandler';

/**
 * GET /api/contractors
 * Public directory listing — verified contractors only, with optional
 * category/city/search filters and pagination.
 */
export async function listContractors(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(parseInt(String(req.query.page ?? '1'), 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '12'), 10) || 12, 1), 50);
    const offset = (page - 1) * limit;
    const city = typeof req.query.city === 'string' ? req.query.city : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;

    const rows = await sql`
      SELECT cp.id, cp.company_name, cp.description, cp.city, cp.state,
             cp.years_experience, cp.workforce_size, cp.verification_status,
             COALESCE(
               (SELECT json_agg(json_build_object('id', sc.id, 'name', sc.name, 'slug', sc.slug))
                FROM contractor_categories cc
                JOIN service_categories sc ON sc.id = cc.category_id
                WHERE cc.contractor_id = cp.id),
               '[]'
             ) AS categories
      FROM contractor_profiles cp
      WHERE cp.verification_status = 'verified'
        AND (${city ?? null}::text IS NULL OR cp.city ILIKE ${city ? `%${city}%` : null})
        AND (
          ${category ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM contractor_categories cc
            JOIN service_categories sc ON sc.id = cc.category_id
            WHERE cc.contractor_id = cp.id AND sc.slug = ${category ?? null}
          )
        )
        AND (${q ?? null}::text IS NULL OR cp.company_name ILIKE ${q ? `%${q}%` : null})
      ORDER BY cp.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    res.json({ data: rows, page, limit });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/contractors/:id
 * Public single profile view.
 */
export async function getContractor(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const [row] = await sql`
      SELECT id, company_name, description, city, state, years_experience,
             workforce_size, verification_status
      FROM contractor_profiles WHERE id = ${id}
    `;
    if (!row) {
      const err: AppError = new Error('Contractor not found');
      err.statusCode = 404;
      return next(err);
    }
    const categories = await sql`
      SELECT sc.id, sc.name, sc.slug
      FROM contractor_categories cc
      JOIN service_categories sc ON sc.id = cc.category_id
      WHERE cc.contractor_id = ${id}
    `;
    res.json({ data: { ...row, categories } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/contractors/:id/verify
 * Admin only. Approves or rejects a contractor's verification.
 */
export async function verifyContractor(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { status, note } = req.body as { status?: string; note?: string };

    if (status !== 'verified' && status !== 'rejected') {
      const err: AppError = new Error("status must be 'verified' or 'rejected'");
      err.statusCode = 400;
      return next(err);
    }

    const [updated] = await sql`
      UPDATE contractor_profiles
      SET verification_status = ${status}, verification_note = ${note ?? null}, updated_at = now()
      WHERE id = ${id}
      RETURNING id, verification_status
    `;

    if (!updated) {
      const err: AppError = new Error('Contractor not found');
      err.statusCode = 404;
      return next(err);
    }

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}
