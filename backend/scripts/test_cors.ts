/**
 * CORS tests for the API (utils/corsOrigin.ts) — no network beyond 127.0.0.1.
 *
 *   1. isAllowedOrigin(): production origins allowed, look-alikes refused.
 *   2. A real Express app with the API's own cors options + error handler:
 *      preflight, credentials, and CORS headers on error responses.
 *
 * Usage (from backend/):
 *   npx ts-node --transpile-only scripts/test_cors.ts
 */
import http from 'http';
import type { AddressInfo } from 'net';
import express from 'express';
import cors from 'cors';
import { isAllowedOrigin, buildCorsOptions } from '../src/utils/corsOrigin';
import { errorHandler, type AppError } from '../src/middlewares/errorHandler';

let passed = 0;
let failed = 0;
function assert(condition: unknown, name: string, detail?: unknown): void {
  if (condition) { passed++; console.log(`  PASS  ${name}`); } else { failed++; console.log(`  FAIL  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail)}` : ''}`); }
}

async function main(): Promise<void> {
  // The production EC2 value of ALLOWED_ORIGINS (from the API's startup log).
  const prod = ['https://craly.co'];

  console.log('== 1. Origin rules');
  const allowed: [string | undefined, string][] = [
    ['https://craly.co', 'apex production site'],
    ['https://www.craly.co', 'www production site'],
    ['https://api.craly.co', 'other craly.co subdomain'],
    [undefined, 'no Origin header (curl, server-to-server, same-origin)'],
  ];
  for (const [origin, label] of allowed) assert(isAllowedOrigin(origin, prod), `allowed: ${origin ?? '(none)'} — ${label}`);

  const refused: [string, string][] = [
    ['https://evilcraly.co', 'look-alike ending in "craly.co" (was allowed before this fix)'],
    ['https://notcraly.co', 'look-alike ending in "craly.co" (was allowed before this fix)'],
    ['https://craly.co.evil.com', 'craly.co as a prefix of another domain'],
    ['http://craly.co', 'plain HTTP'],
    ['https://example.com', 'unrelated site'],
    ['null', 'opaque origin (sandboxed iframe / file://)'],
  ];
  for (const [origin, label] of refused) assert(!isAllowedOrigin(origin, prod), `refused: ${origin} — ${label}`);

  assert(isAllowedOrigin('http://localhost:3000', ['http://localhost:3000']) && !isAllowedOrigin('http://localhost:3001', ['http://localhost:3000']),
    'ALLOWED_ORIGINS still matched exactly (local dev)');
  assert(isAllowedOrigin('https://craly-git-x.vercel.app', ['https://craly.vercel.app']) && !isAllowedOrigin('https://craly-git-x.vercel.app', prod),
    'Vercel preview rule unchanged (only when a vercel.app origin is configured)');
  assert(isAllowedOrigin('https://anything.example', ['*']), 'ALLOWED_ORIGINS=* still allows everything (unchanged)');

  console.log('\n== 2. Express: preflight, credentials, headers on errors');
  const app = express();
  app.use(cors(buildCorsOptions(prod)));
  app.use(express.json({ limit: '1mb' }));
  app.post('/api/contractor-portal/documents', (_req, _res, next) => {
    const err: AppError = new Error('Authentication required');
    err.statusCode = 401;
    next(err);
  });
  app.post('/json', (_req, res) => { res.json({ ok: true }); });
  app.use(errorHandler);
  const server = http.createServer(app);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const errLog = console.error;
  const warnLog = console.warn;
  console.error = () => {};
  console.warn = () => {};

  for (const origin of ['https://craly.co', 'https://www.craly.co']) {
    const r = await fetch(`${base}/api/contractor-portal/documents`, {
      method: 'OPTIONS',
      headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' },
    });
    assert(r.status === 204 && r.headers.get('access-control-allow-origin') === origin && r.headers.get('access-control-allow-credentials') === 'true'
      && /POST/.test(r.headers.get('access-control-allow-methods') ?? ''),
      `preflight from ${origin}: 204, origin echoed exactly (not *), credentials true, POST allowed`,
      { status: r.status, acao: r.headers.get('access-control-allow-origin') });
  }

  const evil = await fetch(`${base}/api/contractor-portal/documents`, {
    method: 'OPTIONS',
    headers: { Origin: 'https://evilcraly.co', 'Access-Control-Request-Method': 'POST' },
  });
  assert(evil.headers.get('access-control-allow-origin') === null, 'preflight from https://evilcraly.co gets no Access-Control-Allow-Origin', evil.headers.get('access-control-allow-origin'));

  const unauth = await fetch(`${base}/api/contractor-portal/documents`, { method: 'POST', headers: { Origin: 'https://www.craly.co' } });
  assert(unauth.status === 401 && unauth.headers.get('access-control-allow-origin') === 'https://www.craly.co' && unauth.headers.get('access-control-allow-credentials') === 'true',
    'Express error response (401) carries CORS headers, so the browser can read the real error', { status: unauth.status });

  const tooBig = await fetch(`${base}/json`, {
    method: 'POST',
    headers: { Origin: 'https://craly.co', 'Content-Type': 'application/json' },
    body: JSON.stringify({ blob: 'x'.repeat(1_200_000) }),
  });
  assert(tooBig.status === 413 && tooBig.headers.get('access-control-allow-origin') === 'https://craly.co',
    'a 413 produced by Express (not Nginx) also carries CORS headers', { status: tooBig.status, acao: tooBig.headers.get('access-control-allow-origin') });

  console.error = errLog;
  console.warn = warnLog;
  server.close();
  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
