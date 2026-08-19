import { Request, Response, NextFunction } from 'express';

// ─────────────────────────────────────────────────────────────────────────────
// All contractor routes are STUBS.
// Implement business logic here once the DB schema is defined.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/contractors
 * List all contractors (paginated).
 * TODO: implement query with pagination params (page, limit, search).
 */
export async function listContractors(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // TODO: const rows = await sql`SELECT * FROM contractors ORDER BY created_at DESC`;
    res.json({ message: 'TODO: list contractors', data: [] });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/contractors/:id
 * Get a single contractor profile by ID.
 * TODO: implement lookup by UUID/integer ID.
 */
export async function getContractor(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    // TODO: const [row] = await sql`SELECT * FROM contractors WHERE id = ${id}`;
    // if (!row) { ... return 404 }
    res.json({ message: `TODO: get contractor ${id}`, data: null });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/contractors
 * Create a new contractor profile.
 * TODO: validate body, insert into DB, return created record.
 */
export async function createContractor(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const _body = req.body; // TODO: validate with zod/joi
    // TODO: const [row] = await sql`INSERT INTO contractors (...) VALUES (...) RETURNING *`;
    res.status(201).json({ message: 'TODO: create contractor', data: null });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/contractors/:id/verify
 * Trigger the verification process for a contractor.
 * TODO: implement verification workflow (queue job, update status, etc.).
 */
export async function verifyContractor(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    // TODO: trigger verification workflow
    res.json({ message: `TODO: verify contractor ${id}`, data: null });
  } catch (err) {
    next(err);
  }
}
