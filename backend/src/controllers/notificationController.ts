import { Request, Response, NextFunction } from 'express';
import sql from '../db/index';
import type { AppError } from '../middlewares/errorHandler';

/**
 * GET /api/notifications
 * The caller's notifications, most recent first, plus the unread count for
 * the bell badge (avoids a second round trip from the frontend).
 */
export async function listNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '30'), 10) || 30, 1), 100);

    const [notifications, [{ count }]] = await Promise.all([
      sql`SELECT * FROM notifications WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT ${limit}`,
      sql`SELECT count(*)::int AS count FROM notifications WHERE user_id = ${userId} AND is_read = false`,
    ]);

    res.json({ data: notifications, unreadCount: count });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/notifications/:id/read
 */
export async function markNotificationRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.sub;

    const [updated] = await sql`
      UPDATE notifications SET is_read = true
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id, is_read
    `;
    if (!updated) {
      const err: AppError = new Error('Notification not found');
      err.statusCode = 404;
      return next(err);
    }
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/notifications/read-all
 */
export async function markAllNotificationsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;
    await sql`UPDATE notifications SET is_read = true WHERE user_id = ${userId} AND is_read = false`;
    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
}
