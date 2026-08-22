import { Request, Response, NextFunction } from 'express';
import sql from '../db/index';
import config from '../config/index';
import { createEnquirySchema } from '../validators/enquiryValidators';
import { createNotification } from '../utils/notifications';
import { sendEnquiryReceivedEmail, sendEnquiryAcceptedEmail } from '../utils/mailer';
import { getOwnBusinessProfile } from '../utils/actorProfile';
import { sanitizeContactInfo } from '../utils/contactSanitizer';
import { PUBLICLY_DISCOVERABLE_CONDITION } from '../utils/contractorVisibility';
import { emitToUser, emitToEnquiryRoom } from '../socket/emitter';
import type { AppError } from '../middlewares/errorHandler';

function forbidden(message: string): AppError {
  const err: AppError = new Error(message);
  err.statusCode = 403;
  return err;
}
function notFound(message: string): AppError {
  const err: AppError = new Error(message);
  err.statusCode = 404;
  return err;
}

/**
 * POST /api/enquiries
 * A business submits a structured enquiry to a contractor. Craly never
 * hands out contact details directly — this is the only way a business can
 * reach a contractor. Status defaults to PENDING.
 */
export async function createEnquiry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user!.role !== 'business') {
      return next(forbidden('Only businesses can send enquiries'));
    }

    const parsed = createEnquirySchema.safeParse(req.body);
    if (!parsed.success) {
      const err: AppError = new Error(parsed.error.issues[0]?.message ?? 'Invalid input');
      err.statusCode = 400;
      return next(err);
    }
    const { contractorId, categoryId, location, workersRequired, startDate, duration, message } = parsed.data;

    const business = await getOwnBusinessProfile(req.user!.sub);
    if (!business) return next(notFound('Business profile not found'));

    // LEFT JOIN — most contractors are staff-managed now and have no
    // `users` row at all, so `email` and `user_id` may come back null.
    // Same discoverability rule as the directory/profile endpoints — a
    // business that already knows/bookmarked a contractor id must not be
    // able to reach a SUSPENDED contractor just because the directory hid it.
    const [contractor] = await sql`
      SELECT cp.id, cp.company_name, cp.user_id, u.email
      FROM contractor_profiles cp
      LEFT JOIN users u ON u.id = cp.user_id
      WHERE cp.id = ${contractorId} AND ${PUBLICLY_DISCOVERABLE_CONDITION}
    `;
    if (!contractor) return next(notFound('Contractor not found'));

    let categoryName: string | null = null;
    if (categoryId != null) {
      const [category] = await sql`
        SELECT sc.name FROM contractor_categories cc
        JOIN service_categories sc ON sc.id = cc.category_id
        WHERE cc.contractor_id = ${contractorId} AND cc.category_id = ${categoryId}
      `;
      if (!category) {
        const err: AppError = new Error('That requirement type is not offered by this contractor');
        err.statusCode = 400;
        return next(err);
      }
      categoryName = category.name;
    }

    const cleanMessage = sanitizeContactInfo(message);
    const cleanLocation = location ? sanitizeContactInfo(location) : null;
    const cleanDuration = duration ? sanitizeContactInfo(duration) : null;

    const [inquiry] = await sql`
      INSERT INTO inquiries (
        business_id, contractor_id, category_id, location, workers_required,
        start_date, duration, message, status
      ) VALUES (
        ${business.id}, ${contractorId}, ${categoryId ?? null}, ${cleanLocation},
        ${workersRequired ?? null}, ${startDate ?? null}, ${cleanDuration}, ${cleanMessage}, 'NEW'
      )
      RETURNING *
    `;

    // The enquiry now lands in the internal ops queue, not a contractor
    // inbox — contractors have no login to view this URL themselves.
    const enquiryUrl = `${config.frontendUrl}/contractor/enquiries/${inquiry.id}`;
    const notificationMessage = `${business.company_name} wants to hire you.${workersRequired ? ` ${workersRequired} workers` : ''}${location ? ` in ${location}` : ''}.`;

    // Most contractors are staff-managed and have no `users` row — only
    // notify/email when one still exists (a legacy account, or once staff
    // logins are wired to receive these on the contractor's behalf).
    if (contractor.user_id) {
      await createNotification({
        userId: contractor.user_id,
        type: 'NEW_ENQUIRY',
        title: 'New Project Enquiry',
        message: notificationMessage,
        referenceId: inquiry.id,
      });

      emitToUser(contractor.user_id, 'enquiry:new', {
        enquiryId: inquiry.id,
        businessName: business.company_name,
        message: notificationMessage,
      });
      emitToUser(contractor.user_id, 'notification:new', {
        title: 'New Project Enquiry',
        message: notificationMessage,
        referenceId: inquiry.id,
      });
    }

    if (contractor.email) {
      // Email is best-effort — a failed send must never fail enquiry creation.
      try {
        await sendEnquiryReceivedEmail({
          to: contractor.email,
          contractorName: contractor.company_name,
          businessName: business.company_name,
          categoryName: categoryName ?? undefined,
          workersRequired: workersRequired ?? undefined,
          location: location ?? undefined,
          enquiryUrl,
        });
      } catch (err) {
        console.error('[mailer] enquiry-received email failed:', err);
      }
    }

    res.status(201).json({ data: inquiry });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/enquiries/:id/accept
 * Ops Head / Field Staff mark a pending enquiry as being actively brokered
 * with the contractor — this is the "internal team manually connects both
 * sides" step, done on the contractor's behalf since they have no login.
 * Updates status NEW/UNDER_REVIEW -> BROKERING and unlocks the conversation.
 */
export async function acceptEnquiry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    if (req.user!.role !== 'ops_head' && req.user!.role !== 'field_staff' && req.user!.role !== 'admin') {
      return next(forbidden('Only internal staff can act on enquiries on a contractor\'s behalf'));
    }

    const [enquiry] = await sql`
      SELECT i.id, i.status, i.business_id, cp.company_name AS contractor_name,
             bp.user_id AS business_user_id, bp.company_name AS business_name, u.email AS business_email
      FROM inquiries i
      JOIN business_profiles bp ON bp.id = i.business_id
      JOIN contractor_profiles cp ON cp.id = i.contractor_id
      JOIN users u ON u.id = bp.user_id
      WHERE i.id = ${id}
    `;

    if (!enquiry) return next(notFound('Enquiry not found'));

    if (enquiry.status !== 'NEW' && enquiry.status !== 'UNDER_REVIEW') {
      const err: AppError = new Error(`Enquiry cannot be accepted because it is currently ${enquiry.status}`);
      err.statusCode = 400;
      return next(err);
    }

    const [updated] = await sql`
      UPDATE inquiries
      SET status = 'BROKERING', updated_at = now()
      WHERE id = ${id} AND status = ${enquiry.status}
      RETURNING *
    `;

    if (!updated) {
      const err: AppError = new Error('Enquiry acceptance failed');
      err.statusCode = 400;
      return next(err);
    }

    const notifTitle = 'Your enquiry is being brokered';
    const notifMessage = `${enquiry.contractor_name} is available — Craly is coordinating your requirement.`;

    await createNotification({
      userId: enquiry.business_user_id,
      type: 'ENQUIRY_ACCEPTED',
      title: notifTitle,
      message: notifMessage,
      referenceId: id,
    });

    emitToUser(enquiry.business_user_id, 'enquiry:accepted', {
      enquiryId: id,
      contractorName: enquiry.contractor_name,
    });
    emitToUser(enquiry.business_user_id, 'notification:new', {
      title: notifTitle,
      message: notifMessage,
      referenceId: id,
    });
    emitToEnquiryRoom(id, 'enquiry:updated', { status: 'BROKERING' });

    try {
      await sendEnquiryAcceptedEmail({
        to: enquiry.business_email,
        businessName: enquiry.business_name,
        contractorName: enquiry.contractor_name,
        conversationUrl: `${config.frontendUrl}/business/enquiries/${id}`,
      });
    } catch (err) {
      console.error('[mailer] enquiry-accepted email failed:', err);
    }

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/enquiries/:id/decline
 * Ops Head / Field Staff mark a pending enquiry as declined on the
 * contractor's behalf (e.g. the contractor said they're unavailable over
 * WhatsApp/phone), with an optional reason.
 */
export async function declineEnquiry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : null;

    if (req.user!.role !== 'ops_head' && req.user!.role !== 'field_staff' && req.user!.role !== 'admin') {
      return next(forbidden('Only internal staff can act on enquiries on a contractor\'s behalf'));
    }

    const [enquiry] = await sql`
      SELECT i.id, i.status, cp.company_name AS contractor_name, bp.user_id AS business_user_id
      FROM inquiries i
      JOIN business_profiles bp ON bp.id = i.business_id
      JOIN contractor_profiles cp ON cp.id = i.contractor_id
      WHERE i.id = ${id}
    `;

    if (!enquiry) return next(notFound('Enquiry not found'));

    if (enquiry.status !== 'NEW' && enquiry.status !== 'UNDER_REVIEW') {
      const err: AppError = new Error(`Enquiry cannot be declined because it is currently ${enquiry.status}`);
      err.statusCode = 400;
      return next(err);
    }

    const cleanReason = reason ? sanitizeContactInfo(reason) : null;

    const [updated] = await sql`
      UPDATE inquiries
      SET status = 'DECLINED', status_reason = ${cleanReason}, updated_at = now()
      WHERE id = ${id} AND status = ${enquiry.status}
      RETURNING *
    `;

    if (!updated) {
      const err: AppError = new Error('Enquiry decline failed');
      err.statusCode = 400;
      return next(err);
    }

    const notifTitle = 'Your enquiry was declined';
    const notifMessage = `${enquiry.contractor_name} is not available for this requirement.`;

    await createNotification({
      userId: enquiry.business_user_id,
      type: 'ENQUIRY_DECLINED',
      title: notifTitle,
      message: notifMessage,
      referenceId: id,
    });

    emitToUser(enquiry.business_user_id, 'enquiry:declined', {
      enquiryId: id,
      contractorName: enquiry.contractor_name,
    });
    emitToUser(enquiry.business_user_id, 'notification:new', {
      title: notifTitle,
      message: notifMessage,
      referenceId: id,
    });
    emitToEnquiryRoom(id, 'enquiry:updated', { status: 'DECLINED' });

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/enquiries
 * The caller's own enquiries — sent (business) or received (contractor).
 */
export async function listEnquiries(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;

    if (req.user!.role === 'business') {
      const business = await getOwnBusinessProfile(userId);
      if (!business) return next(notFound('Business profile not found'));

      const rows = await sql`
        SELECT i.*, cp.company_name AS other_party_name, sc.name AS category_name,
               EXISTS(
                 SELECT 1 FROM inquiry_messages m
                 WHERE m.inquiry_id = i.id AND m.receiver_id = ${userId} AND m.is_read = false
               ) AS has_unread
        FROM inquiries i
        JOIN contractor_profiles cp ON cp.id = i.contractor_id
        LEFT JOIN service_categories sc ON sc.id = i.category_id
        WHERE i.business_id = ${business.id}
        ORDER BY i.updated_at DESC
      `;
      res.json({ data: rows });
      return;
    }

    if (req.user!.role === 'ops_head' || req.user!.role === 'field_staff' || req.user!.role === 'admin') {
      // Staff aren't scoped to "their own" contractor — they broker across
      // the whole queue on behalf of whichever contractor each enquiry names.
      const rows = await sql`
        SELECT i.*, bp.company_name AS other_party_name, sc.name AS category_name,
               cp.company_name AS contractor_name
        FROM inquiries i
        JOIN business_profiles bp ON bp.id = i.business_id
        JOIN contractor_profiles cp ON cp.id = i.contractor_id
        LEFT JOIN service_categories sc ON sc.id = i.category_id
        ORDER BY i.updated_at DESC
      `;
      res.json({ data: rows });
      return;
    }

    return next(forbidden('Enquiries are only available to business accounts and internal staff'));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/enquiries/:id
 * A single enquiry, with both parties' names.
 */
export async function getEnquiry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.sub;

    const [row] = await sql`
      SELECT i.*, bp.company_name AS business_name, bp.city AS business_city, bp.state AS business_state,
             bp.user_id AS business_user_id, cp.company_name AS contractor_name, cp.user_id AS contractor_user_id,
             sc.name AS category_name
      FROM inquiries i
      JOIN business_profiles bp ON bp.id = i.business_id
      JOIN contractor_profiles cp ON cp.id = i.contractor_id
      LEFT JOIN service_categories sc ON sc.id = i.category_id
      WHERE i.id = ${id}
    `;
    if (!row) return next(notFound('Enquiry not found'));

    const isBusinessParty = row.business_user_id === userId;
    const isContractorParty = row.contractor_user_id === userId; // legacy accounts only — always false for staff-managed contractors
    const isStaff = req.user!.role === 'ops_head' || req.user!.role === 'field_staff' || req.user!.role === 'admin';
    if (!isBusinessParty && !isContractorParty && !isStaff) {
      return next(forbidden('You do not have access to this enquiry'));
    }

    res.json({ data: row });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/enquiries/:id/status
 * Manually close an enquiry (business gives up waiting, or staff marks it
 * expired). Either party or staff can trigger this; nothing else about the
 * lifecycle is client-settable — see acceptEnquiry/declineEnquiry and
 * messageController's automatic status advances.
 */
export async function updateEnquiryStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.sub;
    const isStaff = req.user!.role === 'ops_head' || req.user!.role === 'field_staff' || req.user!.role === 'admin';

    const [row] = await sql`
      SELECT i.id, bp.user_id AS business_user_id, cp.user_id AS contractor_user_id
      FROM inquiries i
      JOIN business_profiles bp ON bp.id = i.business_id
      JOIN contractor_profiles cp ON cp.id = i.contractor_id
      WHERE i.id = ${id}
    `;
    if (!row) return next(notFound('Enquiry not found'));
    if (row.business_user_id !== userId && row.contractor_user_id !== userId && !isStaff) {
      return next(forbidden('You do not have access to this enquiry'));
    }

    const [updated] = await sql`
      UPDATE inquiries SET status = 'CLOSED_EXPIRED', updated_at = now()
      WHERE id = ${id}
      RETURNING id, status, updated_at
    `;

    emitToEnquiryRoom(id, 'enquiry:updated', { status: 'CLOSED_EXPIRED' });

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}
