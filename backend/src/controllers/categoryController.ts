import { Request, Response, NextFunction } from 'express';
import sql from '../db/index';

/**
 * GET /api/categories
 * Public. Used to populate the category picker on onboarding and the
 * filter dropdown on the contractor directory.
 */
export async function listCategories(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categories = await sql`SELECT id, name, slug FROM service_categories ORDER BY name`;
    res.json({ data: categories });
  } catch (err) {
    next(err);
  }
}
