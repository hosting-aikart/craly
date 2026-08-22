import sql from '../db/index';
import { emitToUser } from '../socket/emitter';

export type NotificationType =
  | 'NEW_ENQUIRY'
  | 'ENQUIRY_ACCEPTED'
  | 'ENQUIRY_DECLINED'
  | 'NEW_MESSAGE'
  | 'MEETING_CREATED'
  | 'MEETING_UPDATED'
  | 'enquiry_received'
  | 'enquiry_message'
  | string;

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  referenceId?: string;
}

/**
 * Single insert point for in-app notifications.
 */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  await sql`
    INSERT INTO notifications (user_id, type, title, message, reference_id)
    VALUES (${input.userId}, ${input.type}, ${input.title}, ${input.message}, ${input.referenceId ?? null})
  `;
}

/**
 * Fans a notification out to every active user in a given role — used for
 * the Field Staff → Operations Head submission handoff (§12/§13), where the
 * recipient isn't one specific user but "whoever is Ops Head right now."
 * Mirrors the createNotification + emitToUser pairing already used at each
 * existing call site (e.g. adminWorkspaceController.reviewVerification).
 */
export async function notifyUsersByRole(
  role: string,
  input: Omit<CreateNotificationInput, 'userId'>,
): Promise<void> {
  const recipients = await sql`SELECT id FROM users WHERE role = ${role} AND is_active = true`;
  for (const { id: userId } of recipients) {
    await createNotification({ ...input, userId });
    emitToUser(userId, 'notification:new', {
      type: input.type,
      title: input.title,
      message: input.message,
      referenceId: input.referenceId,
    });
  }
}
