import { Request, Response, NextFunction } from 'express';
import sql from '../db/index';
import config from '../config/index';
import { createMessageSchema } from '../validators/enquiryValidators';
import { createNotification } from '../utils/notifications';
import { sendEnquiryReplyEmail } from '../utils/mailer';
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
 * Replying moves the enquiry through its workflow automatically: a
 * contractor's first reply marks it 'responded'; anything after that is
 * 'in_discussion'. Clients never set status directly.
 */
export async function createMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.sub;

    const parsed = createMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      const err: AppError = new Error(parsed.error.issues[0]?.message ?? 'Invalid message');
      err.statusCode = 400;
      return next(err);
    }

    const enquiry = await loadEnquiryForMessaging(id);
    if (!enquiry) return next(notFound('Enquiry not found'));

    const isBusinessParty = enquiry.business_user_id === userId;
    const isContractorParty = enquiry.contractor_user_id === userId;
    if (!isBusinessParty && !isContractorParty) {
      return next(forbidden('You do not have access to this enquiry'));
    }

    if (enquiry.status === 'closed') {
      const err: AppError = new Error('This enquiry is closed');
      err.statusCode = 400;
      return next(err);
    }

    const receiverId = isContractorParty ? enquiry.business_user_id : enquiry.contractor_user_id;
    const cleanMessage = sanitizeContactInfo(parsed.data.message);

    const [savedMessage] = await sql`
      INSERT INTO inquiry_messages (inquiry_id, sender_id, receiver_id, message)
      VALUES (${id}, ${userId}, ${receiverId}, ${cleanMessage})
      RETURNING *
    `;

    const isFirstContractorReply = isContractorParty && (enquiry.status === 'new' || enquiry.status === 'viewed');
    const nextStatus = isFirstContractorReply ? 'responded' : enquiry.status === 'responded' ? 'in_discussion' : enquiry.status;
    await sql`UPDATE inquiries SET status = ${nextStatus}, updated_at = now() WHERE id = ${id}`;

    await createNotification({
      userId: receiverId,
      type: 'enquiry_message',
      title: isContractorParty ? 'Contractor Replied' : 'New Message',
      message: isContractorParty
        ? `${enquiry.contractor_name} replied to your enquiry.`
        : `${enquiry.business_name} sent a new message.`,
      referenceId: id,
    });

    // Only the contractor's *first* reply sends an email — every later
    // back-and-forth message stays in-app only, per the "don't spam email"
    // rule. In-app notifications above still fire for every message.
    if (isFirstContractorReply) {
      try {
        const [businessUser] = await sql`SELECT email FROM users WHERE id = ${enquiry.business_user_id}`;
        if (businessUser) {
          await sendEnquiryReplyEmail({
            to: businessUser.email,
            businessName: enquiry.business_name,
            contractorName: enquiry.contractor_name,
            conversationUrl: `${config.frontendUrl}/business/enquiries/${id}`,
          });
        }
      } catch (err) {
        console.error('[mailer] enquiry-reply email failed:', err);
      }
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

    const enquiry = await loadEnquiryForMessaging(id);
    if (!enquiry) return next(notFound('Enquiry not found'));
    if (enquiry.business_user_id !== userId && enquiry.contractor_user_id !== userId) {
      return next(forbidden('You do not have access to this enquiry'));
    }

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
