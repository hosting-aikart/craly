import sql from '../db/index';

export type NotificationType = 'enquiry_received' | 'enquiry_message';

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  referenceId?: string;
}

/**
 * Single insert point for in-app notifications. Kept generic (free-text
 * `type` + `referenceId`) on purpose — future stages (quotations,
 * contracts, work orders) can create their own notification types through
 * this same function without a schema change or a rewrite of the enquiry
 * system.
 */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  await sql`
    INSERT INTO notifications (user_id, type, title, message, reference_id)
    VALUES (${input.userId}, ${input.type}, ${input.title}, ${input.message}, ${input.referenceId ?? null})
  `;
}
