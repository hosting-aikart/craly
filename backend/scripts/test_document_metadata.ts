/**
 * Regression test for "cannot set path in scalar" when staff review a KYC
 * document (staffController.reviewStaffDocument).
 *
 * Cause: documentController stored contractor_documents.metadata as
 * `${JSON.stringify(obj)}::jsonb` — postgres.js JSON-encodes the already-
 * stringified value again, so the column held a JSON *string*, and
 * jsonb_set(metadata, '{reviewer_note}', …) cannot add a key to a string.
 *
 * Runs against the real Postgres in DATABASE_URL but ONLY on a TEMP table
 * inside a transaction that is always rolled back — no real rows touched.
 * The SQL below mirrors the controllers' statements.
 *
 * Usage (from backend/):
 *   npx ts-node --transpile-only scripts/test_document_metadata.ts
 */
import fs from 'fs';
import path from 'path';
import sql from '../src/db/index';

let passed = 0;
let failed = 0;
function assert(condition: unknown, name: string, detail?: unknown): void {
  if (condition) { passed++; console.log(`  PASS  ${name}`); } else { failed++; console.log(`  FAIL  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail)}` : ''}`); }
}

class Rollback extends Error {}

async function main(): Promise<void> {
  console.log('== Source checks');
  const docCtl = fs.readFileSync(path.join(__dirname, '../src/controllers/documentController.ts'), 'utf8');
  const staffCtl = fs.readFileSync(path.join(__dirname, '../src/controllers/staffController.ts'), 'utf8');
  assert(!/metadataJson|JSON\.stringify\([^)]*custom_name/.test(docCtl) && (docCtl.match(/sql\.json\(metadata\)/g) ?? []).length === 2,
    'documentController: both uploads insert metadata with sql.json(object), no pre-stringified JSON');
  assert(/WHEN 'string' THEN \(metadata #>> '\{\}'\)::jsonb/.test(staffCtl), 'staffController: review unwraps legacy string metadata before jsonb_set');

  try {
    await sql.begin(async (tx) => {
      await tx`CREATE TEMP TABLE t_documents (id int PRIMARY KEY, status text NOT NULL DEFAULT 'pending', metadata jsonb NOT NULL DEFAULT '{}') ON COMMIT DROP`;

      // Same statement shape as documentController's uploads (fixed version).
      const insert = (id: number, customName?: string) => {
        const metadata = customName ? { custom_name: customName } : {};
        return tx`INSERT INTO t_documents (id, metadata) VALUES (${id}, ${tx.json(metadata)})`;
      };
      // Same SET expression as staffController.reviewStaffDocument (fixed version).
      const review = (id: number, decision: string, note: string) => tx`
        UPDATE t_documents SET
          status = ${decision},
          metadata = jsonb_set(
            CASE jsonb_typeof(metadata)
              WHEN 'object' THEN metadata
              WHEN 'string' THEN (metadata #>> '{}')::jsonb
              ELSE '{}'::jsonb
            END,
            '{reviewer_note}', to_jsonb(${note}::text))
        WHERE id = ${id}
        RETURNING status, jsonb_typeof(metadata) AS kind, metadata->>'custom_name' AS custom_name, metadata->>'reviewer_note' AS note`;
      const oldReview = (id: number) => tx`
        UPDATE t_documents SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{reviewer_note}', to_jsonb(${'x'}::text)) WHERE id = ${id}`;

      console.log('\n== New uploads store a JSON object');
      await insert(1, 'GST certificate');
      await insert(2);
      const rows = await tx`SELECT id, jsonb_typeof(metadata) AS kind, metadata->>'custom_name' AS custom_name FROM t_documents ORDER BY id`;
      assert(rows[0].kind === 'object' && rows[0].custom_name === 'GST certificate', 'upload with custom name → object, custom_name readable', rows[0]);
      assert(rows[1].kind === 'object', 'upload without custom name → empty object', rows[1]);

      console.log('\n== Review: approve / reject / replacement on new rows');
      let [r] = await review(1, 'approved', 'Looks good');
      assert(r.status === 'approved' && r.kind === 'object' && r.custom_name === 'GST certificate' && r.note === 'Looks good', 'approve keeps custom_name and adds reviewer_note', r);
      [r] = await review(2, 'rejected', 'Blurry scan');
      assert(r.status === 'rejected' && r.note === 'Blurry scan', 'reject stores reviewer_note', r);
      [r] = await review(2, 'replacement_requested', '');
      assert(r.status === 'replacement_requested' && r.note === '', 'replacement_requested with empty note', r);

      console.log('\n== Legacy rows written by the buggy upload (JSON string scalars)');
      await tx`INSERT INTO t_documents (id, metadata) VALUES (10, ${JSON.stringify({ custom_name: 'PAN card' })}::jsonb), (11, ${'{}'}::jsonb)`;
      const legacy = await tx`SELECT id, jsonb_typeof(metadata) AS kind FROM t_documents WHERE id IN (10, 11) ORDER BY id`;
      assert(legacy.every((x: any) => x.kind === 'string'), 'old upload pattern really produces string scalars (bug reproduced)', legacy);
      let oldError = '';
      try { await tx`SAVEPOINT s`; await oldReview(10); } catch (e: any) { oldError = e.message; } finally { await tx`ROLLBACK TO SAVEPOINT s`; }
      assert(oldError === 'cannot set path in scalar', 'old review expression fails exactly like production', oldError);
      [r] = await review(10, 'approved', 'Verified');
      assert(r.status === 'approved' && r.kind === 'object' && r.custom_name === 'PAN card' && r.note === 'Verified',
        'fixed review approves a legacy row, repairs it to an object and keeps its custom_name', r);
      [r] = await review(11, 'rejected', 'Expired');
      assert(r.status === 'rejected' && r.kind === 'object' && r.note === 'Expired', 'fixed review handles legacy "{}" string', r);
      [r] = await review(10, 'approved', 'Re-checked');
      assert(r.kind === 'object' && r.custom_name === 'PAN card' && r.note === 'Re-checked', 'reviewing the repaired row again still works', r);

      throw new Rollback();
    });
  } catch (err) {
    if (!(err instanceof Rollback)) throw err;
  }

  console.log(`\nResult: ${passed} passed, ${failed} failed (transaction rolled back; temp table only)`);
  await sql.end({ timeout: 5 });
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error('test error:', err instanceof Error ? err.message : err);
  await sql.end({ timeout: 5 }).catch(() => {});
  process.exit(1);
});
