import { Request, Response, NextFunction } from 'express';
import sql from '../db/index';
import { createNotification } from '../utils/notifications';
import { emitToUser } from '../socket/emitter';
import type { AppError } from '../middlewares/errorHandler';

function badRequest(msg: string): AppError {
  const err: AppError = new Error(msg);
  err.statusCode = 400;
  return err;
}

function notFound(msg: string): AppError {
  const err: AppError = new Error(msg);
  err.statusCode = 404;
  return err;
}

// ── 1. Dashboard ─────────────────────────────────────────────────────────────
export async function getAdminDashboard(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [[{ total_users }], [{ total_contractors }], [{ total_businesses }], [{ verified_contractors }], [{ pending_verifications }], [{ total_enquiries }], [{ active_conversations }]] = await Promise.all([
      sql`SELECT COUNT(*)::int AS total_users FROM users`,
      // contractor_profiles, not `users WHERE role = 'contractor'` — most
      // contractor records are staff-managed now and have no users row at all.
      sql`SELECT COUNT(*)::int AS total_contractors FROM contractor_profiles`,
      sql`SELECT COUNT(*)::int AS total_businesses FROM users WHERE role = 'business'`,
      sql`SELECT COUNT(*)::int AS verified_contractors FROM contractor_profiles WHERE verification_status = 'verified'`,
      sql`SELECT COUNT(*)::int AS pending_verifications FROM contractor_profiles WHERE verification_status = 'pending'`,
      sql`SELECT COUNT(*)::int AS total_enquiries FROM inquiries`,
      sql`SELECT COUNT(*)::int AS active_conversations FROM inquiries WHERE status IN ('BROKERING', 'CONTACTED', 'IN_PROGRESS')`,
    ]);

    const recentActivity = await sql`
      SELECT al.*, u.email AS admin_email
      FROM audit_logs al
      JOIN users u ON u.id = al.admin_id
      ORDER BY al.created_at DESC
      LIMIT 8
    `;

    res.json({
      data: {
        totalUsers: total_users,
        totalContractors: total_contractors,
        totalBusinesses: total_businesses,
        verifiedContractors: verified_contractors,
        pendingVerifications: pending_verifications,
        totalEnquiries: total_enquiries,
        activeConversations: active_conversations,
        recentActivity,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ── 2. Analytics ─────────────────────────────────────────────────────────────
export async function getAdminAnalytics(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Businesses still self-register (`users`); contractors are now added
    // via contractor_profiles directly, with no `users` row at all — so
    // "contractor growth" has to come from that table's own created_at, not
    // a role count on `users` (which would show zero growth forever).
    const [businessGrowth, contractorGrowth] = await Promise.all([
      sql`
        SELECT date_trunc('day', created_at)::date AS date, COUNT(*)::int AS businesses
        FROM users WHERE role = 'business' AND created_at >= now() - INTERVAL '30 days'
        GROUP BY 1 ORDER BY 1 ASC
      `,
      sql`
        SELECT date_trunc('day', created_at)::date AS date, COUNT(*)::int AS contractors
        FROM contractor_profiles WHERE created_at >= now() - INTERVAL '30 days'
        GROUP BY 1 ORDER BY 1 ASC
      `,
    ]);
    const growthByDate = new Map<string, { date: string; businesses: number; contractors: number }>();
    for (const row of businessGrowth) {
      growthByDate.set(String(row.date), { date: row.date, businesses: row.businesses, contractors: 0 });
    }
    for (const row of contractorGrowth) {
      const key = String(row.date);
      const existing = growthByDate.get(key);
      if (existing) existing.contractors = row.contractors;
      else growthByDate.set(key, { date: row.date, businesses: 0, contractors: row.contractors });
    }
    const userGrowth = [...growthByDate.values()].sort((a, b) => a.date.localeCompare(b.date));

    const [[{ total_enquiries }], [{ accepted_enquiries }], [{ total_messages }]] = await Promise.all([
      sql`SELECT COUNT(*)::int AS total_enquiries FROM inquiries`,
      sql`SELECT COUNT(*)::int AS accepted_enquiries FROM inquiries WHERE status IN ('BROKERING', 'CONTACTED', 'IN_PROGRESS', 'COMPLETED', 'WON')`,
      sql`SELECT COUNT(*)::int AS total_messages FROM inquiry_messages`,
    ]);

    const verificationDist = await sql`
      SELECT verification_status AS status, COUNT(*)::int AS count
      FROM contractor_profiles
      GROUP BY verification_status
    `;

    const supplyDemandGeo = await sql`
      SELECT COALESCE(city, 'Unknown') AS location,
             COUNT(DISTINCT cp.id)::int AS supply_contractors,
             COUNT(DISTINCT i.id)::int AS demand_enquiries,
             CASE
               WHEN COUNT(DISTINCT i.id) > COUNT(DISTINCT cp.id) * 2 THEN 'HIGH'
               WHEN COUNT(DISTINCT i.id) > COUNT(DISTINCT cp.id) THEN 'MEDIUM'
               ELSE 'BALANCED'
             END AS gap_status
      FROM contractor_profiles cp
      LEFT JOIN inquiries i ON i.contractor_id = cp.id
      GROUP BY 1 ORDER BY demand_enquiries DESC LIMIT 10
    `;

    const supplyDemandCat = await sql`
      SELECT sc.name AS category_name,
             COUNT(DISTINCT cp.id)::int AS supply_contractors,
             COUNT(DISTINCT i.id)::int AS demand_enquiries
      FROM service_categories sc
      LEFT JOIN contractor_categories cc ON cc.category_id = sc.id
      LEFT JOIN contractor_profiles cp ON cp.id = cc.contractor_id
      LEFT JOIN inquiries i ON i.category_id = sc.id
      GROUP BY sc.id, sc.name ORDER BY demand_enquiries DESC
    `;

    res.json({
      data: {
        userGrowth,
        enquiryFunnel: {
          enquiriesSent: total_enquiries,
          enquiriesAccepted: accepted_enquiries,
          messagesSent: total_messages,
        },
        verificationDistribution: verificationDist,
        geographicGap: supplyDemandGeo,
        categoryGap: supplyDemandCat,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ── 3. Users Management ───────────────────────────────────────────────────────
export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { role, q, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(String(page), 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10)));
    const offset = (pageNum - 1) * limitNum;

    const rows = await sql`
      SELECT u.id, u.email, u.role, u.created_at, u.updated_at,
             bp.company_name AS business_company,
             cp.company_name AS contractor_company,
             cp.verification_status
      FROM users u
      LEFT JOIN business_profiles bp ON bp.user_id = u.id
      LEFT JOIN contractor_profiles cp ON cp.user_id = u.id
      WHERE (${role ? sql`u.role = ${String(role)}` : sql`TRUE`})
        AND (${q ? sql`u.email ILIKE ${`%${q}%`} OR bp.company_name ILIKE ${`%${q}%`} OR cp.company_name ILIKE ${`%${q}%`}` : sql`TRUE`})
      ORDER BY u.created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const [{ total }] = await sql`
      SELECT COUNT(*)::int AS total
      FROM users u
      LEFT JOIN business_profiles bp ON bp.user_id = u.id
      LEFT JOIN contractor_profiles cp ON cp.user_id = u.id
      WHERE (${role ? sql`u.role = ${String(role)}` : sql`TRUE`})
        AND (${q ? sql`u.email ILIKE ${`%${q}%`} OR bp.company_name ILIKE ${`%${q}%`} OR cp.company_name ILIKE ${`%${q}%`}` : sql`TRUE`})
    `;

    res.json({ data: rows, total, page: pageNum, limit: limitNum });
  } catch (err) {
    next(err);
  }
}

export async function getUserDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const [user] = await sql`
      SELECT u.id, u.email, u.role, u.created_at, u.updated_at,
             bp.company_name AS business_company, bp.industry, bp.city AS business_city,
             cp.company_name AS contractor_company, cp.description, cp.city AS contractor_city,
             cp.years_experience, cp.workforce_size, cp.verification_status
      FROM users u
      LEFT JOIN business_profiles bp ON bp.user_id = u.id
      LEFT JOIN contractor_profiles cp ON cp.user_id = u.id
      WHERE u.id = ${id}
    `;

    if (!user) return next(notFound('User not found'));

    const userLogs = await sql`
      SELECT * FROM audit_logs WHERE target_id = ${id} ORDER BY created_at DESC
    `;

    res.json({ data: { ...user, auditHistory: userLogs } });
  } catch (err) {
    next(err);
  }
}

// ── 4. Verification Center ────────────────────────────────────────────────────
export async function listVerificationQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status = 'pending' } = req.query;

    // LEFT JOIN — most contractors are staff-managed now and have no
    // `users` row at all; an inner join would silently drop them from the
    // queue entirely.
    const rows = await sql`
      SELECT cp.id, cp.user_id, cp.company_name, cp.phone, cp.city, cp.state,
             cp.years_experience, cp.workforce_size, cp.verification_status, cp.verification_note,
             cp.created_at, u.email
      FROM contractor_profiles cp
      LEFT JOIN users u ON u.id = cp.user_id
      WHERE (${status ? sql`cp.verification_status = ${String(status)}` : sql`TRUE`})
      ORDER BY cp.created_at DESC
    `;

    const summary = await sql`
      SELECT verification_status AS status, COUNT(*)::int AS count
      FROM contractor_profiles
      GROUP BY verification_status
    `;

    res.json({ data: rows, summary });
  } catch (err) {
    next(err);
  }
}

export async function reviewVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: contractorId } = req.params;
    const adminId = req.user!.sub;
    const { status, note, checklist = {} } = req.body;

    // Matches contractor_profiles.verification_status's actual DB check
    // constraint — this is now the one verification path (see
    // pfContractorController.updatePfContractorVerification, which the
    // internal-staff tool calls; this one backs the admin workspace UI).
    if (!['pending', 'verified', 'rejected'].includes(status)) {
      return next(badRequest('Invalid verification status'));
    }

    // Verifying also publishes to the public directory (gated on
    // onboarding_complete) — see the matching comment in
    // pfContractorController.updatePfContractorVerification.
    const [updated] = await sql`
      UPDATE contractor_profiles
      SET verification_status = ${status},
          verification_note = ${note ?? null},
          onboarding_complete = CASE WHEN ${status} = 'verified' THEN true ELSE onboarding_complete END,
          updated_at = now()
      WHERE id = ${contractorId}
      RETURNING id, user_id, company_name, verification_status, onboarding_complete
    `;

    if (!updated) return next(notFound('Contractor profile not found'));

    // Record Verification Review
    await sql`
      INSERT INTO verification_reviews (contractor_id, reviewer_admin_id, status, checklist, notes)
      VALUES (${contractorId}, ${adminId}, ${status}, ${JSON.stringify(checklist)}, ${note ?? null})
    `;

    // Audit Log
    await sql`
      INSERT INTO audit_logs (admin_id, action, target_type, target_id, reason, metadata)
      VALUES (${adminId}, ${`VERIFICATION_${status.toUpperCase()}`}, 'contractor', ${contractorId}, ${note ?? null}, ${JSON.stringify({ checklist })})
    `;

    // Notify the contractor only if this is one of the legacy accounts that
    // still has a login — staff-managed records have no user to notify;
    // the verification result just shows up in their record for staff to see.
    if (updated.user_id) {
      const notifTitle = `Verification Update: ${status.toUpperCase().replace('_', ' ')}`;
      const notifMsg = note || `Your profile verification status has been updated to ${status}.`;
      await createNotification({
        userId: updated.user_id,
        type: 'VERIFICATION_UPDATE',
        title: notifTitle,
        message: notifMsg,
        referenceId: contractorId,
      });

      emitToUser(updated.user_id, 'notification:new', {
        title: notifTitle,
        message: notifMsg,
        referenceId: contractorId,
      });
    }

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

// ── 5. Reports & Moderation ───────────────────────────────────────────────────
export async function listReports(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status = 'open' } = req.query;

    const rows = await sql`
      SELECT r.*,
             u_rep.email AS reporter_email,
             u_target.email AS reported_user_email
      FROM reports r
      JOIN users u_rep ON u_rep.id = r.reporter_id
      LEFT JOIN users u_target ON u_target.id = r.reported_user_id
      WHERE (${status ? sql`r.status = ${String(status)}` : sql`TRUE`})
      ORDER BY r.created_at DESC
    `;

    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

export async function updateReportStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: reportId } = req.params;
    const adminId = req.user!.sub;
    const { status, resolutionNotes } = req.body;

    if (!['open', 'under_review', 'resolved', 'dismissed'].includes(status)) {
      return next(badRequest('Invalid report status'));
    }

    const [updated] = await sql`
      UPDATE reports
      SET status = ${status},
          resolution_notes = ${resolutionNotes ?? null},
          updated_at = now()
      WHERE id = ${reportId}
      RETURNING *
    `;

    if (!updated) return next(notFound('Report not found'));

    // Audit Log
    await sql`
      INSERT INTO audit_logs (admin_id, action, target_type, target_id, reason, metadata)
      VALUES (${adminId}, ${`REPORT_${status.toUpperCase()}`}, 'report', ${reportId}, ${resolutionNotes ?? null}, '{}'::jsonb)
    `;

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

// ── 6. Audit Logs ────────────────────────────────────────────────────────────
export async function listAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page = '1', limit = '30' } = req.query;
    const pageNum = Math.max(1, parseInt(String(page), 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10)));
    const offset = (pageNum - 1) * limitNum;

    const rows = await sql`
      SELECT al.*, u.email AS admin_email
      FROM audit_logs al
      JOIN users u ON u.id = al.admin_id
      ORDER BY al.created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const [{ total }] = await sql`SELECT COUNT(*)::int AS total FROM audit_logs`;

    res.json({ data: rows, total, page: pageNum, limit: limitNum });
  } catch (err) {
    next(err);
  }
}
