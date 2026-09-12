import { Request, Response, NextFunction } from 'express';
import sql from '../db/index';
import { PUBLICLY_DISCOVERABLE_CONDITION } from '../utils/contractorVisibility';
import type { AppError } from '../middlewares/errorHandler';

/**
 * GET /api/contractors
 * Public directory listing — only contractors who have completed
 * onboarding, been approved by Staff/Admin (verification_status =
 * 'verified'), and are not SUSPENDED are listed (see
 * PUBLICLY_DISCOVERABLE_CONDITION). Optional category/city/search/
 * experience/workforce filters and pagination.
 */
export async function listContractors(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(parseInt(String(req.query.page ?? '1'), 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '12'), 10) || 12, 1), 50);
    const offset = (page - 1) * limit;
    const city = typeof req.query.city === 'string' ? req.query.city : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const minExperience = parseInt(String(req.query.minExperience ?? ''), 10);
    const minWorkforce = parseInt(String(req.query.minWorkforce ?? ''), 10);

    const rows = await sql`
      SELECT cp.id, cp.company_name, cp.description, cp.city, cp.state,
             cp.years_experience, cp.workforce_size,
             COALESCE(
               (SELECT json_agg(json_build_object('id', sc.id, 'name', sc.name, 'slug', sc.slug))
                FROM contractor_categories cc
                JOIN service_categories sc ON sc.id = cc.category_id
                WHERE cc.contractor_id = cp.id),
               '[]'
             ) AS categories
      FROM contractor_profiles cp
      WHERE ${PUBLICLY_DISCOVERABLE_CONDITION}
        AND (
          ${city ?? null}::text IS NULL
          OR cp.city ILIKE ${city ? `%${city}%` : null}
          OR cp.state ILIKE ${city ? `%${city}%` : null}
          OR EXISTS (
            SELECT 1 FROM unnest(cp.service_areas) sa WHERE sa ILIKE ${city ? `%${city}%` : null}
          )
        )
        AND (
          ${category ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM contractor_categories cc
            JOIN service_categories sc ON sc.id = cc.category_id
            WHERE cc.contractor_id = cp.id AND sc.slug = ${category ?? null}
          )
        )
        AND (
          ${q ?? null}::text IS NULL OR
          cp.company_name ILIKE ${q ? `%${q}%` : null} OR
          cp.description ILIKE ${q ? `%${q}%` : null} OR
          cp.city ILIKE ${q ? `%${q}%` : null} OR
          cp.state ILIKE ${q ? `%${q}%` : null} OR
          EXISTS (
            SELECT 1 FROM contractor_categories cc
            JOIN service_categories sc ON sc.id = cc.category_id
            WHERE cc.contractor_id = cp.id AND sc.name ILIKE ${q ? `%${q}%` : null}
          )
        )
        AND (${Number.isFinite(minExperience) ? minExperience : null}::int IS NULL OR cp.years_experience >= ${Number.isFinite(minExperience) ? minExperience : null})
        AND (${Number.isFinite(minWorkforce) ? minWorkforce : null}::int IS NULL OR cp.workforce_size >= ${Number.isFinite(minWorkforce) ? minWorkforce : null})
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
 * Public single profile view — same visibility rule as the directory: only
 * reachable once the contractor has finished onboarding and is not
 * SUSPENDED. This also closes the "guess/bookmark the direct URL" bypass.
 */
export async function getContractor(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const [row] = await sql`
      SELECT cp.id, cp.company_name, cp.description, cp.city, cp.state,
             cp.years_experience, cp.workforce_size
      FROM contractor_profiles cp WHERE cp.id = ${id} AND ${PUBLICLY_DISCOVERABLE_CONDITION}
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
