/**
 * Offline tests for the WhatsApp integration — no Meta calls, no database,
 * no pg-boss. graph.facebook.com is replaced by a mocked fetch; the pg-boss
 * enqueue function is replaced by a recorder; DATABASE_URL points at a closed
 * local port so the platform_events audit write fails (which also proves an
 * audit failure never breaks processing).
 *
 * Usage (from backend/):
 *   npx ts-node --transpile-only scripts/test_whatsapp_mock.ts
 */

// Must be set before any src/ module loads (config/index.ts reads env at import).
process.env.DATABASE_URL = 'postgres://mock:mock@127.0.0.1:1/mock?sslmode=require';
process.env.WHATSAPP_API_VERSION = 'v25.0';
process.env.WHATSAPP_PHONE_NUMBER_ID = '111222333';
process.env.WHATSAPP_ACCESS_TOKEN = 'MOCK_SECRET_TOKEN_DO_NOT_LEAK';
process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = '999888777';
process.env.WHATSAPP_DEFAULT_COUNTRY_CODE = '91';
process.env.NODE_ENV = 'test';
delete process.env.WHATSAPP_TEST_RECIPIENT;
delete process.env.WHATSAPP_ENABLED;
delete process.env.WHATSAPP_GRAPH_API_BASE_URL;
delete process.env.QUEUE_DATABASE_URL;

import { createHmac } from 'crypto';
import http from 'http';
import type { AddressInfo } from 'net';

/* eslint-disable @typescript-eslint/no-var-requires */
const queueModule = require('../src/queue/whatsappQueue') as typeof import('../src/queue/whatsappQueue');
const wa = require('../src/utils/whatsapp') as typeof import('../src/utils/whatsapp');
const wn = require('../src/utils/whatsappNotifications') as typeof import('../src/utils/whatsappNotifications');
const express = require('express') as typeof import('express');
const webhookRoutes = require('../src/routes/whatsappWebhookRoutes').default;
const webhookController = require('../src/controllers/whatsappWebhookController') as typeof import('../src/controllers/whatsappWebhookController');
const sql = require('../src/db/index').default;

type JobData = import('../src/queue/whatsappQueue').WhatsAppJobData;

// ── tiny harness ────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
function assert(condition: unknown, name: string, detail?: unknown): void {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail)}` : ''}`);
  }
}
async function rejects(fn: () => Promise<unknown>, pattern: RegExp, name: string): Promise<void> {
  try {
    await fn();
    assert(false, name, 'did not throw');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    assert(pattern.test(msg) && !msg.includes('MOCK_SECRET_TOKEN'), name, msg);
  }
}

// ── capture logs (to prove the token never appears) ─────────────────────────
const logged: string[] = [];
for (const level of ['log', 'warn', 'error'] as const) {
  const original = console[level].bind(console);
  console[level] = (...args: unknown[]) => {
    logged.push(args.map((a) => (a instanceof Error ? `${a.message} ${a.stack}` : typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
    const first = String(args[0] ?? '');
    if (/^ {2}(PASS|FAIL)|^\n?==|^\nResult/.test(first)) original(...args);
  };
}

// ── recorded enqueues (instead of pg-boss) ──────────────────────────────────
const enqueued: JobData[] = [];
const seenKeys = new Set<string>();
let enqueueFails = false;
(queueModule as any).enqueueWhatsAppJob = async (data: JobData) => {
  if (enqueueFails) throw new Error('connection refused (mock)');
  if (seenKeys.has(data.idempotencyKey)) return null;
  seenKeys.add(data.idempotencyKey);
  enqueued.push(data);
  return queueModule.jobIdForKey(data.idempotencyKey);
};
const since = (start: number) => enqueued.slice(start);

// ── mocked Graph API ────────────────────────────────────────────────────────
interface Captured { url: string; headers: Record<string, string>; body: any }
const captured: Captured[] = [];
type Mode = 'ok' | 'meta_error' | 'meta_500' | 'token_expired' | 'malformed' | 'timeout' | 'network';
let mode: Mode = 'ok';
const realFetch = globalThis.fetch;

globalThis.fetch = (async (input: any, init?: any) => {
  const url = String(input);
  if (url.startsWith('http://127.0.0.1')) return realFetch(input, init);
  captured.push({ url, headers: init?.headers ?? {}, body: init?.body ? JSON.parse(init.body) : null });
  if (mode === 'timeout') {
    const e = new Error('The operation was aborted due to timeout');
    e.name = 'TimeoutError';
    throw e;
  }
  if (mode === 'network') throw new Error('getaddrinfo ENOTFOUND graph.facebook.com');
  if (mode === 'meta_error') {
    return new Response(JSON.stringify({ error: { message: '(#131030) Recipient phone number not in allowed list', code: 131030, error_data: { details: 'Recipient phone number not in allowed list' }, fbtrace_id: 'TRACE123' } }), { status: 400 });
  }
  if (mode === 'meta_500') return new Response(JSON.stringify({ error: { message: 'Service temporarily unavailable', code: 2 } }), { status: 500 });
  if (mode === 'token_expired') return new Response(JSON.stringify({ error: { message: 'Session has expired', code: 190 } }), { status: 401 });
  if (mode === 'malformed') return new Response('{"messaging_product":"whatsapp"}', { status: 200 });
  const to = captured[captured.length - 1].body?.to ?? '';
  return new Response(JSON.stringify({ messaging_product: 'whatsapp', contacts: [{ input: to, wa_id: to }], messages: [{ id: `wamid.MOCK${captured.length}`, message_status: 'accepted' }] }), { status: 200 });
}) as typeof fetch;

const sampleJob = (overrides: Partial<JobData> = {}): JobData => ({
  template: 'application_selected',
  languageCode: 'en_US',
  to: '8793964438',
  parameters: ['Vishal Contractor', 'Welders for Pune Plant'],
  context: { entityType: 'application', entityId: '00000000-0000-0000-0000-000000000000', userId: null },
  idempotencyKey: 'mock:1',
  queuedAt: new Date().toISOString(),
  ...overrides,
});
const attempt = (retryCount: number) => ({ jobId: 'job-1', retryCount, retryLimit: 4 });

async function main(): Promise<void> {
  console.log('== Phone normalization / masking');
  assert(wa.normalizeWhatsAppNumber('8793964438') === '918793964438', '10-digit number gets default country code 91');
  assert(wa.normalizeWhatsAppNumber('+91 87939-64438') === '918793964438', '+91 with spaces/dashes is reduced to digits');
  assert(wa.normalizeWhatsAppNumber('918793964438') === '918793964438', 'already-international number is unchanged');
  assert(wa.maskPhoneNumber('918793964438') === '91******4438', 'mask keeps only country prefix + last 4');

  console.log('\n== Request construction (sendWhatsAppTemplate)');
  mode = 'ok';
  const start = captured.length;
  const res = await wa.sendWhatsAppTemplate({ to: '8793964438', templateName: 'application_selected', languageCode: 'en_US', parameters: ['Vishal\nContractor', 'Welders for Pune Plant'] });
  const req = captured[start];
  assert(req.url === 'https://graph.facebook.com/v25.0/111222333/messages', 'URL uses WHATSAPP_API_VERSION + WHATSAPP_PHONE_NUMBER_ID', req.url);
  assert(req.headers.Authorization === 'Bearer MOCK_SECRET_TOKEN_DO_NOT_LEAK', 'token sent only in Authorization header');
  assert(req.body.messaging_product === 'whatsapp' && req.body.type === 'template' && req.body.to === '918793964438', 'payload: messaging_product/type/to');
  assert(req.body.template.name === 'application_selected' && req.body.template.language.code === 'en_US', 'payload: template name + language');
  assert(JSON.stringify(req.body.template.components) === JSON.stringify([{ type: 'body', parameters: [{ type: 'text', text: 'Vishal Contractor' }, { type: 'text', text: 'Welders for Pune Plant' }] }]), 'payload: body parameters in order, newline collapsed');
  assert(res.messages[0].id === `wamid.MOCK${start + 1}`, 'returns Meta message id');

  process.env.WHATSAPP_GRAPH_API_BASE_URL = 'http://evil.example';
  process.env.NODE_ENV = 'production';
  await wa.sendWhatsAppTemplate({ to: '8793964438', templateName: 'contractor_welcome', languageCode: 'en_US', parameters: ['X'] });
  assert(captured[captured.length - 1].url.startsWith('https://graph.facebook.com/'), 'WHATSAPP_GRAPH_API_BASE_URL is ignored when NODE_ENV=production (token can only go to Meta)');
  process.env.NODE_ENV = 'test';
  delete process.env.WHATSAPP_GRAPH_API_BASE_URL;

  console.log('\n== Validation + error classification');
  await rejects(() => wa.sendWhatsAppTemplate({ to: '12', templateName: 'application_selected', languageCode: 'en_US', parameters: ['a', 'b'] }), /phone number is missing or invalid/, 'invalid phone rejected before calling Meta');
  await rejects(() => wa.sendWhatsAppTemplate({ to: '8793964438', templateName: 'application_selected', languageCode: 'en_US', parameters: ['only one'] }), /expects 2 parameter\(s\), got 1/, 'wrong parameter count rejected locally');
  await rejects(() => wa.sendWhatsAppTemplate({ to: '8793964438', templateName: 'application_selected', languageCode: 'en_US', parameters: ['a', '   '] }), /parameter \{\{2\}\} is empty/, 'empty parameter rejected');
  const E = wa.WhatsAppError;
  const cases: [InstanceType<typeof E> | Error, boolean, string][] = [
    [new E('x', 'network'), true, 'network/timeout'],
    [new E('x', 'config'), true, 'missing config'],
    [new E('x', 'api', { httpStatus: 500, metaCode: 2 }), true, 'HTTP 500'],
    [new E('x', 'api', { httpStatus: 503 }), true, 'HTTP 503'],
    [new E('x', 'api', { httpStatus: 429 }), true, 'HTTP 429'],
    [new E('x', 'api', { httpStatus: 400, metaCode: 130429 }), true, 'Meta 130429 throughput'],
    [new E('x', 'api', { httpStatus: 400, metaCode: 131056 }), true, 'Meta 131056 pair rate limit'],
    [new E('x', 'api', { httpStatus: 401, metaCode: 190 }), true, 'Meta 190 token expired (ops-fixable)'],
    [new E('x', 'api', { httpStatus: 400, metaCode: 131030 }), false, 'Meta 131030 recipient not allowed'],
    [new E('x', 'api', { httpStatus: 404, metaCode: 132001 }), false, 'Meta 132001 template missing'],
    [new E('x', 'api', { httpStatus: 400, metaCode: 100 }), false, 'Meta 100 invalid parameter'],
    [new E('x', 'validation'), false, 'local validation'],
    [new E('x', 'response'), false, 'malformed 2xx (may already be sent)'],
    [new Error('db blip'), true, 'unexpected error'],
  ];
  for (const [err, expected, label] of cases) {
    assert(wa.isRetryableWhatsAppError(err) === expected, `${label} → ${expected ? 'retry' : 'no retry'}`);
  }

  console.log('\n== Worker job processing (processWhatsAppJob)');
  mode = 'ok';
  let out = await wa.processWhatsAppJob(sampleJob(), attempt(0));
  assert(out.status === 'completed' && String(out.output.messageId).startsWith('wamid.'), 'success → completed with message id');
  mode = 'meta_500';
  out = await wa.processWhatsAppJob(sampleJob(), attempt(0));
  assert(out.status === 'failed' && out.output.retryable === true, 'HTTP 500 on attempt 1 → failed (pg-boss retries)', out);
  out = await wa.processWhatsAppJob(sampleJob(), attempt(4));
  assert(out.status === 'failed' && out.output.reason === 'retries exhausted', 'HTTP 500 on attempt 5 → failed, reason "retries exhausted" (pg-boss dead-letters)', out);
  mode = 'token_expired';
  out = await wa.processWhatsAppJob(sampleJob(), attempt(1));
  assert(out.status === 'failed' && out.output.retryable === true, 'token expired → retried (ops can fix before retries run out)', out);
  mode = 'meta_error';
  out = await wa.processWhatsAppJob(sampleJob(), attempt(0));
  assert(out.status === 'deadletter' && out.output.meta_code === 131030 && out.output.reason === 'permanent error', '131030 → deadletter immediately, no retries', out);
  mode = 'malformed';
  out = await wa.processWhatsAppJob(sampleJob(), attempt(0));
  assert(out.status === 'deadletter', 'malformed 2xx → deadletter (no retry: Meta may have sent it)', out);
  mode = 'timeout';
  out = await wa.processWhatsAppJob(sampleJob(), attempt(0));
  assert(out.status === 'failed' && String(out.output.error).includes('timed out after 10000ms'), 'timeout → failed (retried)', out);
  mode = 'network';
  out = await wa.processWhatsAppJob(sampleJob(), attempt(0));
  assert(out.status === 'failed' && out.output.kind === 'network', 'network error → failed (retried)', out);
  mode = 'ok';
  out = await wa.processWhatsAppJob(sampleJob({ to: '12' }), attempt(0));
  assert(out.status === 'deadletter' && out.output.kind === 'validation', 'invalid stored phone → deadletter without calling Meta', out);
  out = await wa.processWhatsAppJob(sampleJob({ parameters: ['only one'] }), attempt(0));
  assert(out.status === 'deadletter', 'wrong parameter count → deadletter', out);
  process.env.WHATSAPP_ENABLED = 'false';
  const beforeDisabled = captured.length;
  out = await wa.processWhatsAppJob(sampleJob(), attempt(0));
  assert(out.status === 'completed' && out.output.skipped && captured.length === beforeDisabled, 'WHATSAPP_ENABLED=false at the worker → completed without sending', out);
  delete process.env.WHATSAPP_ENABLED;
  process.env.WHATSAPP_TEST_RECIPIENT = '8793964438';
  await wa.processWhatsAppJob(sampleJob({ to: '9000000001' }), attempt(0));
  assert(captured[captured.length - 1].body.to === '918793964438', 'WHATSAPP_TEST_RECIPIENT redirects at send time');
  delete process.env.WHATSAPP_TEST_RECIPIENT;
  assert(logged.some((l) => l.includes('failed to record whatsapp_sent in platform_events')), 'audit-write failure (DB down) is logged, never thrown');

  console.log('\n== Producer (queueWhatsAppTemplate)');
  let s = enqueued.length;
  await wa.queueWhatsAppTemplate({ to: '8793964438', template: 'contractor_welcome', parameters: ['A'], context: { entityType: 't', entityId: 'e1' }, idempotencyKey: 'k-producer-1' });
  const job = enqueued[s];
  assert(job && job.template === 'contractor_welcome' && job.to === '8793964438' && job.languageCode === 'en_US' && JSON.stringify(job.parameters) === '["A"]'
    && job.idempotencyKey === 'k-producer-1' && job.context.entityId === 'e1' && job.context.userId === null && !!job.queuedAt, 'job payload carries everything the worker needs', job);
  s = enqueued.length;
  process.env.WHATSAPP_ENABLED = 'false';
  await wa.queueWhatsAppTemplate({ to: '8793964438', template: 'contractor_welcome', parameters: ['A'], context: { entityType: 't', entityId: 'e2' }, idempotencyKey: 'k-producer-2' });
  delete process.env.WHATSAPP_ENABLED;
  await wa.queueWhatsAppTemplate({ to: '  ', template: 'contractor_welcome', parameters: ['A'], context: { entityType: 't', entityId: 'e3' }, idempotencyKey: 'k-producer-3' });
  const savedToken = process.env.WHATSAPP_ACCESS_TOKEN;
  delete process.env.WHATSAPP_ACCESS_TOKEN;
  await wa.queueWhatsAppTemplate({ to: '8793964438', template: 'contractor_welcome', parameters: ['A'], context: { entityType: 't', entityId: 'e4' }, idempotencyKey: 'k-producer-4' });
  process.env.WHATSAPP_ACCESS_TOKEN = savedToken;
  assert(enqueued.length === s, 'nothing queued when disabled, when there is no phone, or when WhatsApp is not configured');
  enqueueFails = true;
  let threw = false;
  try {
    await wa.queueWhatsAppTemplate({ to: '8793964438', template: 'contractor_welcome', parameters: ['A'], context: { entityType: 't', entityId: 'e5' }, idempotencyKey: 'k-producer-5' });
  } catch { threw = true; }
  enqueueFails = false;
  assert(!threw && logged.some((l) => l.includes('could NOT be queued')), 'enqueue failure (DB down) is logged, never thrown to the controller');

  console.log('\n== Queue helpers');
  const id1 = queueModule.jobIdForKey('application_selected:abc:u1:2026-10-02T10:00:00.000Z');
  assert(id1 === queueModule.jobIdForKey('application_selected:abc:u1:2026-10-02T10:00:00.000Z') && /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id1),
    'idempotency key → deterministic UUIDv5 job id', id1);
  assert(id1 !== queueModule.jobIdForKey('application_selected:abc:u1:2026-10-02T10:05:00.000Z'), 'different transition marker → different job id');
  const savedDbUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = 'postgres://u:p@ep-x-123-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require';
  process.env.QUEUE_DATABASE_URL = 'postgres://u:p@ep-x-123-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require';
  assert(new URL(queueModule.queueConnectionString()).hostname === 'ep-x-123-pooler.c-4.us-east-2.aws.neon.tech', 'QUEUE_DATABASE_URL is used as given (explicit override)');
  delete process.env.QUEUE_DATABASE_URL;
  const derived = new URL(queueModule.queueConnectionString());
  assert(derived.hostname === 'ep-x-123.c-4.us-east-2.aws.neon.tech' && derived.searchParams.get('sslmode') === 'verify-full',
    'derived from DATABASE_URL: Neon -pooler host → direct host, sslmode=verify-full', derived.hostname);
  process.env.DATABASE_URL = savedDbUrl;

  console.log('\n== Event → template mapping + idempotency keys (whatsappNotifications)');
  const c = { contractorId: 'c-1', userId: 'u-1', phone: '8793964438', companyName: 'Vishal Contractor' };
  const transitions: [string | null, string, string | undefined][] = [
    ['pending', 'verified', 'contractor_verification_approved'],
    ['under_review', 'rejected', 'contractor_verification_rejected'],
    ['pending', 'needs_changes', 'contractor_verification_needs_changes'],
    ['rejected', 'pending', 'contractor_verification_pending'],
    ['needs_changes', 'pending', 'contractor_verification_pending'],
    ['verified', 'under_review', 'contractor_verification_pending'],
    ['pending', 'under_review', undefined],
    ['verified', 'verified', undefined],
    ['rejected', 'rejected', undefined],
  ];
  let n = 0;
  for (const [from, to, expected] of transitions) {
    s = enqueued.length;
    await wn.notifyContractorVerificationChange(c, from, to, `t${n++}`);
    const got = since(s).map((x) => x.template);
    assert(expected ? got.length === 1 && got[0] === expected : got.length === 0, `verification ${from} → ${to} ⇒ ${expected ?? 'no job'}`, got);
  }
  s = enqueued.length;
  await wn.notifyContractorVerificationChange(c, 'pending', 'verified', 'same-marker');
  await wn.notifyContractorVerificationChange(c, 'pending', 'verified', 'same-marker');
  assert(since(s).length === 1, 'same transition marker enqueued twice → one job');

  const at = new Date('2026-10-02T10:00:00.000Z');
  s = enqueued.length;
  await wn.notifyApplicationEvent(c, 'application_selected', { id: 'app-1', requirementTitle: 'Welders' }, at);
  await wn.notifyApplicationEvent(c, 'application_selected', { id: 'app-1', requirementTitle: 'Welders' }, at);
  await wn.notifyApplicationEvent(c, 'application_selected', { id: 'app-1', requirementTitle: 'Welders' }, new Date('2026-10-02T11:00:00.000Z'));
  const sel = since(s);
  assert(sel.length === 2 && sel[0].idempotencyKey === 'application_selected:app-1:u-1:2026-10-02T10:00:00.000Z',
    'application_selected key = template + application id + recipient + updated_at; repeat → 1 job, later re-selection → new job', sel.map((x) => x.idempotencyKey));

  s = enqueued.length;
  await wn.notifyContractorWelcome({ ...c, userId: null });
  await wn.notifyApplicationEvent({ ...c, userId: null }, 'application_selected', { id: 'app-2', requirementTitle: 'X' }, at);
  assert(since(s).length === 0, 'contractor without a login (user_id null) gets no job ("log in to Craly" would be wrong)');

  s = enqueued.length;
  await wn.notifyContractorWelcome(c);
  await wn.notifyContractorWelcome(c);
  assert(since(s).length === 1 && since(s)[0].template === 'contractor_welcome' && since(s)[0].parameters[0] === 'Vishal Contractor', 'contractor_welcome: company name as {{1}}, once per profile');

  s = enqueued.length;
  await wn.notifyKycDocumentReviewed(c, { id: 'doc-1', documentType: 'pf_registration' }, 'replacement_requested', at);
  assert(JSON.stringify(since(s)[0]?.parameters) === '["Vishal Contractor","PF Registration","Replacement requested"]', 'kyc_document_reviewed: document type + status labels');

  s = enqueued.length;
  await wn.notifyNewOpportunity(c, { id: 'req-1', title: 'Welders', location: '', city: 'Pune', state: 'Maharashtra', workers_required: 25, published_at: at });
  assert(JSON.stringify(since(s)[0]?.parameters) === '["Vishal Contractor","Welders","Pune, Maharashtra","25"]', 'new_opportunity: location falls back to city, state; workers as text');

  s = enqueued.length;
  await wn.notifyContractorListingChange(c, true, '  ', 'u1');
  await wn.notifyContractorListingChange(c, false, null, 'u2');
  assert(JSON.stringify(since(s).map((x) => x.template)) === '["contractor_unlisted","contractor_relisted"]' && since(s)[0].parameters[1] === 'Not specified', 'unlisted (blank reason → "Not specified") / relisted');

  s = enqueued.length;
  await wn.notifyManufacturerNewApplication({ userId: 'm-1', phone: '8793964438', companyName: 'Apex Manufacturing' }, { id: 'app-9', requirementTitle: 'Welders' });
  assert(since(s)[0]?.template === 'new_application' && since(s)[0].parameters[0] === 'Apex Manufacturing', 'new_application to manufacturer');

  console.log('\n== Webhook (GET verify / POST signature)');
  process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = 'verify-me';
  process.env.WHATSAPP_APP_SECRET = 'app-secret';
  const app = express();
  app.use('/api/webhooks/whatsapp', webhookRoutes);
  app.use(express.json());
  const server = http.createServer(app);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/webhooks/whatsapp`;
  let r = await realFetch(`${base}?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=12345`);
  assert(r.status === 200 && (await r.text()) === '12345', 'GET with correct verify token echoes hub.challenge');
  r = await realFetch(`${base}?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=12345`);
  assert(r.status === 403, 'GET with wrong verify token → 403');
  const payload = JSON.stringify({ object: 'not_whatsapp', entry: [] });
  const sign = (body: string, secret: string) => `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
  r = await realFetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': sign(payload, 'app-secret') }, body: payload });
  assert(r.status === 200, 'POST with valid signature → 200');
  r = await realFetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': sign(payload, 'other-secret') }, body: payload });
  assert(r.status === 401, 'POST with wrong signature → 401');
  delete process.env.WHATSAPP_APP_SECRET;
  r = await realFetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': sign(payload, 'app-secret') }, body: payload });
  assert(r.status === 503, 'POST when WHATSAPP_APP_SECRET unset → 503 (fail closed)');
  assert(webhookController.isValidWhatsAppSignature(Buffer.from('abc'), sign('abc', 's'), 's') && !webhookController.isValidWhatsAppSignature(Buffer.from('abd'), sign('abc', 's'), 's'), 'signature check is over the exact raw bytes');
  server.close();

  console.log('\n== Secrets');
  assert(!logged.some((l) => l.includes('MOCK_SECRET_TOKEN')), `access token never appears in any of ${logged.length} captured log lines`);

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  await sql.end({ timeout: 1 }).catch(() => {});
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
