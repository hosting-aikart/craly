import sql from '../db/index';

/**
 * Single shared insert point for `audit_logs` (created for the admin
 * workspace, reused here rather than standing up a second audit trail —
 * see pfContractorController.ts and contractorRequestController.ts, which
 * each had their own inline copy of this same insert before this file
 * existed; new code should import from here instead of duplicating it).
 */
export async function logAudit(
  actorId: string,
  action: string,
  targetType: string,
  targetId: string,
  reason?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await sql`
    INSERT INTO audit_logs (admin_id, action, target_type, target_id, reason, metadata)
    VALUES (${actorId}, ${action}, ${targetType}, ${targetId}, ${reason ?? null}, ${JSON.stringify(metadata ?? {})})
  `;
}
