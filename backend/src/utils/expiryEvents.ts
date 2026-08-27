import sql from '../db/index';

/**
 * Backend event structure for future reminder delivery (§13) — deliberately
 * NOT wired to any real delivery channel (no WhatsApp/email in this task).
 * Reuses the existing `platform_events` table rather than a new one; a
 * future cron job or manual trigger calls this and then reads
 * `platform_events` to actually send reminders. Idempotent per 24h per
 * contractor+event_type so repeated calls don't spam duplicate rows.
 *
 * Not scheduled anywhere in this codebase — there is no cron infrastructure
 * here yet. Exported so it's callable/testable now and wireable later.
 */
export async function recordExpiryEventsIfDue(): Promise<{ verificationEvents: number; certificationEvents: number }> {
  const verificationDue = await sql`
    SELECT id FROM contractor_profiles
    WHERE next_verification_due_at IS NOT NULL
      AND next_verification_due_at <= now() + interval '30 days'
      AND next_verification_due_at > now()
      AND NOT EXISTS (
        SELECT 1 FROM platform_events
        WHERE entity_type = 'contractor' AND entity_id = contractor_profiles.id
          AND event_type = 'verification_expiring_soon'
          AND created_at > now() - interval '24 hours'
      )
  `;
  for (const row of verificationDue) {
    await sql`
      INSERT INTO platform_events (event_type, entity_type, entity_id, metadata)
      VALUES ('verification_expiring_soon', 'contractor', ${row.id}, '{}'::jsonb)
    `;
  }

  const certificationDue = await sql`
    SELECT id FROM contractor_profiles
    WHERE certified_expires_at IS NOT NULL
      AND certified_expires_at <= now() + interval '30 days'
      AND certified_expires_at > now()
      AND NOT EXISTS (
        SELECT 1 FROM platform_events
        WHERE entity_type = 'contractor' AND entity_id = contractor_profiles.id
          AND event_type = 'certification_expiring_soon'
          AND created_at > now() - interval '24 hours'
      )
  `;
  for (const row of certificationDue) {
    await sql`
      INSERT INTO platform_events (event_type, entity_type, entity_id, metadata)
      VALUES ('certification_expiring_soon', 'contractor', ${row.id}, '{}'::jsonb)
    `;
  }

  return { verificationEvents: verificationDue.length, certificationEvents: certificationDue.length };
}
