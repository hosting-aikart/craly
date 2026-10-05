/**
 * End-to-end WhatsApp flow test with REAL processes:
 *   - the Craly API (src/server.ts) as its own node process
 *   - the WhatsApp worker (src/worker.ts) as its own node process
 *   - the real database (Neon) and real pg-boss queue tables
 *   - a local mock of the Meta Graph API (real Meta is never called)
 *
 * It proves jobs live in Postgres, not in API memory: the API is stopped
 * (SIGTERM, then later SIGKILL) while jobs are waiting and no worker is
 * running; a worker started afterwards still sends them.
 *
 * Writes clearly-labelled test records (wa-flowtest-<run>@example.com, a
 * made-up city/state no real contractor has), uses an isolated queue name,
 * and deletes everything it created at the end (fixtures, the in-app
 * notifications and platform_events rows they caused, and the test queues),
 * then verifies nothing remains.
 *
 * Usage (from backend/):
 *   npx ts-node --transpile-only scripts/test_whatsapp_flow.ts
 */
import http from 'http';
import { createHmac } from 'crypto';
import type { AddressInfo } from 'net';
import { MockMeta, MockCall, testEnv, spawnBackend, stopProcess, waitFor, assert, results, RUN_ID, type ManagedProcess } from './lib/whatsappTestHarness';

const QUEUE = `whatsapp-flowtest-${RUN_ID}`;
const TEST_PHONE = '8793964438';
const CITY = `Zzwaflowcity${RUN_ID}`;
const STATE = `Zzwaflowstate${RUN_ID}`;
const email = (tag: string) => `wa-flowtest-${RUN_ID}-${tag}@example.com`;
const meta = new MockMeta();
const ids = { users: [] as string[], entities: [] as string[] };

async function freePort(): Promise<number> {
  const s = http.createServer();
  await new Promise<void>((r) => s.listen(0, '127.0.0.1', () => r()));
  const port = (s.address() as AddressInfo).port;
  await new Promise((r) => s.close(r));
  return port;
}

async function main(): Promise<void> {
  await meta.start();
  const port = await freePort();
  const env = { ...testEnv(QUEUE, meta.baseUrl), PORT: String(port), WHATSAPP_APP_SECRET: 'flowtest-app-secret' };
  // Set before any src/ module loads, so nothing here can touch the real queue.
  Object.assign(process.env, env);

  /* eslint-disable @typescript-eslint/no-var-requires */
  const sql = require('../src/db/index').default;
  const { signAuthToken } = require('../src/utils/jwt');
  const q = require('../src/queue/whatsappQueue') as typeof import('../src/queue/whatsappQueue');
  if (q.WHATSAPP_QUEUE !== QUEUE) throw new Error(`refusing to run: queue is ${q.WHATSAPP_QUEUE}, expected isolated ${QUEUE}`);
  const inspector = q.createBoss('api');
  await inspector.start();
  await q.ensureWhatsAppQueues(inspector);

  const base = `http://127.0.0.1:${port}/api`;
  const processes: ManagedProcess[] = [];
  let api: ManagedProcess | null = null;
  let worker: ManagedProcess | null = null;
  const startApi = async (label: string) => {
    const p = spawnBackend(label, 'src/server.ts', env);
    processes.push(p);
    await p.waitForLine(/Craly API running/);
    return p;
  };
  const startWorker = async (label: string) => {
    const p = spawnBackend(label, 'src/worker.ts', env);
    processes.push(p);
    await p.waitForLine(/\[worker\] started/);
    return p;
  };

  async function call(method: string, path: string, token: string | null, body?: unknown): Promise<{ status: number; json: any }> {
    const r = await fetch(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let json: any = null;
    try { json = await r.json(); } catch { /* empty */ }
    return { status: r.status, json };
  }
  const pendingJobs = async (): Promise<number> => {
    const [r] = await sql`SELECT count(*)::int AS n FROM pgboss.job WHERE name = ${QUEUE} AND state IN ('created', 'retry', 'active')`;
    return r.n;
  };
  const drained = () => waitFor('queue drained', async () => (await pendingJobs()) === 0, 90_000);
  /** Successful Meta sends caused by `action`, once the worker has drained the queue. */
  async function sendsDuring(action: () => Promise<unknown>): Promise<MockCall[]> {
    const start = meta.calls.length;
    await action();
    await drained();
    return meta.calls.slice(start).filter((c) => c.status === 200);
  }
  const names = (s: MockCall[]) => s.map((x) => x.template);
  const who = (x: MockCall) => `${x.template}:${x.params[0].replace('WA FlowTest Contractor ', 'C')}`;
  const jobsFor = (template: string) => sql`
    SELECT id, state, retry_count, output, data FROM pgboss.job WHERE name = ${QUEUE} AND data->>'template' = ${template} ORDER BY created_on`;

  try {
    // Fixtures whose creation isn't under test.
    const [staff] = await sql`INSERT INTO users (email, password_hash, role, is_active) VALUES (${email('staff')}, 'x', 'staff', true) RETURNING id`;
    ids.users.push(staff.id);
    const staffToken = signAuthToken({ sub: staff.id, role: 'staff' });
    const [biz] = await sql`INSERT INTO users (email, password_hash, role, is_active) VALUES (${email('biz')}, 'x', 'business', true) RETURNING id`;
    ids.users.push(biz.id);
    const [bp] = await sql`
      INSERT INTO business_profiles (user_id, company_name, phone, city, state, onboarding_complete)
      VALUES (${biz.id}, 'WA FlowTest Manufacturing', ${TEST_PHONE}, ${CITY}, ${STATE}, true) RETURNING id`;
    ids.entities.push(bp.id);
    const bizToken = signAuthToken({ sub: biz.id, role: 'business' });

    // ── J + test 24: signup → job in Postgres → API restarted → worker sends ──
    console.log('== J. contractor_welcome — API restarted before any worker runs');
    api = await startApi('api-1');
    const c1Email = email('c1');
    await sql`INSERT INTO auth_verifications (target, target_type, otp_hash, verified, expires_at) VALUES (${c1Email}, 'email', 'flowtest', true, now() + interval '10 minutes')`;
    const signupBody = { email: c1Email, password: 'FlowTest#12345', role: 'contractor', companyName: 'WA FlowTest Contractor One', mobile: TEST_PHONE, city: CITY, state: STATE, workforceSize: 50 };
    let r = await call('POST', '/auth/signup', null, signupBody);
    const c1UserId = r.json?.data?.id;
    if (c1UserId) ids.users.push(c1UserId);
    assert(r.status === 201, 'POST /auth/signup → 201 (no worker running)', r);
    const [c1] = await sql`SELECT id FROM contractor_profiles WHERE user_id = ${c1UserId}`;
    ids.entities.push(c1.id);
    let welcome = await jobsFor('contractor_welcome');
    assert(welcome.length === 1 && welcome[0].state === 'created' && welcome[0].data.to === TEST_PHONE && welcome[0].data.parameters[0] === 'WA FlowTest Contractor One'
      && welcome[0].data.idempotencyKey === `contractor_welcome:${c1.id}:${c1UserId}:account-created`,
      'contractor_welcome job stored in Postgres before the API responded', welcome.map((j: any) => ({ state: j.state, key: j.data.idempotencyKey })));
    r = await call('POST', '/auth/signup', null, signupBody);
    assert(r.status === 409 && (await jobsFor('contractor_welcome')).length === 1, 'retried signup → 409, still exactly one welcome job');

    const apiExit = await stopProcess(api, 'SIGTERM');
    api = null;
    welcome = await jobsFor('contractor_welcome');
    assert(apiExit?.code === 0 && welcome[0].state === 'created' && meta.calls.length === 0,
      'API process stopped (SIGTERM, exit 0) → job still waiting in Postgres, nothing sent yet', { apiExit, state: welcome[0].state });
    worker = await startWorker('worker-1');
    await drained();
    welcome = await jobsFor('contractor_welcome');
    const welcomeSend = meta.calls.find((c) => c.template === 'contractor_welcome');
    assert(welcome[0].state === 'completed' && welcomeSend?.to === '918793964438' && welcomeSend.params[0] === 'WA FlowTest Contractor One'
      && welcome[0].output?.messageId === welcomeSend.messageId,
      'worker started afterwards sends it → contractor_welcome to 918793964438, job completed with Meta message id', { state: welcome[0].state, output: welcome[0].output });
    const [ev] = await sql`
      SELECT jsonb_typeof(metadata) AS kind, metadata->>'message_id' AS message_id, metadata->>'job_id' AS job_id
      FROM platform_events WHERE event_type = 'whatsapp_sent' AND entity_id = ${c1.id}`;
    assert(ev?.kind === 'object' && ev.message_id === welcomeSend?.messageId && ev.job_id === welcome[0].id, 'whatsapp_sent audit row: job id ↔ message id', ev);

    api = await startApi('api-2');
    const statusPayload = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: { statuses: [{ id: ev?.message_id, status: 'delivered', timestamp: '1', recipient_id: '918793964438' }] } }] }] });
    const signature = `sha256=${createHmac('sha256', 'flowtest-app-secret').update(statusPayload).digest('hex')}`;
    for (let i = 0; i < 2; i++) {
      const wr = await fetch(`http://127.0.0.1:${port}/api/webhooks/whatsapp`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': signature }, body: statusPayload });
      assert(wr.status === 200, `webhook POST #${i + 1} (signed "delivered") → 200`);
    }
    const statusRows = await sql`SELECT entity_id, metadata->>'status' AS status FROM platform_events WHERE event_type = 'whatsapp_status' AND metadata->>'message_id' = ${ev?.message_id ?? ''}`;
    assert(statusRows.length === 1 && statusRows[0].status === 'delivered' && statusRows[0].entity_id === c1.id, 'webhook stored one "delivered" status mapped to the welcome send', statusRows);

    const c1Token = signAuthToken({ sub: c1UserId, role: 'contractor' });

    console.log('\n== Meta failing during signup → signup unaffected, job retried');
    const c3Email = email('c3');
    await sql`INSERT INTO auth_verifications (target, target_type, otp_hash, verified, expires_at) VALUES (${c3Email}, 'email', 'flowtest', true, now() + interval '10 minutes')`;
    let s = await sendsDuring(async () => {
      r = await call('POST', '/auth/signup', null, { ...signupBody, email: c3Email, companyName: '[fail500x2] WA FlowTest Contractor Three' });
      if (r.json?.data?.id) {
        ids.users.push(r.json.data.id);
        const [c3] = await sql`SELECT id FROM contractor_profiles WHERE user_id = ${r.json.data.id}`;
        if (c3) ids.entities.push(c3.id);
      }
    });
    const c3Job = (await jobsFor('contractor_welcome')).find((j: any) => j.data.parameters[0].includes('[fail500x2]'));
    assert(r.status === 201 && c3Job?.state === 'completed' && c3Job.retry_count === 2 && names(s).join() === 'contractor_welcome',
      'signup 201 while Meta returned 500 twice → job retried and sent on attempt 3', { status: r.status, state: c3Job?.state, retries: c3Job?.retry_count });

    console.log('\n== Onboarding / verification / KYC');
    s = await sendsDuring(async () => { r = await call('PATCH', '/profile/me', c1Token, { workforceSize: 50, city: CITY, state: STATE }); });
    assert(r.status === 200 && names(s).join() === 'contractor_verification_pending', 'first onboarding save → contractor_verification_pending', names(s));
    s = await sendsDuring(async () => { r = await call('PATCH', '/profile/me', c1Token, { workforceSize: 50 }); });
    assert(r.status === 200 && s.length === 0, 'second profile save → nothing', names(s));

    const [doc] = await sql`
      INSERT INTO contractor_documents (contractor_id, document_type, storage_key, file_name, mime_type, size_bytes, status)
      VALUES (${c1.id}, 'pan', ${`flowtest/${RUN_ID}/pan.pdf`}, 'pan.pdf', 'application/pdf', 1, 'pending') RETURNING id`;
    ids.entities.push(doc.id);
    s = await sendsDuring(async () => { r = await call('PATCH', `/staff/verification/contractors/${c1.id}/documents/${doc.id}/review`, staffToken, { decision: 'approved' }); });
    assert(r.status === 200 && names(s).join() === 'kyc_document_reviewed,contractor_verification_approved' && JSON.stringify(s[0].params) === '["WA FlowTest Contractor One","PAN","Approved"]',
      'staff approves only document → kyc_document_reviewed(PAN, Approved) + contractor_verification_approved', s.map(who));
    s = await sendsDuring(async () => { r = await call('PATCH', `/staff/verification/contractors/${c1.id}/documents/${doc.id}/review`, staffToken, { decision: 'approved' }); });
    assert(r.status === 200 && s.length === 0, 'same approval again → nothing', names(s));
    s = await sendsDuring(async () => { r = await call('PATCH', `/staff/verification/contractors/${c1.id}/status`, staffToken, { status: 'needs_changes', note: 'flow test' }); });
    assert(names(s).join() === 'contractor_verification_needs_changes', 'verified → needs_changes', names(s));
    s = await sendsDuring(async () => { r = await call('PATCH', `/staff/verification/contractors/${c1.id}/status`, staffToken, { status: 'needs_changes' }); });
    assert(s.length === 0, 'needs_changes → needs_changes → nothing', names(s));
    s = await sendsDuring(async () => { r = await call('PATCH', `/staff/verification/contractors/${c1.id}/status`, staffToken, { status: 'rejected' }); });
    assert(names(s).join() === 'contractor_verification_rejected', 'needs_changes → rejected', names(s));
    s = await sendsDuring(async () => { r = await call('PATCH', `/staff/verification/contractors/${c1.id}/status`, staffToken, { status: 'verified' }); });
    assert(names(s).join() === 'contractor_verification_approved' && r.json?.data && !('updated_at' in r.json.data) && !('previous_status' in r.json.data),
      'rejected → verified (response shape unchanged)', { s: names(s), data: r.json?.data });

    console.log('\n== Opportunity → applications');
    const [c2u] = await sql`INSERT INTO users (email, password_hash, role, is_active) VALUES (${email('c2')}, 'x', 'contractor', true) RETURNING id`;
    ids.users.push(c2u.id);
    const [c2] = await sql`
      INSERT INTO contractor_profiles (user_id, company_name, phone, city, state, workforce_size, verification_status, onboarding_complete)
      VALUES (${c2u.id}, 'WA FlowTest Contractor Two', ${TEST_PHONE}, ${CITY}, ${STATE}, 50, 'verified', true) RETURNING id`;
    ids.entities.push(c2.id);
    const c2Token = signAuthToken({ sub: c2u.id, role: 'contractor' });
    s = await sendsDuring(async () => {
      r = await call('POST', '/business-portal/requirements', bizToken, {
        title: 'FlowTest Welders', location: `${CITY}, ${STATE}`, city: CITY, state: STATE, workersRequired: 10,
        requiredSkills: [], startDate: '2027-01-01', duration: '1 Month', action: 'publish',
      });
      if (r.json?.data?.id) ids.entities.push(r.json.data.id);
    });
    const reqId = r.json?.data?.id;
    assert(r.status === 201 && names(s).join() === 'new_opportunity,new_opportunity' && s.map((x) => x.params[0]).sort().join() === 'WA FlowTest Contractor One,WA FlowTest Contractor Two',
      'publish → new_opportunity to exactly the 2 matching test contractors (existing matching rule)', s.map(who));

    let app1: string | undefined;
    s = await sendsDuring(async () => { r = await call('POST', `/contractor-portal/opportunities/${reqId}/apply`, c1Token, { proposedWorkforce: 10, availabilityDate: '2027-01-01' }); app1 = r.json?.data?.id; if (app1) ids.entities.push(app1); });
    assert(r.status === 201 && names(s).join() === 'application_submitted,new_application' && s[1].params[0] === 'WA FlowTest Manufacturing',
      'apply → application_submitted (contractor) + new_application (manufacturer)', s.map((x) => x.template));
    s = await sendsDuring(async () => { r = await call('POST', `/contractor-portal/opportunities/${reqId}/apply`, c1Token, { proposedWorkforce: 10, availabilityDate: '2027-01-01' }); });
    assert(r.status === 409 && s.length === 0, 'duplicate apply → 409, nothing sent');
    let app2: string | undefined;
    await sendsDuring(async () => { r = await call('POST', `/contractor-portal/opportunities/${reqId}/apply`, c2Token, { proposedWorkforce: 10, availabilityDate: '2027-01-01' }); app2 = r.json?.data?.id; if (app2) ids.entities.push(app2); });
    const setStatus = (appId: string | undefined, status: string) => call('PATCH', `/business-portal/applications/${appId}/status`, bizToken, { status });

    // ── K + test 25: selection with no worker, API killed, worker sends ──────
    console.log('\n== K. application_selected — API killed (SIGKILL) while jobs wait, worker sends afterwards');
    await stopProcess(worker, 'SIGTERM');
    worker = null;
    const sentBefore = meta.calls.length;
    r = await setStatus(app1, 'SELECTED');
    const [dbApp] = await sql`SELECT status FROM applications WHERE id = ${app1}`;
    let selJobs = await jobsFor('application_selected');
    const notSelJobs = await jobsFor('application_not_selected');
    assert(r.status === 200 && dbApp.status === 'SELECTED', 'manufacturer selects → API 200, DB status SELECTED', { status: r.status, db: dbApp.status });
    assert(selJobs.length === 1 && selJobs[0].state === 'created' && selJobs[0].data.parameters[1] === 'FlowTest Welders'
      && notSelJobs.length === 1 && notSelJobs[0].state === 'created',
      'application_selected (C1) + application_not_selected (C2) jobs stored in Postgres before the response', { sel: selJobs.map((j: any) => j.state), notSel: notSelJobs.map((j: any) => j.state) });
    await stopProcess(api, 'SIGKILL');
    api = null;
    selJobs = await jobsFor('application_selected');
    assert(selJobs[0].state === 'created' && meta.calls.length === sentBefore, 'API process killed (SIGKILL) → jobs still in Postgres, nothing sent');
    worker = await startWorker('worker-2');
    await drained();
    s = meta.calls.slice(sentBefore).filter((c) => c.status === 200);
    selJobs = await jobsFor('application_selected');
    assert(s.map(who).join() === 'application_selected:COne,application_not_selected:CTwo' && s[0].to === '918793964438'
      && selJobs[0].state === 'completed' && selJobs[0].output?.messageId === s[0].messageId,
      'new worker → Meta: application_selected to 918793964438 (+ not_selected to C2), job completed with message id', { sends: s.map(who), output: selJobs[0].output });
    api = await startApi('api-3');

    s = await sendsDuring(async () => { r = await setStatus(app1, 'SELECTED'); });
    assert(r.status === 200 && s.length === 0 && /already/.test(r.json?.message ?? '') && (await jobsFor('application_selected')).length === 1,
      'SELECTED → SELECTED: no new job, nothing sent', { message: r.json?.message });
    s = await sendsDuring(async () => { r = await setStatus(app2, 'SELECTED'); });
    assert(s.map(who).join() === 'application_selected:CTwo,application_not_selected:COne', 'manufacturer switches to C2: selected (C2) + not_selected to previously-selected C1', s.map(who));
    s = await sendsDuring(async () => { r = await setStatus(app2, 'REJECTED'); });
    assert(s.map(who).join() === 'application_rejected:CTwo', 'SELECTED → REJECTED (explicit): application_rejected', s.map(who));
    s = await sendsDuring(async () => { r = await setStatus(app1, 'SHORTLISTED'); });
    assert(s.length === 0, 'REJECTED → SHORTLISTED: in-app only, no WhatsApp template', names(s));
    s = await sendsDuring(async () => { r = await setStatus(app1, 'SELECTED'); });
    assert(s.map(who).join() === 'application_selected:COne' && (await jobsFor('application_selected')).length === 3,
      'C1 re-selected later → new transition marker → new job, sent', s.map(who));

    console.log('\n== Engagement / listing');
    s = await sendsDuring(async () => { r = await call('PATCH', `/staff/engagements/${app1}/status`, staffToken, { status: 'CONFIRMED' }); });
    assert(r.status === 200 && s.map(who).join() === 'engagement_confirmed:COne', 'engagement → CONFIRMED: engagement_confirmed', s.map(who));
    s = await sendsDuring(async () => { r = await call('PATCH', `/staff/engagements/${app1}/status`, staffToken, { status: 'CONFIRMED' }); });
    assert(s.length === 0, 'CONFIRMED → CONFIRMED: nothing', names(s));
    s = await sendsDuring(async () => { r = await call('PATCH', `/staff/contractors/${c1.id}/listing`, staffToken, { isUnlisted: true, reason: 'Flow test reason' }); });
    assert(names(s).join() === 'contractor_unlisted' && s[0].params[1] === 'Flow test reason', 'unlist → contractor_unlisted with reason', s.map(who));
    s = await sendsDuring(async () => { r = await call('PATCH', `/staff/contractors/${c1.id}/listing`, staffToken, { isUnlisted: true, reason: 'edited' }); });
    assert(s.length === 0, 'unlist again (reason edit) → nothing', names(s));
    s = await sendsDuring(async () => { r = await call('PATCH', `/staff/contractors/${c1.id}/listing`, staffToken, { isUnlisted: false }); });
    assert(names(s).join() === 'contractor_relisted', 'relist → contractor_relisted', names(s));

    const ok = meta.calls.filter((c) => c.status === 200);
    assert(ok.every((x) => x.to === '918793964438'), `all ${ok.length} successful Meta sends went only to 918793964438`);
    const allOutput = processes.flatMap((p) => p.output);
    assert(!allOutput.some((l) => l.includes('MOCK_TOKEN_DO_NOT_LEAK')), `API + worker output (${processes.length} processes, ${allOutput.length} lines) never contains the access token`);
  } finally {
    console.log('\n== Cleanup');
    await stopProcess(worker, 'SIGTERM');
    await stopProcess(api, 'SIGTERM');
    const users = ids.users.filter(Boolean);
    const appRows = users.length ? await sql`
      SELECT a.id FROM applications a JOIN contractor_profiles cp ON cp.id = a.contractor_id WHERE cp.user_id IN ${sql(users)}` : [];
    const refs = [...new Set([...ids.entities.filter(Boolean), ...appRows.map((a: any) => a.id)])];
    const byUser = users.length ? sql`user_id IN ${sql(users)}` : sql`false`;
    const byRef = (col: string) => (refs.length ? sql`${sql(col)} IN ${sql(refs)}` : sql`false`);
    await sql`DELETE FROM notifications WHERE ${byUser} OR ${byRef('reference_id')}`;
    await sql`DELETE FROM platform_events WHERE ${byUser} OR ${byRef('entity_id')}`;
    await sql`DELETE FROM audit_logs WHERE ${byRef('target_id')} OR ${users.length ? sql`admin_id IN ${sql(users)}` : sql`false`}`;
    await sql`DELETE FROM manpower_requirements WHERE city = ${CITY}`;
    if (users.length) await sql`DELETE FROM users WHERE id IN ${sql(users)}`;
    await sql`DELETE FROM auth_verifications WHERE target LIKE ${`wa-flowtest-${RUN_ID}-%`}`;
    await inspector.deleteQueue(QUEUE).catch(() => {});
    await inspector.deleteQueue(q.WHATSAPP_DEAD_LETTER_QUEUE).catch(() => {});

    const [left] = await sql`
      SELECT
        (SELECT count(*)::int FROM users WHERE email LIKE ${`wa-flowtest-${RUN_ID}-%`}) AS users,
        (SELECT count(*)::int FROM contractor_profiles WHERE city = ${CITY}) AS contractors,
        (SELECT count(*)::int FROM business_profiles WHERE city = ${CITY}) AS businesses,
        (SELECT count(*)::int FROM manpower_requirements WHERE city = ${CITY}) AS requirements,
        (SELECT count(*)::int FROM notifications WHERE ${byRef('reference_id')}) AS notifications,
        (SELECT count(*)::int FROM platform_events WHERE ${byRef('entity_id')}) AS events,
        (SELECT count(*)::int FROM auth_verifications WHERE target LIKE ${`wa-flowtest-${RUN_ID}-%`}) AS otps,
        (SELECT count(*)::int FROM pgboss.job WHERE name IN (${QUEUE}, ${q.WHATSAPP_DEAD_LETTER_QUEUE})) AS jobs,
        (SELECT count(*)::int FROM pgboss.job WHERE name = 'whatsapp-notifications' AND data->>'idempotencyKey' LIKE ANY (${sql.array(refs.length ? refs.map((id) => `%${id}%`) : ['__none__'])})) AS stray_real_queue_jobs
    `;
    assert(Object.values(left).every((n) => n === 0), `all test rows removed ${JSON.stringify(left)}`);
    await inspector.stop({ graceful: false, close: true });
    await sql.end({ timeout: 5 });
    meta.stop();
    const res = results();
    console.log(`\nResult: ${res.passed} passed, ${res.failed} failed · ${meta.calls.length} mock Meta calls (${meta.calls.filter((c) => c.status === 200).length} accepted)`);
    process.exit(res.failed === 0 ? 0 : 1);
  }
}

main().catch((err) => {
  console.error('flow test crashed:', err);
  process.exit(1);
});
