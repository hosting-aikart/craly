import { Request, Response, NextFunction } from 'express';
import sql from '../db/index';
import { sendVerificationMessageSchema } from '../validators/verificationMessageValidators';
import { createNotification, notifyUsersByRole } from '../utils/notifications';
import { emitToUser } from '../socket/emitter';
import type { AppError } from '../middlewares/errorHandler';

/**
 * Two-way messaging for the Contractor Application / Approval workflow —
 * lets a contractor under review reply to staff feedback (and ask
 * questions), and lets staff follow up without changing the verification
 * status. See migration 1789000000000_contractor_verification_messages
 * and staffController.ts (the one-off status/document review notes this
 * complements).
 */

function notFound(message: string): AppError {
  const err: AppError = new Error(message);
  err.statusCode = 404;
  return err;
}
function badRequest(message: string): AppError {
  const err: AppError = new Error(message);
  err.statusCode = 400;
  return err;
}

async function getContractorIdFromUserId(userId: string): Promise<string> {
  const [row] = await sql`SELECT id FROM contractor_profiles WHERE user_id = ${userId}`;
  if (!row) {
    const err: AppError = new Error('Contractor profile not found for this user');
    err.statusCode = 404;
    throw err;
  }
  return row.id;
}

/**
 * GET /api/contractor-portal/verification/messages
 * Logged-in contractor reads their own verification review thread.
 * Fetching marks staff's messages as read, mirroring listMessages in
 * messageController.ts.
 */
export async function getMyVerificationMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const contractorId = await getContractorIdFromUserId(req.user!.sub);

    await sql`
      UPDATE contractor_verification_messages
      SET is_read = true
      WHERE contractor_id = ${contractorId} AND sender_role != 'contractor' AND is_read = false
    `;

    const rows = await sql`
      SELECT id, contractor_id, sender_id, sender_role, message, is_read, created_at
      FROM contractor_verification_messages
      WHERE contractor_id = ${contractorId}
      ORDER BY created_at ASC
    `;

    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/contractor-portal/verification/messages
 * Logged-in contractor replies in their own verification review thread.
 * Notifies Staff/Admin so a reply doesn't sit unseen in the queue.
 */
export async function sendMyVerificationMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const contractorId = await getContractorIdFromUserId(req.user!.sub);
    const parsed = sendVerificationMessageSchema.safeParse(req.body);
    if (!parsed.success) return next(badRequest(parsed.error.issues[0]?.message ?? 'Invalid message'));

    const [contractor] = await sql`SELECT company_name FROM contractor_profiles WHERE id = ${contractorId}`;

    const [saved] = await sql`
      INSERT INTO contractor_verification_messages (contractor_id, sender_id, sender_role, message)
      VALUES (${contractorId}, ${req.user!.sub}, 'contractor', ${parsed.data.message})
      RETURNING id, contractor_id, sender_id, sender_role, message, is_read, created_at
    `;

    const notifTitle = 'Contractor Replied on Verification';
    const notifMsg = `${contractor?.company_name ?? 'A contractor'} replied on their verification application.`;
    await notifyUsersByRole('staff', { type: 'VERIFICATION_MESSAGE', title: notifTitle, message: notifMsg, referenceId: contractorId });
    await notifyUsersByRole('admin', { type: 'VERIFICATION_MESSAGE', title: notifTitle, message: notifMsg, referenceId: contractorId });

    res.status(201).json({ data: saved });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/staff/verification/contractors/:id/messages
 * Staff/Admin reads a specific contractor's verification review thread.
 * Fetching marks the contractor's messages as read.
 */
export async function getStaffVerificationMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: contractorId } = req.params;
    const [contractor] = await sql`SELECT id FROM contractor_profiles WHERE id = ${contractorId}`;
    if (!contractor) return next(notFound('Contractor not found'));

    await sql`
      UPDATE contractor_verification_messages
      SET is_read = true
      WHERE contractor_id = ${contractorId} AND sender_role = 'contractor' AND is_read = false
    `;

    const rows = await sql`
      SELECT m.id, m.contractor_id, m.sender_id, m.sender_role, m.message, m.is_read, m.created_at,
             u.email AS sender_email
      FROM contractor_verification_messages m
      LEFT JOIN users u ON u.id = m.sender_id
      WHERE m.contractor_id = ${contractorId}
      ORDER BY m.created_at ASC
    `;

    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/staff/verification/contractors/:id/messages
 * Staff/Admin sends a message/feedback into a contractor's verification
 * review thread — does not itself change verification_status (use
 * PATCH .../status or the per-document review endpoint for that).
 * Notifies the contractor in-app if their account still has a login.
 */
export async function sendStaffVerificationMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: contractorId } = req.params;
    const parsed = sendVerificationMessageSchema.safeParse(req.body);
    if (!parsed.success) return next(badRequest(parsed.error.issues[0]?.message ?? 'Invalid message'));

    const [contractor] = await sql`SELECT id, user_id FROM contractor_profiles WHERE id = ${contractorId}`;
    if (!contractor) return next(notFound('Contractor not found'));

    const senderRole = req.user!.role; // 'staff' | 'admin' (route already restricts to these)

    const [saved] = await sql`
      INSERT INTO contractor_verification_messages (contractor_id, sender_id, sender_role, message)
      VALUES (${contractorId}, ${req.user!.sub}, ${senderRole}, ${parsed.data.message})
      RETURNING id, contractor_id, sender_id, sender_role, message, is_read, created_at
    `;

    if (contractor.user_id) {
      const notifTitle = 'New Message from Craly Operations';
      const notifMsg = parsed.data.message.length > 140 ? `${parsed.data.message.slice(0, 140)}…` : parsed.data.message;
      await createNotification({
        userId: contractor.user_id,
        type: 'VERIFICATION_MESSAGE',
        title: notifTitle,
        message: notifMsg,
        referenceId: contractorId,
      });
      emitToUser(contractor.user_id, 'notification:new', { title: notifTitle, message: notifMsg, referenceId: contractorId });
    }

    res.status(201).json({ data: saved });
  } catch (err) {
    next(err);
  }
}
