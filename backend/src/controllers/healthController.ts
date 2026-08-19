import { Request, Response } from 'express';
import sql from '../db/index';

/**
 * GET /api/health
 * Returns server status and optionally a DB ping.
 */
export async function healthCheck(req: Request, res: Response): Promise<void> {
  let dbStatus: 'ok' | 'error' = 'ok';
  let dbMessage: string | undefined;

  try {
    await sql`SELECT 1`;
  } catch (err) {
    dbStatus = 'error';
    dbMessage = err instanceof Error ? err.message : 'Unknown DB error';
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    db: { status: dbStatus, ...(dbMessage && { message: dbMessage }) },
  });
}
