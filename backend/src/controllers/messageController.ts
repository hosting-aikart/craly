import { Request, Response, NextFunction } from 'express';
import sql from '../db/index';
import { createMessageSchema } from '../validators/enquiryValidators';
import { createNotification } from '../utils/notifications';
import { sanitizeContactInfo } from '../utils/contactSanitizer';
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

async function loadEnquiryForMessaging(id: string) {
  const [row] = await sql`
    SELECT i.id, i.status,
           bp.user_id AS business_user_id, bp.company_name AS business_name,
           cp.user_id AS contractor_user_id, cp.company_name AS contractor_name
    FROM inquiries i
    JOIN business_profiles bp ON bp.id = i.business_id
    JOIN contractor_profiles cp ON cp.id = i.contractor_id
    WHERE i.id = ${id}
  `;
  return row as
    | {
        id: string;
        status: string;
        business_user_id: string;
        business_name: string;
        contractor_user_id: string;
        contractor_name: string;
      }
    | undefined;
}

/**
 * POST /api/enquiries/:id/messages
 * Sends a message once the enquiry is being actively brokered.
 *
 * Contractors have no login, so this is now business <-> internal staff,
 * with staff relaying on the contractor's behalf — not a direct
 * business<->contractor channel (that stays Phase 2, per scope). A
 * business-sent message has no contractor user to receive it, so
 * `receiver_id` is null in that case; staff pick it up via the enquiry
 * queue rather than a personal notification.
 *
 * Strict rules:
 * 1. Enquiry must be past NEW/UNDER_REVIEW (staff have engaged it).
 * 2. Contact details (phone numbers, emails, WhatsApp links) are blocked.
 * 3. Saves to PostgreSQL first, then emits Socket.IO event to enquiry room & receiver.
 */
export async function createMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.sub;
    const isStaff = req.user!.role === 'ops_head' || req.user!.role === 'field_staff' || req.user!.role === 'admin';

    const parsed = createMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      const err: AppError = new Error(parsed.error.issues[0]?.message ?? 'Invalid message');
      err.statusCode = 400;
      return next(err);
    }

    const enquiry = await loadEnquiryForMessaging(id);
    if (!enquiry) return next(notFound('Enquiry not found'));

    const isBusinessParty = enquiry.business_user_id === userId;
    if (!isBusinessParty && !isStaff) {
      return next(forbidden('You do not have access to this enquiry'));
    }

    if (['NEW', 'UNDER_REVIEW', 'DECLINED', 'LOST', 'CLOSED_EXPIRED'].includes(enquiry.status)) {
      const err: AppError = new Error('This enquiry is not open for messages yet, or has been closed.');
      err.statusCode = 400;
      return next(err);
    }

    // Staff act for the contractor -> message goes to the business. A
    // business message has no contractor user to notify directly.
    const receiverId = isStaff ? enquiry.business_user_id : null;

    // Contact privacy filter check
    const rawMessage = parsed.data.message;
    const cleanMessage = sanitizeContactInfo(rawMessage);

    // If contact info was detected and redacted, or if user attempted direct contact link
    if (cleanMessage !== rawMessage && cleanMessage.includes('[Contact Info Hidden by Craly')) {
      const err: AppError = new Error(
        "For safety and privacy, phone numbers, email addresses and external contact details cannot be shared in Craly chat."
      );
      err.statusCode = 400;
      return next(err);
    }

    // Database is the source of truth: Insert message into PostgreSQL first
    const [savedMessage] = await sql`
      INSERT INTO inquiry_messages (inquiry_id, sender_id, receiver_id, message)
      VALUES (${id}, ${userId}, ${receiverId}, ${cleanMessage})
      RETURNING *
    `;

    // Update enquiry timestamp
    await sql`UPDATE inquiries SET updated_at = now() WHERE id = ${id}`;

    emitToEnquiryRoom(id, 'message:new', savedMessage);

    // Only the business side has a real account to notify right now.
    if (receiverId) {
      const notifTitle = 'New Message';
      const notifText = `${enquiry.contractor_name} sent a new message.`;

      await createNotification({
        userId: receiverId,
        type: 'NEW_MESSAGE',
        title: notifTitle,
        message: notifText,
        referenceId: id,
      });

      emitToUser(receiverId, 'notification:new', {
        title: notifTitle,
        message: notifText,
        referenceId: id,
      });
    }

    res.status(201).json({ data: savedMessage });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/enquiries/:id/messages
 * Fetching the conversation marks the caller's unread messages as read.
 */
export async function listMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.sub;
    const isStaff = req.user!.role === 'ops_head' || req.user!.role === 'field_staff' || req.user!.role === 'admin';

    const enquiry = await loadEnquiryForMessaging(id);
    if (!enquiry) return next(notFound('Enquiry not found'));
    if (enquiry.business_user_id !== userId && !isStaff) {
      return next(forbidden('You do not have access to this enquiry'));
    }

    // Unlocks chat list only if ACCEPTED or if fetching history
    await sql`
      UPDATE inquiry_messages SET is_read = true
      WHERE inquiry_id = ${id} AND receiver_id = ${userId} AND is_read = false
    `;

    const messages = await sql`
      SELECT * FROM inquiry_messages WHERE inquiry_id = ${id} ORDER BY created_at ASC
    `;

    res.json({ data: messages });
  } catch (err) {
    next(err);
  }
}
