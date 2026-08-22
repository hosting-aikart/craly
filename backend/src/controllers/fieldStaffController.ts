import { Request, Response, NextFunction } from 'express';
import sql from '../db/index';

// Terminal states for an onboarding request — anything else still counts as
// "pending" work for whoever it's assigned to.
const TERMINAL_REQUEST_STATUSES = ['APPROVED', 'REJECTED', 'CLOSED'];

/**
 * GET /api/field-staff/dashboard
 * Real counts only (spec §2 — "do not fabricate statistics"). Field Staff
 * see their own assigned/created work; Ops Head — higher scope per §14 — see
 * the same shape team-wide.
 */
export async function getFieldStaffDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sub: userId, role } = req.user!;
    const isOpsHead = role === 'ops_head';

    const [
      [{ new_requests }],
      [{ my_pending_requests }],
      [{ profiles_being_completed }],
      [{ profiles_submitted_for_review }],
    ] = await Promise.all([
      sql`SELECT COUNT(*)::int AS new_requests FROM contractor_onboarding_requests WHERE status = 'NEW'`,
      isOpsHead
        ? sql`SELECT COUNT(*)::int AS my_pending_requests FROM contractor_onboarding_requests WHERE status NOT IN ${sql(TERMINAL_REQUEST_STATUSES)}`
        : sql`SELECT COUNT(*)::int AS my_pending_requests FROM contractor_onboarding_requests WHERE assigned_to = ${userId} AND status NOT IN ${sql(TERMINAL_REQUEST_STATUSES)}`,
      isOpsHead
        ? sql`SELECT COUNT(*)::int AS profiles_being_completed FROM contractor_profiles WHERE onboarding_complete = false AND verification_status != 'pending'`
        : sql`SELECT COUNT(*)::int AS profiles_being_completed FROM contractor_profiles WHERE onboarding_complete = false AND verification_status != 'pending' AND created_by = ${userId}`,
      isOpsHead
        ? sql`SELECT COUNT(*)::int AS profiles_submitted_for_review FROM contractor_profiles WHERE verification_status = 'pending'`
        : sql`SELECT COUNT(*)::int AS profiles_submitted_for_review FROM contractor_profiles WHERE verification_status = 'pending' AND created_by = ${userId}`,
    ]);

    const recentActivity = isOpsHead
      ? await sql`
          SELECT al.id, al.action, al.target_type, al.target_id, al.created_at, u.email AS actor_email
          FROM audit_logs al
          JOIN users u ON u.id = al.admin_id
          WHERE al.target_type IN ('contractor', 'contractor_onboarding_request')
          ORDER BY al.created_at DESC LIMIT 8
        `
      : await sql`
          SELECT al.id, al.action, al.target_type, al.target_id, al.created_at, u.email AS actor_email
          FROM audit_logs al
          JOIN users u ON u.id = al.admin_id
          WHERE al.target_type IN ('contractor', 'contractor_onboarding_request') AND al.admin_id = ${userId}
          ORDER BY al.created_at DESC LIMIT 8
        `;

    res.json({
      data: {
        newRequests: new_requests,
        myPendingRequests: my_pending_requests,
        profilesBeingCompleted: profiles_being_completed,
        profilesSubmittedForReview: profiles_submitted_for_review,
        recentActivity,
        scope: isOpsHead ? 'team' : 'mine',
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/field-staff/activity
 * "My Activity" (spec §10) — paginated read of the shared `audit_logs`
 * table, not a second audit system. Field Staff always see their own
 * actions; Ops Head may pass ?staffId= to inspect a specific team member's,
 * or omit it to see their own.
 */
export async function getMyActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sub: userId, role } = req.user!;
    const staffId = role === 'ops_head' && typeof req.query.staffId === 'string' ? req.query.staffId : userId;

    const { page = '1', limit = '30' } = req.query;
    const pageNum = Math.max(1, parseInt(String(page), 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10)));
    const offset = (pageNum - 1) * limitNum;

    const rows = await sql`
      SELECT al.id, al.action, al.target_type, al.target_id, al.reason, al.created_at
      FROM audit_logs al
      WHERE al.admin_id = ${staffId}
      ORDER BY al.created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;
    const [{ total }] = await sql`SELECT COUNT(*)::int AS total FROM audit_logs WHERE admin_id = ${staffId}`;

    res.json({ data: rows, total, page: pageNum, limit: limitNum });
  } catch (err) {
    next(err);
  }
}
