import 'dotenv/config';
import { createBoss, WHATSAPP_QUEUE, WHATSAPP_DEAD_LETTER_QUEUE } from '../src/queue/whatsappQueue';
import { maskPhoneNumber, normalizeWhatsAppNumber } from '../src/utils/whatsapp';

/**
 * Inspect / replay WhatsApp jobs that ended up in the dead-letter queue
 * (permanent Meta errors, or 5 failed attempts). Jobs stay there up to 30
 * days. Phone numbers are masked in the output.
 *
 * Usage (from backend/):
 *   npx ts-node --transpile-only scripts/whatsapp_dlq.ts list
 *   npx ts-node --transpile-only scripts/whatsapp_dlq.ts redrive <dead-letter job id> [...more ids]
 *   npx ts-node --transpile-only scripts/whatsapp_dlq.ts redrive --all
 *
 * Redrive moves the job back to the main queue, where the worker sends it
 * again with a fresh set of 5 attempts. Fix the cause first (template,
 * recipient allow-list, token) or it will just fail again.
 */
async function main() {
  const [command, ...args] = process.argv.slice(2);
  const boss = createBoss('api');
  await boss.start();
  try {
    if (command === 'list') {
      const jobs = await boss.findJobs<any>(WHATSAPP_DEAD_LETTER_QUEUE, { queued: true });
      console.log(`${jobs.length} job(s) in ${WHATSAPP_DEAD_LETTER_QUEUE}:`);
      for (const j of jobs) {
        const out = (j.sourceOutput ?? {}) as Record<string, unknown>;
        console.log([
          j.id,
          j.data?.template,
          j.data?.to ? maskPhoneNumber(normalizeWhatsAppNumber(j.data.to)) : '-',
          `${j.data?.context?.entityType ?? '?'} ${j.data?.context?.entityId ?? '?'}`,
          `attempts ${(j.sourceRetryCount ?? 0) + 1}`,
          `queued ${j.data?.queuedAt ?? '?'}`,
          `error: ${out.error ?? JSON.stringify(out)}`,
        ].join(' | '));
      }
    } else if (command === 'redrive' && args.length > 0) {
      const options = args[0] === '--all' ? {} : { ids: args };
      const moved = await boss.redrive(WHATSAPP_DEAD_LETTER_QUEUE, { ...options, destination: WHATSAPP_QUEUE });
      console.log(`Redrove ${moved} job(s) back to ${WHATSAPP_QUEUE}.`);
    } else {
      console.error('Usage: whatsapp_dlq.ts list | redrive <id...> | redrive --all');
      process.exitCode = 2;
    }
  } finally {
    await boss.stop({ graceful: false, close: true });
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
