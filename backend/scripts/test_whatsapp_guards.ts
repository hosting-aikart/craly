import sql from '../src/db/index';

/**
 * Verifies the SQL patterns the WhatsApp duplicate-send protection relies on,
 * against the real Postgres server but ONLY on TEMP tables inside a
 * transaction that is always rolled back — no Craly table is read or written.
 *
 *   1. `UPDATE ... WHERE status <> $new RETURNING` (businessPortalController
 *      .updateApplicationStatus, staffController.updateEngagementStatus):
 *      returns a row only on a real transition.
 *   2. `WITH prev AS (SELECT ... FOR UPDATE) UPDATE ... FROM prev RETURNING
 *      prev.status` (verification + document review paths): returns the
 *      pre-update status alongside the new one.
 *   3. The auto-reject UPDATE on selection also returns a previously
 *      SELECTED application, so that contractor gets application_not_selected.
 *
 * Usage (from backend/):
 *   npx ts-node --transpile-only scripts/test_whatsapp_guards.ts
 */

let passed = 0;
let failed = 0;
function assert(condition: unknown, name: string, detail?: unknown): void {
  if (condition) { passed++; console.log(`  PASS  ${name}`); } else { failed++; console.log(`  FAIL  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail)}` : ''}`); }
}

class Rollback extends Error {}

async function main(): Promise<void> {
  try {
    await sql.begin(async (tx) => {
      await tx`CREATE TEMP TABLE t_applications (id int PRIMARY KEY, requirement_id int, status text) ON COMMIT DROP`;
      await tx`CREATE TEMP TABLE t_profiles (id int PRIMARY KEY, verification_status text) ON COMMIT DROP`;
      await tx`INSERT INTO t_applications VALUES (1, 10, 'SUBMITTED'), (2, 10, 'SUBMITTED'), (3, 10, 'SHORTLISTED')`;
      await tx`INSERT INTO t_profiles VALUES (1, 'pending')`;

      console.log('== 1. Transition guard (status <> new)');
      const select = (id: number, status: string) => tx`
        UPDATE t_applications SET status = ${status} WHERE id = ${id} AND status <> ${status} RETURNING id, status`;
      let rows = await select(1, 'SELECTED');
      assert(rows.length === 1, 'SUBMITTED → SELECTED returns a row (send)');
      rows = await select(1, 'SELECTED');
      assert(rows.length === 0, 'SELECTED → SELECTED returns no row (no send)');
      rows = await select(1, 'REJECTED');
      assert(rows.length === 1, 'SELECTED → REJECTED returns a row (application_rejected)');
      rows = await select(1, 'SELECTED');
      assert(rows.length === 1, 'REJECTED → SELECTED again is a real transition (send)');

      console.log('\n== 2. Previous-status CTE');
      const setStatus = (status: string) => tx`
        WITH prev AS (SELECT id, verification_status FROM t_profiles WHERE id = 1 FOR UPDATE)
        UPDATE t_profiles p SET verification_status = ${status}
        FROM prev WHERE p.id = prev.id
        RETURNING p.verification_status AS new_status, prev.verification_status AS previous_status`;
      let [r] = await setStatus('verified');
      assert(r.previous_status === 'pending' && r.new_status === 'verified', 'returns previous=pending, new=verified', r);
      [r] = await setStatus('verified');
      assert(r.previous_status === 'verified' && r.new_status === 'verified', 'repeat returns previous=verified (mapping sends nothing)', r);

      console.log('\n== 3. Re-selection: previously SELECTED contractor is auto-rejected');
      // App 1 is SELECTED. Manufacturer now selects app 2:
      rows = await select(2, 'SELECTED');
      const autoRejected = await tx`
        UPDATE t_applications SET status = 'REJECTED'
        WHERE requirement_id = 10 AND id != 2 AND status != 'REJECTED'
        RETURNING id`;
      const ids = autoRejected.map((x) => x.id).sort();
      assert(rows.length === 1 && JSON.stringify(ids) === '[1,3]', 'previously SELECTED app 1 (and app 3) returned → each gets application_not_selected', ids);

      throw new Rollback();
    });
  } catch (err) {
    if (!(err instanceof Rollback)) throw err;
  }
  console.log(`\nResult: ${passed} passed, ${failed} failed (transaction rolled back; temp tables only)`);
  await sql.end({ timeout: 5 });
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error('Guard test error:', err instanceof Error ? err.message : err);
  await sql.end({ timeout: 5 }).catch(() => {});
  process.exit(1);
});
