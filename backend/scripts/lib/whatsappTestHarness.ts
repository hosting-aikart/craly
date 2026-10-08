import http from 'http';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import type { AddressInfo } from 'net';

// Shared pieces for the pg-boss WhatsApp tests: a local mock of the Meta
// Graph API, and helpers that run the REAL src/worker.ts / src/server.ts as
// separate OS processes (so restarts and crashes are real process exits).

export const RUN_ID = `${Date.now()}`;
export const BACKEND_DIR = path.resolve(__dirname, '..', '..');

// ── mock Meta Graph API ──────────────────────────────────────────────────────
// Behaviour is chosen by a tag inside the first template parameter:
//   [fail500x2]   HTTP 500 twice, then success          (temporary → retried)
//   [rate130429]  Meta throughput error once, then success
//   [always500]   HTTP 500 every time                   (exhausts retries)
//   [perm131030]  400 "recipient not in allowed list"   (permanent)
//   [slow3s] / [slow8s]  respond after a delay
//   anything else: immediate success
export interface MockCall { template: string; to: string; params: string[]; status: number; messageId?: string; at: number }

export class MockMeta {
  readonly calls: MockCall[] = [];
  private server!: http.Server;
  private seen = new Map<string, number>();
  baseUrl = '';

  async start(): Promise<void> {
    this.server = http.createServer((req, res) => {
      let raw = '';
      req.on('data', (c) => { raw += c; });
      req.on('end', async () => {
        const auth = req.headers.authorization ?? '';
        const body = raw ? JSON.parse(raw) : {};
        const params: string[] = (body.template?.components?.[0]?.parameters ?? []).map((p: any) => p.text);
        const key = JSON.stringify([body.template?.name, params]);
        const n = (this.seen.get(key) ?? 0) + 1;
        this.seen.set(key, n);
        const tag = params[0] ?? '';

        let status = 200;
        let payload: any;
        if (!auth.startsWith('Bearer ')) {
          status = 401;
          payload = { error: { message: 'no token', code: 190 } };
        } else if (tag.includes('[fail500x2]') && n <= 2) {
          status = 500;
          payload = { error: { message: 'mock temporary failure', code: 2, fbtrace_id: 'MOCK500' } };
        } else if (tag.includes('[rate130429]') && n <= 1) {
          status = 400;
          payload = { error: { message: 'mock throughput limit', code: 130429, fbtrace_id: 'MOCKRATE' } };
        } else if (tag.includes('[always500]')) {
          status = 500;
          payload = { error: { message: 'mock outage', code: 2, fbtrace_id: 'MOCK500' } };
        } else if (tag.includes('[perm131030]')) {
          status = 400;
          payload = { error: { message: '(#131030) Recipient phone number not in allowed list', code: 131030, error_data: { details: 'Recipient phone number not in allowed list' }, fbtrace_id: 'MOCKPERM' } };
        } else {
          const delay = tag.includes('[slow8s]') ? 8000 : tag.includes('[slow3s]') ? 3000 : 0;
          if (delay) await new Promise((r) => setTimeout(r, delay));
          payload = { messaging_product: 'whatsapp', contacts: [{ input: body.to, wa_id: body.to }], messages: [{ id: `wamid.MOCK${this.calls.length + 1}` }] };
        }
        this.calls.push({ template: body.template?.name, to: body.to, params, status, messageId: payload.messages?.[0]?.id, at: Date.now() });
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(payload));
      });
    });
    await new Promise<void>((r) => this.server.listen(0, '127.0.0.1', () => r()));
    this.baseUrl = `http://127.0.0.1:${(this.server.address() as AddressInfo).port}`;
  }

  callsFor(predicate: (c: MockCall) => boolean): MockCall[] {
    return this.calls.filter(predicate);
  }

  stop(): void {
    this.server.close();
  }
}

/** Env shared by the test's own producer and every spawned process. Fake credentials; Meta is the mock. */
export function testEnv(queueName: string, mockBaseUrl: string): Record<string, string> {
  return {
    NODE_ENV: 'test',
    WHATSAPP_QUEUE_NAME: queueName,
    WHATSAPP_GRAPH_API_BASE_URL: mockBaseUrl,
    WHATSAPP_API_VERSION: 'v25.0',
    WHATSAPP_PHONE_NUMBER_ID: 'MOCK_PHONE_ID',
    WHATSAPP_ACCESS_TOKEN: 'MOCK_TOKEN_DO_NOT_LEAK',
    WHATSAPP_DEFAULT_COUNTRY_CODE: '91',
    WHATSAPP_ENABLED: 'true',
    WHATSAPP_TEST_RECIPIENT: '',
    WHATSAPP_RETRY_DELAY_SECONDS: '1',
    WHATSAPP_RETRY_DELAY_MAX_SECONDS: '2',
    WHATSAPP_WORKER_POLL_SECONDS: '0.5',
    WHATSAPP_WORKER_CONCURRENCY: '1',
    WHATSAPP_JOB_EXPIRE_SECONDS: '15',
    PGBOSS_SUPERVISE_INTERVAL_SECONDS: '2',
  };
}

export interface ManagedProcess {
  name: string;
  child: ChildProcess;
  output: string[];
  exited: Promise<{ code: number | null; signal: NodeJS.Signals | null }>;
  waitForLine(pattern: RegExp, timeoutMs?: number): Promise<string>;
}

/** Runs a backend entry point (src/worker.ts, src/server.ts) as its own node process. */
export function spawnBackend(name: string, entry: string, env: Record<string, string>): ManagedProcess {
  const child = spawn(process.execPath, ['-r', 'ts-node/register/transpile-only', entry], {
    cwd: BACKEND_DIR,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const output: string[] = [];
  const waiters: { pattern: RegExp; resolve: (l: string) => void }[] = [];
  const onData = (chunk: Buffer) => {
    for (const line of chunk.toString().split('\n').filter(Boolean)) {
      output.push(line);
      for (const w of [...waiters]) {
        if (w.pattern.test(line)) {
          waiters.splice(waiters.indexOf(w), 1);
          w.resolve(line);
        }
      }
    }
  };
  child.stdout!.on('data', onData);
  child.stderr!.on('data', onData);
  const exited = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((r) => child.on('exit', (code, signal) => r({ code, signal })));
  return {
    name,
    child,
    output,
    exited,
    waitForLine(pattern, timeoutMs = 60_000) {
      const existing = output.find((l) => pattern.test(l));
      if (existing) return Promise.resolve(existing);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`${name}: timed out waiting for ${pattern} — last output:\n${output.slice(-15).join('\n')}`)), timeoutMs);
        waiters.push({ pattern, resolve: (l) => { clearTimeout(timer); resolve(l); } });
      });
    },
  };
}

export async function stopProcess(p: ManagedProcess | null | undefined, signal: NodeJS.Signals = 'SIGTERM'): Promise<{ code: number | null; signal: NodeJS.Signals | null } | null> {
  if (!p || p.child.exitCode !== null || p.child.signalCode !== null) return null;
  p.child.kill(signal);
  return p.exited;
}

export async function waitFor<T>(label: string, fn: () => Promise<T | null | undefined | false>, timeoutMs = 60_000, intervalMs = 250): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await fn();
    if (value) return value as T;
    if (Date.now() > deadline) throw new Error(`timed out waiting for: ${label}`);
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

let passed = 0;
let failed = 0;
export function assert(condition: unknown, name: string, detail?: unknown): void {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail)}` : ''}`);
  }
}
export function results(): { passed: number; failed: number } {
  return { passed, failed };
}
