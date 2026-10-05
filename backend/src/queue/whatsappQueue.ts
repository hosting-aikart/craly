import { createHash } from 'crypto';
import { PgBoss } from 'pg-boss';
import config from '../config/index';

// Durable WhatsApp job queue on pg-boss, stored in the existing Postgres
// (Neon) database under the `pgboss` schema — no Redis, no second database.
//
//   API (producer)  enqueueWhatsAppJob() → INSERT into pgboss.job
//   src/worker.ts   boss.work(WHATSAPP_QUEUE) → utils/whatsapp.processWhatsAppJob()
//
// Event-driven only: `schedule: false` — pg-boss's cron scheduler is not used.

export interface WhatsAppJobData {
  template: string;
  languageCode: string;
  /** Recipient phone exactly as stored in Craly; normalized at send time. */
  to: string;
  parameters: string[];
  context: { entityType: string; entityId: string; userId: string | null };
  idempotencyKey: string;
  queuedAt: string;
}

export const WHATSAPP_QUEUE = process.env.WHATSAPP_QUEUE_NAME?.trim() || 'whatsapp-notifications';
export const WHATSAPP_DEAD_LETTER_QUEUE = `${WHATSAPP_QUEUE}-dlq`;
const PGBOSS_SCHEMA = 'pgboss';

const DAY = 24 * 60 * 60;

function intEnv(name: string, fallback: number): number {
  const value = parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * Queue policy. 5 attempts total (retryLimit 4), exponential backoff from
 * WHATSAPP_RETRY_DELAY_SECONDS (default 30s → ~30s, 60s, 120s, 240s), capped
 * at WHATSAPP_RETRY_DELAY_MAX_SECONDS. Retention is handled by pg-boss's own
 * maintenance (run by the worker), never by manual DELETEs.
 */
export function whatsappQueueOptions() {
  return {
    retryLimit: 4,
    retryDelay: intEnv('WHATSAPP_RETRY_DELAY_SECONDS', 30),
    retryBackoff: true,
    retryDelayMax: intEnv('WHATSAPP_RETRY_DELAY_MAX_SECONDS', 600),
    // A single attempt is one ~10s Meta call plus one audit insert; if a
    // worker dies mid-job, the job becomes retryable after this long.
    expireInSeconds: intEnv('WHATSAPP_JOB_EXPIRE_SECONDS', 120),
    // Waiting (created/retry) jobs are dropped after 14 days.
    retentionSeconds: 14 * DAY,
    // Completed/failed jobs are kept 7 days for diagnosis, then purged.
    deleteAfterSeconds: 7 * DAY,
  };
}

const deadLetterQueueOptions = {
  // Nothing consumes the dead-letter queue: jobs wait there for inspection
  // or a manual redrive (scripts/whatsapp_dlq.ts) for up to 30 days.
  retentionSeconds: 30 * DAY,
  deleteAfterSeconds: 7 * DAY,
  retryLimit: 0,
};

/**
 * pg-boss needs a session-stable connection: it holds long-lived pool
 * connections and (optionally) LISTEN, which PgBouncer transaction pooling —
 * Neon's "-pooler" endpoint — does not support. So it uses Neon's direct
 * endpoint: QUEUE_DATABASE_URL if set, otherwise DATABASE_URL with the
 * "-pooler" host suffix removed. Same database either way.
 */
export function queueConnectionString(): string {
  const raw = process.env.QUEUE_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim() || config.databaseUrl;
  if (!raw) throw new Error('No database URL for the WhatsApp queue (set DATABASE_URL or QUEUE_DATABASE_URL)');
  const url = new URL(raw);
  if (!process.env.QUEUE_DATABASE_URL?.trim()) {
    url.hostname = url.hostname.replace('-pooler.', '.');
  }
  // pg treats sslmode=require as verify-full today and warns that this will
  // change; ask for verify-full explicitly so certificate checks stay on.
  if (url.searchParams.has('sslmode')) url.searchParams.set('sslmode', 'verify-full');
  return url.toString();
}

/** Host only — for logs; never the full URL (it contains the password). */
export function queueDatabaseHost(): string {
  return new URL(queueConnectionString()).hostname;
}

export function createBoss(role: 'api' | 'worker'): PgBoss {
  const boss = new PgBoss({
    connectionString: queueConnectionString(),
    schema: PGBOSS_SCHEMA,
    application_name: `craly-${role}-pgboss`,
    max: role === 'worker' ? 4 : 3,
    // Only the worker runs maintenance (expiring stuck jobs, purging old
    // ones per the retention settings above); the API just inserts jobs.
    supervise: role === 'worker',
    // How often that maintenance runs (pg-boss default 60s) — this is what
    // notices a job whose worker died and makes it retryable.
    superviseIntervalSeconds: intEnv('PGBOSS_SUPERVISE_INTERVAL_SECONDS', 60),
    // No cron. WhatsApp sends are event → queue → worker.
    schedule: false,
    migrate: true,
    createSchema: true,
  });
  // An 'error' event with no listener would crash the process.
  boss.on('error', (err) => console.error(`[pgboss:${role}] error:`, err instanceof Error ? err.message : err));
  return boss;
}

/** Creates the main + dead-letter queues if missing, and keeps their policy in sync with the code on every start. */
export async function ensureWhatsAppQueues(boss: PgBoss): Promise<void> {
  await boss.createQueue(WHATSAPP_DEAD_LETTER_QUEUE, deadLetterQueueOptions);
  await boss.updateQueue(WHATSAPP_DEAD_LETTER_QUEUE, deadLetterQueueOptions);
  const options = whatsappQueueOptions();
  await boss.createQueue(WHATSAPP_QUEUE, { ...options, deadLetter: WHATSAPP_DEAD_LETTER_QUEUE });
  await boss.updateQueue(WHATSAPP_QUEUE, { ...options, deadLetter: WHATSAPP_DEAD_LETTER_QUEUE });
}

// Fixed namespace for deriving job ids from idempotency keys (UUIDv5).
const JOB_ID_NAMESPACE = Buffer.from('6f1c2a8e4b7d4e0f9a3c5d2e1b0a9c8d', 'hex');

/**
 * Deterministic UUID (v5) for an idempotency key. pg-boss inserts jobs with
 * ON CONFLICT DO NOTHING on the id, so a second send() with the same key
 * returns null instead of creating a duplicate job.
 */
export function jobIdForKey(idempotencyKey: string): string {
  const hash = createHash('sha1').update(JOB_ID_NAMESPACE).update(idempotencyKey, 'utf8').digest();
  const b = Buffer.from(hash.subarray(0, 16));
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = b.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// ── API-side producer (one lazily-started pg-boss instance per process) ──────
let producer: Promise<PgBoss> | null = null;

function getProducer(): Promise<PgBoss> {
  if (!producer) {
    producer = (async () => {
      const boss = createBoss('api');
      await boss.start();
      await ensureWhatsAppQueues(boss);
      console.log(`[pgboss:api] producer ready (queue ${WHATSAPP_QUEUE}, db host ${queueDatabaseHost()}).`);
      return boss;
    })().catch((err) => {
      producer = null; // let the next enqueue try again
      throw err;
    });
  }
  return producer;
}

/**
 * Stores one WhatsApp job. Resolves with the job id, or null when a job with
 * the same idempotency key already exists (duplicate event). Throws only if
 * the database write itself fails.
 */
export async function enqueueWhatsAppJob(data: WhatsAppJobData): Promise<string | null> {
  const boss = await getProducer();
  return boss.send(WHATSAPP_QUEUE, data as unknown as object, { id: jobIdForKey(data.idempotencyKey) });
}

/** Called from the API's SIGTERM/SIGINT handler. */
export async function stopWhatsAppProducer(): Promise<void> {
  if (!producer) return;
  try {
    const boss = await producer;
    await boss.stop({ graceful: true, close: true, timeout: 5000 });
  } catch {
    // never started successfully — nothing to stop
  } finally {
    producer = null;
  }
}
