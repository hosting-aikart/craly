import { Request, Response, NextFunction } from 'express';
import sql from '../db/index';
import config from '../config/index';
import { createEnquirySchema, updateEnquiryStatusSchema } from '../validators/enquiryValidators';
import { createNotification } from '../utils/notifications';
import { sendEnquiryReceivedEmail } from '../utils/mailer';
import { getOwnBusinessProfile, getOwnContractorProfile } from '../utils/actorProfile';
import { sanitizeContactInfo } from '../utils/contactSanitizer';
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
 * reach a contractor.
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

    const [contractor] = await sql`
      SELECT cp.id, cp.company_name, cp.user_id, u.email
      FROM contractor_profiles cp
      JOIN users u ON u.id = cp.user_id
      WHERE cp.id = ${contractorId} AND cp.onboarding_complete = true
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
        start_date, duration, message
      ) VALUES (
        ${business.id}, ${contractorId}, ${categoryId ?? null}, ${cleanLocation},
        ${workersRequired ?? null}, ${startDate ?? null}, ${cleanDuration}, ${cleanMessage}
      )
      RETURNING *
    `;

    const enquiryUrl = `${config.frontendUrl}/contractor/enquiries/${inquiry.id}`;

    await createNotification({
      userId: contractor.user_id,
      type: 'enquiry_received',
      title: 'New Business Enquiry',
      message: `${business.company_name} needs${workersRequired ? ` ${workersRequired} workers` : ''}${location ? ` in ${location}` : ''}.`,
      referenceId: inquiry.id,
    });

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

    res.status(201).json({ data: inquiry });
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

    if (req.user!.role === 'contractor') {
      const contractor = await getOwnContractorProfile(userId);
      if (!contractor) return next(notFound('Contractor profile not found'));

      const rows = await sql`
        SELECT i.*, bp.company_name AS other_party_name, sc.name AS category_name,
               EXISTS(
                 SELECT 1 FROM inquiry_messages m
                 WHERE m.inquiry_id = i.id AND m.receiver_id = ${userId} AND m.is_read = false
               ) AS has_unread
        FROM inquiries i
        JOIN business_profiles bp ON bp.id = i.business_id
        LEFT JOIN service_categories sc ON sc.id = i.category_id
        WHERE i.contractor_id = ${contractor.id}
        ORDER BY i.updated_at DESC
      `;
      res.json({ data: rows });
      return;
    }

    return next(forbidden('Enquiries are only available to business and contractor accounts'));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/enquiries/:id
 * A single enquiry, with both parties' names. Opening it as the contractor
 * auto-transitions a fresh enquiry from 'new' to 'viewed'.
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
    const isContractorParty = row.contractor_user_id === userId;
    if (!isBusinessParty && !isContractorParty) {
      return next(forbidden('You do not have access to this enquiry'));
    }

    if (isContractorParty && row.status === 'new') {
      const [updated] = await sql`
        UPDATE inquiries SET status = 'viewed', updated_at = now() WHERE id = ${id} RETURNING status, updated_at
      `;
      row.status = updated.status;
      row.updated_at = updated.updated_at;
    }

    res.json({ data: row });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/enquiries/:id/status
 * The only client-settable transition is closing it — every other status
 * change is server-managed (see getEnquiry / messageController) so neither
 * side can spoof "responded" or jump back to "new".
 */
export async function updateEnquiryStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.sub;

    const parsed = updateEnquiryStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      const err: AppError = new Error(parsed.error.issues[0]?.message ?? 'Invalid status');
      err.statusCode = 400;
      return next(err);
    }

    const [row] = await sql`
      SELECT i.id, bp.user_id AS business_user_id, cp.user_id AS contractor_user_id
      FROM inquiries i
      JOIN business_profiles bp ON bp.id = i.business_id
      JOIN contractor_profiles cp ON cp.id = i.contractor_id
      WHERE i.id = ${id}
    `;
    if (!row) return next(notFound('Enquiry not found'));
    if (row.business_user_id !== userId && row.contractor_user_id !== userId) {
      return next(forbidden('You do not have access to this enquiry'));
    }

    const [updated] = await sql`
      UPDATE inquiries SET status = ${parsed.data.status}, updated_at = now()
      WHERE id = ${id}
      RETURNING id, status, updated_at
    `;
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}
