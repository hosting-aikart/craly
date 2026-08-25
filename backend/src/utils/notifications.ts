import sql from '../db/index';
import { emitToUser } from '../socket/emitter';
import { contractorEligibilityCondition } from './opportunityMatching';

export type NotificationType =
  | 'NEW_ENQUIRY'
  | 'ENQUIRY_ACCEPTED'
  | 'ENQUIRY_DECLINED'
  | 'NEW_MESSAGE'
  | 'MEETING_CREATED'
  | 'MEETING_UPDATED'
  | 'enquiry_received'
  | 'enquiry_message'
  | 'NEW_MATCHING_OPPORTUNITY'
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

export interface MatchableRequirement {
  id: string;
  title: string;
  location: string | null;
  city: string | null;
  state: string | null;
  workers_required: number;
  industry: string | null;
  experience_required: number | null;
}

/**
 * Fans a "new matching opportunity" notification out to every contractor
 * whose profile matches a just-published requirement. Uses the exact same
 * eligibility rule (contractorEligibilityCondition, from
 * ../utils/opportunityMatching.ts) as getOpportunities/getOpportunityById/
 * applyToOpportunity/getDashboardStats in contractorPortalController.ts, so
 * "who gets notified" can never drift from "who actually sees this
 * opportunity in their list."
 *
 * Deliberately carries none of the Manufacturer's identity or contact
 * details: only the requirement's own public fields (title/location/
 * workers required) and a reference id the contractor-portal UI resolves
 * back to the opportunity detail page.
 */
export async function notifyMatchingContractors(requirement: MatchableRequirement): Promise<void> {
  const eligibility = contractorEligibilityCondition(requirement);

  const matches = await sql<{ user_id: string }[]>`
    SELECT u.id AS user_id
    FROM contractor_profiles cp
    JOIN users u ON u.id = cp.user_id
    WHERE u.is_active = true
      AND cp.onboarding_complete = true
      AND ${eligibility}
  `;

  const title = 'New Matching Opportunity';
  const workerWord = requirement.workers_required === 1 ? 'worker' : 'workers';
  const message = requirement.location
    ? `"${requirement.title}" in ${requirement.location} needs ${requirement.workers_required} ${workerWord} — check if it fits your capacity.`
    : `"${requirement.title}" needs ${requirement.workers_required} ${workerWord} — check if it fits your capacity.`;

  for (const { user_id: userId } of matches) {
    await createNotification({
      userId,
      type: 'NEW_MATCHING_OPPORTUNITY',
      title,
      message,
      referenceId: requirement.id,
    });
    emitToUser(userId, 'notification:new', {
      type: 'NEW_MATCHING_OPPORTUNITY',
      title,
      message,
      referenceId: requirement.id,
    });
  }
}
