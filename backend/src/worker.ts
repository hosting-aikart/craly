import config from './config/index';
import sql from './db/index';
import { createBoss, ensureWhatsAppQueues, queueDatabaseHost, WHATSAPP_QUEUE, WHATSAPP_DEAD_LETTER_QUEUE } from './queue/whatsappQueue';
import type { WhatsAppJobData } from './queue/whatsappQueue';
import type { JobWithMetadata } from 'pg-boss';
import { processWhatsAppJob, isWhatsAppConfigured } from './utils/whatsapp';

// Craly background worker — a separate process from the Express API (see
// ecosystem.config.js). Pulls WhatsApp jobs from pg-boss and sends them via
// the existing sendWhatsAppTemplate(). Run with `npm run worker` (built) or
// `npm run worker:dev`.

function intEnv(name: string, fallback: number): number {
  const value = parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const CONCURRENCY = intEnv('WHATSAPP_WORKER_CONCURRENCY', 2);
const POLLING_INTERVAL_SECONDS = Math.max(0.5, Number(process.env.WHATSAPP_WORKER_POLL_SECONDS) || 2);
const SHUTDOWN_TIMEOUT_MS = 30_000;

async function main(): Promise<void> {
  const boss = createBoss('worker');
  await boss.start();
  await ensureWhatsAppQueues(boss);

  await boss.work(
    WHATSAPP_QUEUE,
    {
      batchSize: 1,
      localConcurrency: CONCURRENCY,
      pollingIntervalSeconds: POLLING_INTERVAL_SECONDS,
      includeMetadata: true,
      // Lets the handler choose completed / failed (retry) / deadletter
      // (skip remaining retries) per job instead of only throw-or-return.
      perJobResults: true,
    },
    async (jobs: JobWithMetadata<WhatsAppJobData>[]) => {
      const results = [];
      for (const job of jobs) {
        const outcome = await processWhatsAppJob(job.data, {
          jobId: job.id,
          retryCount: job.retryCount,
          retryLimit: job.retryLimit,
        });
        results.push({ id: job.id, status: outcome.status, output: outcome.output } as const);
      }
      return results;
    },
  );

  console.log(
    `[worker] started — queue ${WHATSAPP_QUEUE} (dead letter ${WHATSAPP_DEAD_LETTER_QUEUE}), concurrency ${CONCURRENCY}, `
      + `poll ${POLLING_INTERVAL_SECONDS}s, db host ${queueDatabaseHost()}, env ${config.nodeEnv}`
      + `${isWhatsAppConfigured() ? '' : ' — WARNING: WHATSAPP_* not set, jobs will fail and retry'}.`,
  );

  let stopping = false;
  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    console.log(`[worker] ${signal} received — no new jobs; finishing in-flight jobs (up to ${SHUTDOWN_TIMEOUT_MS / 1000}s).`);
    try {
      // graceful: stop fetching, wait for active handlers, then close the pool.
      await boss.stop({ graceful: true, close: true, timeout: SHUTDOWN_TIMEOUT_MS });
      await sql.end({ timeout: 5 });
      console.log('[worker] stopped cleanly.');
      process.exit(0);
    } catch (err) {
      console.error('[worker] error during shutdown:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[worker] failed to start:', err instanceof Error ? err.message : err);
  process.exit(1);
});
