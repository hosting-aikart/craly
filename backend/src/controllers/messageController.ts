import { Request, Response, NextFunction } from 'express';
import sql from '../db/index';
import { createMessageSchema } from '../validators/enquiryValidators';
import { createNotification } from '../utils/notifications';
import { sanitizeContactInfo } from '../utils/contactSanitizer';
import { emitToUser, emitToEnquiryRoom } from '../socket/emitter';
import type { AppError } from '../middlewares/errorHandler';
import { getOwnContractorProfile } from '../utils/actorProfile';

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
    SELECT i.id, i.status, i.contractor_id,
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
        contractor_id: string;
        business_user_id: string;
        business_name: string;
        contractor_user_id: string | null;
        contractor_name: string;
      }
    | undefined;
}

/**
 * POST /api/enquiries/:id/messages
 * Sends a message once the enquiry is being actively brokered.
 *
 * Direct business <-> contractor or business <-> internal staff messaging within a brokered enquiry.
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
    let isContractorParty = enquiry.contractor_user_id === userId;
    if (!isContractorParty && req.user!.role === 'contractor') {
      const contractor = await getOwnContractorProfile(userId);
      if (contractor && contractor.id === enquiry.contractor_id) {
        isContractorParty = true;
      }
    }

    if (!isBusinessParty && !isContractorParty && !isStaff) {
      return next(forbidden('You do not have access to this enquiry'));
    }

    if (['NEW', 'UNDER_REVIEW', 'DECLINED', 'LOST', 'CLOSED_EXPIRED'].includes(enquiry.status)) {
      const err: AppError = new Error('This enquiry is not open for messages yet, or has been closed.');
      err.statusCode = 400;
      return next(err);
    }

    const receiverId = isStaff
      ? enquiry.business_user_id
      : (isBusinessParty
          ? (enquiry.contractor_user_id || null)
          : enquiry.business_user_id);

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

    if (receiverId) {
      const notifTitle = 'New Message';
      const senderName = isStaff
        ? enquiry.contractor_name
        : (isBusinessParty ? enquiry.business_name : enquiry.contractor_name);
      const notifText = `${senderName} sent a new message.`;

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

    const isBusinessParty = enquiry.business_user_id === userId;
    let isContractorParty = enquiry.contractor_user_id === userId;
    if (!isContractorParty && req.user!.role === 'contractor') {
      const contractor = await getOwnContractorProfile(userId);
      if (contractor && contractor.id === enquiry.contractor_id) {
        isContractorParty = true;
      }
    }

    if (!isBusinessParty && !isContractorParty && !isStaff) {
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
