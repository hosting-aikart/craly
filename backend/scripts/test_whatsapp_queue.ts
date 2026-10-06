/**
 * pg-boss WhatsApp queue tests — real Postgres (the existing Neon database,
 * `pgboss` schema), the REAL src/worker.ts running as a separate process,
 * and a local mock of the Meta Graph API (real Meta is never called).
 *
 * Uses an isolated queue name per run (whatsapp-test-<run>) so it can't
 * touch the real `whatsapp-notifications` queue, and deletes its queues and
 * the platform_events rows it caused at the end. No Craly business tables
 * are written.
 *
 *   A enqueue · B worker processes · C successful send · D retry on temporary
 *   failure · E permanent error → dead letter · F duplicate prevention ·
 *   G worker restart (graceful + crash) · I multiple notifications ·
 *   jobs queued while no worker is running
 *
 * Usage (from backend/):
 *   npx ts-node --transpile-only scripts/test_whatsapp_queue.ts
 */
import { randomUUID } from 'crypto';
import { MockMeta, testEnv, spawnBackend, stopProcess, waitFor, assert, results, RUN_ID, type ManagedProcess } from './lib/whatsappTestHarness';

const QUEUE = `whatsapp-test-${RUN_ID}`;
const meta = new MockMeta();

async function main(): Promise<void> {
  await meta.start();
  const env = testEnv(QUEUE, meta.baseUrl);
  Object.assign(process.env, env); // this process is the producer ("API")

  /* eslint-disable @typescript-eslint/no-var-requires */
  const { queueWhatsAppTemplate } = require('../src/utils/whatsapp') as typeof import('../src/utils/whatsapp');
  const q = require('../src/queue/whatsappQueue') as typeof import('../src/queue/whatsappQueue');
  const sql = require('../src/db/index').default;

  const inspector = q.createBoss('api');
  await inspector.start();
  await q.ensureWhatsAppQueues(inspector);
  const DLQ = q.WHATSAPP_DEAD_LETTER_QUEUE;

  const entityIds: string[] = [];
  const job = async (key: string) => (await inspector.findJobs<any>(QUEUE, { id: q.jobIdForKey(key) }))[0];
  const enqueue = async (key: string, firstParam: string, opts: { to?: string; template?: 'application_selected' | 'contractor_welcome' } = {}) => {
    const entityId = randomUUID();
    entityIds.push(entityId);
    const template = opts.template ?? 'application_selected';
    await queueWhatsAppTemplate({
      to: opts.to ?? '8793964438',
      template,
      parameters: template === 'contractor_welcome' ? [firstParam] : [firstParam, 'Queue Test Opportunity'],
      context: { entityType: 'queue_test', entityId, userId: null },
      idempotencyKey: `qtest-${RUN_ID}:${key}`,
    });
    return `qtest-${RUN_ID}:${key}`;
  };
  const settled = (key: string, states = ['completed', 'failed']) =>
    waitFor(`job ${key} settled`, async () => { const j = await job(key); return j && states.includes(j.state) ? j : null; }, 90_000);
  const callsWith = (tag: string) => meta.callsFor((c) => c.params[0]?.includes(tag));

  let worker: ManagedProcess | null = null;
  const allWorkers: ManagedProcess[] = [];
  const startWorker = async (label: string) => {
    const w = spawnBackend(label, 'src/worker.ts', env);
    allWorkers.push(w);
    await w.waitForLine(/\[worker\] started/);
    return w;
  };

  try {
    console.log(`== Setup: queue ${QUEUE} (dead letter ${DLQ}), pg-boss db host ${q.queueDatabaseHost()}`);
    assert(!q.queueDatabaseHost().includes('-pooler'), 'pg-boss uses the Neon direct endpoint, not the -pooler (PgBouncer) one', q.queueDatabaseHost());
    const queueInfo = await inspector.getQueue(QUEUE);
    assert(queueInfo?.retryLimit === 4 && queueInfo.retryBackoff === true && queueInfo.deadLetter === DLQ && queueInfo.deleteAfterSeconds === 604800,
      'queue policy: 5 attempts (retryLimit 4), exponential backoff, dead letter set, completed jobs purged after 7 days', queueInfo && { retryLimit: queueInfo.retryLimit, retryBackoff: queueInfo.retryBackoff, deadLetter: queueInfo.deadLetter, deleteAfterSeconds: queueInfo.deleteAfterSeconds });

    console.log('\n== A. Enqueue (no worker running)');
    const kA = await enqueue('basic', 'Vishal Contractor');
    let j = await job(kA);
    assert(j?.state === 'created', 'job stored in Postgres in state "created"', j?.state);
    assert(j?.data?.template === 'application_selected' && j.data.to === '8793964438' && j.data.languageCode === 'en'
      && JSON.stringify(j.data.parameters) === '["Vishal Contractor","Queue Test Opportunity"]' && j.data.idempotencyKey === kA && j.data.context?.entityId,
      'payload has template, language, recipient, parameters, entity and idempotency key', j?.data);

    console.log('\n== F. Duplicate prevention');
    await enqueue('basic', 'Vishal Contractor');
    await enqueue('basic', 'Vishal Contractor');
    const all = await inspector.findJobs<any>(QUEUE, { data: { idempotencyKey: kA } });
    assert(all.length === 1, 'same idempotency key enqueued 3× → exactly 1 job', all.length);

    console.log('\n== B/C. Separate worker process sends it');
    worker = await startWorker('worker-1');
    j = await settled(kA);
    const sentA = meta.callsFor((c) => c.params[0] === 'Vishal Contractor');
    assert(j.state === 'completed' && j.output?.messageId === sentA[0]?.messageId && j.retryCount === 0, 'job completed on first attempt, Meta message id stored as job output', { state: j.state, output: j.output });
    assert(sentA.length === 1 && sentA[0].template === 'application_selected' && sentA[0].to === '918793964438',
      'Meta received exactly one application_selected for 918793964438', sentA);
    const [audit] = await sql`SELECT metadata->>'message_id' AS message_id, metadata->>'job_id' AS job_id FROM platform_events WHERE event_type = 'whatsapp_sent' AND metadata->>'idempotency_key' = ${kA}`;
    assert(audit?.message_id === sentA[0]?.messageId && audit?.job_id === j.id, 'whatsapp_sent audit row links job id ↔ Meta message id', audit);

    await enqueue('basic', 'Vishal Contractor');
    await new Promise((r) => setTimeout(r, 2000));
    assert(meta.callsFor((c) => c.params[0] === 'Vishal Contractor').length === 1, 'same key enqueued again after completion → not sent again');

    console.log('\n== D. Retry on temporary failure');
    const kD1 = await enqueue('retry500', '[fail500x2] retry');
    const kD2 = await enqueue('rate', '[rate130429] rate');
    const jD1 = await settled(kD1);
    const jD2 = await settled(kD2);
    assert(jD1.state === 'completed' && jD1.retryCount === 2 && callsWith('[fail500x2]').length === 3, 'HTTP 500 ×2 → retried with backoff → completed on attempt 3', { state: jD1.state, retryCount: jD1.retryCount, calls: callsWith('[fail500x2]').length });
    assert(jD2.state === 'completed' && jD2.retryCount === 1 && callsWith('[rate130429]').length === 2, 'Meta 130429 (rate limit) → retried → completed on attempt 2', { state: jD2.state, retryCount: jD2.retryCount });
    const gaps = callsWith('[fail500x2]').map((c, i, a) => (i ? c.at - a[i - 1].at : 0)).slice(1);
    assert(gaps.every((g) => g >= 900), 'retries wait for the configured delay (≥1s in test config)', gaps);

    console.log('\n== E. Permanent errors and exhausted retries → dead letter');
    const kE1 = await enqueue('perm', '[perm131030] perm');
    const kE2 = await enqueue('badphone', 'Bad Phone', { to: '12' });
    const kE3 = await enqueue('always500', '[always500] outage');
    const jE1 = await settled(kE1);
    const jE2 = await settled(kE2);
    const jE3 = await settled(kE3);
    assert(jE1.state === 'failed' && jE1.retryCount === 0 && callsWith('[perm131030]').length === 1 && jE1.output?.retryable === false,
      'Meta 131030 (recipient not allowed) → no retry, failed after 1 call', { state: jE1.state, retryCount: jE1.retryCount, output: jE1.output });
    assert(jE2.state === 'failed' && jE2.retryCount === 0 && meta.callsFor((c) => c.params[0] === 'Bad Phone').length === 0,
      'invalid phone → failed without calling Meta, no retry', { state: jE2.state, output: jE2.output });
    assert(jE3.state === 'failed' && jE3.retryCount === 4 && callsWith('[always500]').length === 5 && jE3.output?.reason === 'retries exhausted',
      'HTTP 500 every time → 5 attempts total, then failed', { state: jE3.state, retryCount: jE3.retryCount, calls: callsWith('[always500]').length });
    const dead = await waitFor('dead-letter copies', async () => {
      const rows = await inspector.findJobs<any>(DLQ, {});
      const ids = new Set(rows.map((r) => r.data?.idempotencyKey));
      return [kE1, kE2, kE3].every((k) => ids.has(k)) ? rows : null;
    }, 30_000);
    const deadE1 = dead.find((r) => r.data?.idempotencyKey === kE1);
    assert(dead.length === 3 && deadE1?.data?.to === '8793964438' && deadE1?.data?.parameters?.length === 2 && deadE1?.sourceId === jE1.id,
      'all 3 copied to the dead-letter queue with full payload (replayable) and a link to the original job', dead.map((d) => ({ key: d.data?.idempotencyKey, sourceId: d.sourceId })));
    const failedAudit = await sql`SELECT metadata->>'reason' AS reason FROM platform_events WHERE event_type = 'whatsapp_failed' AND metadata->>'idempotency_key' IN ${sql([kE1, kE2, kE3])} ORDER BY metadata->>'reason'`;
    assert(JSON.stringify(failedAudit.map((r: any) => r.reason)) === '["permanent error","permanent error","retries exhausted"]', 'whatsapp_failed audit rows record why', failedAudit);

    const deadBadPhone = dead.find((r) => r.data?.idempotencyKey === kE2);
    const moved = await inspector.redrive(DLQ, { ids: [deadBadPhone!.id], destination: QUEUE });
    const redriven = await waitFor('redriven job processed', async () => {
      const rows = (await inspector.findJobs<any>(QUEUE, { data: { idempotencyKey: kE2 } })).filter((x) => x.id !== jE2.id);
      return rows.length && ['completed', 'failed'].includes(rows[0].state) ? rows[0] : null;
    }, 30_000);
    assert(moved === 1 && redriven.state === 'failed' && redriven.data?.to === '12',
      'dead-letter redrive (scripts/whatsapp_dlq.ts uses this) puts the job back on the main queue and the worker re-processes it', { moved, state: redriven.state });

    console.log('\n== I. Multiple notifications');
    const multiKeys: string[] = [];
    for (let i = 1; i <= 10; i++) multiKeys.push(await enqueue(`multi-${i}`, `Multi ${i}`));
    const multiJobs = await Promise.all(multiKeys.map((k) => settled(k)));
    const multiCalls = meta.callsFor((c) => /^Multi \d+$/.test(c.params[0]));
    assert(multiJobs.every((x) => x.state === 'completed') && multiCalls.length === 10 && new Set(multiCalls.map((c) => c.params[0])).size === 10,
      '10 jobs → 10 completed, each sent exactly once', multiCalls.length);

    console.log('\n== G1. Graceful worker stop (SIGTERM) mid-job');
    const kG1 = await enqueue('graceful', '[slow3s] graceful');
    await waitFor('slow job active', async () => (await job(kG1))?.state === 'active', 30_000);
    const t0 = Date.now();
    const exit = await stopProcess(worker, 'SIGTERM');
    const jG1 = await job(kG1);
    assert(exit?.code === 0 && jG1.state === 'completed' && callsWith('[slow3s]').length === 1,
      'SIGTERM → worker finishes the in-flight job, then exits 0', { exit, state: jG1.state, waitedMs: Date.now() - t0 });
    assert(worker!.output.some((l) => l.includes('stopped cleanly')), 'worker logged clean shutdown');

    console.log('\n== H/G. Jobs queued while no worker is running');
    const waiting = [await enqueue('waiting-1', 'Waiting 1'), await enqueue('waiting-2', 'Waiting 2'), await enqueue('waiting-3', 'Waiting 3')];
    await new Promise((r) => setTimeout(r, 1500));
    const beforeStates = await Promise.all(waiting.map(async (k) => (await job(k)).state));
    assert(beforeStates.every((s) => s === 'created') && meta.callsFor((c) => c.params[0]?.startsWith('Waiting')).length === 0,
      'with no worker: jobs wait in Postgres, nothing sent', beforeStates);
    worker = await startWorker('worker-2');
    const afterJobs = await Promise.all(waiting.map((k) => settled(k)));
    assert(afterJobs.every((x) => x.state === 'completed') && meta.callsFor((c) => c.params[0]?.startsWith('Waiting')).length === 3,
      'new worker process picks them up and sends each once');

    console.log('\n== G2. Worker crash (SIGKILL) mid-job');
    const kG2 = await enqueue('crash', '[slow8s] crash');
    await waitFor('crash job active', async () => (await job(kG2))?.state === 'active', 30_000);
    await stopProcess(worker, 'SIGKILL');
    const jStuck = await job(kG2);
    assert(jStuck.state === 'active', 'after SIGKILL the job is still "active" in Postgres (not lost)', jStuck.state);
    worker = await startWorker('worker-3');
    const jG2 = await settled(kG2, ['completed']);
    assert(jG2.state === 'completed' && jG2.retryCount >= 1,
      'after expireInSeconds (15s in test) the job is retried by the new worker and completed', { state: jG2.state, retryCount: jG2.retryCount });
    assert(callsWith('[slow8s]').length === 2,
      'Meta saw 2 requests for it: the one cut off by the crash + the retry (at-least-once — see report)', callsWith('[slow8s]').length);

    console.log('\n== Secrets');
    const allOutput = allWorkers.flatMap((w) => w.output);
    assert(!allOutput.some((l) => l.includes('MOCK_TOKEN_DO_NOT_LEAK')), `output of all ${allWorkers.length} worker processes (${allOutput.length} lines) never contains the access token`);
  } finally {
    console.log('\n== Cleanup');
    await stopProcess(worker, 'SIGTERM');
    await inspector.deleteQueue(QUEUE).catch((e: Error) => console.log('  deleteQueue main:', e.message));
    await inspector.deleteQueue(DLQ).catch((e: Error) => console.log('  deleteQueue dlq:', e.message));
    await sql`DELETE FROM platform_events WHERE metadata->>'idempotency_key' LIKE ${`qtest-${RUN_ID}:%`}`;
    const [left] = await sql`SELECT count(*)::int AS n FROM platform_events WHERE metadata->>'idempotency_key' LIKE ${`qtest-${RUN_ID}:%`}`;
    const remainingQueue = await inspector.getQueue(QUEUE);
    assert(left.n === 0 && !remainingQueue, 'test queues and audit rows removed', { auditRows: left.n, queue: remainingQueue?.name });
    await q.stopWhatsAppProducer();
    await inspector.stop({ graceful: false, close: true });
    await sql.end({ timeout: 5 });
    meta.stop();
    const r = results();
    console.log(`\nResult: ${r.passed} passed, ${r.failed} failed · ${meta.calls.length} mock Meta calls`);
    process.exit(r.failed === 0 ? 0 : 1);
  }
}

main().catch((err) => {
  console.error('queue test crashed:', err);
  process.exit(1);
});
