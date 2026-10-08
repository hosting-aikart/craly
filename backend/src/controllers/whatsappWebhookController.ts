import { Request, Response } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import sql from '../db/index';
import { maskPhoneNumber, recordWhatsAppEvent } from '../utils/whatsapp';

// Meta WhatsApp Cloud API webhook — delivery status for messages sent by
// utils/whatsapp.ts (sent / delivered / read / failed).
//
//   GET  /api/webhooks/whatsapp  subscription handshake (WHATSAPP_WEBHOOK_VERIFY_TOKEN)
//   POST /api/webhooks/whatsapp  event delivery, signed with the Meta app
//                                secret (X-Hub-Signature-256, WHATSAPP_APP_SECRET)
//
// Statuses are appended to platform_events (event_type 'whatsapp_status'),
// tied back to the Craly record via the 'whatsapp_sent' row that holds the
// same message id. Mounted in server.ts BEFORE express.json(), because the
// signature is computed over the exact raw request bytes.

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** GET — Meta calls this once when the webhook URL is saved in the app dashboard. */
export function verifyWhatsAppWebhook(req: Request, res: Response): void {
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim();
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (!verifyToken) {
    console.warn('[whatsapp-webhook] verification attempted but WHATSAPP_WEBHOOK_VERIFY_TOKEN is not set.');
    res.sendStatus(503);
    return;
  }
  if (mode === 'subscribe' && typeof token === 'string' && safeEqual(token, verifyToken) && typeof challenge === 'string') {
    res.status(200).type('text/plain').send(challenge);
    return;
  }
  res.sendStatus(403);
}

/** True when X-Hub-Signature-256 is a valid HMAC-SHA256 of the raw body under the app secret. */
export function isValidWhatsAppSignature(rawBody: Buffer, signatureHeader: string | undefined, appSecret: string): boolean {
  if (!signatureHeader?.startsWith('sha256=')) return false;
  const expected = `sha256=${createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
  return safeEqual(signatureHeader, expected);
}

interface MetaStatus {
  id: string;
  status: string;
  timestamp?: string;
  recipient_id?: string;
  errors?: { code?: number; title?: string; message?: string; error_data?: { details?: string } }[];
}

/** POST — status/message events. Always 200s a correctly-signed request, so Meta doesn't retry on our own processing errors. */
export async function receiveWhatsAppWebhook(req: Request, res: Response): Promise<void> {
  const appSecret = process.env.WHATSAPP_APP_SECRET?.trim();
  if (!appSecret) {
    // Fail closed — without the secret there's no way to tell Meta's
    // requests from anyone else's.
    console.warn('[whatsapp-webhook] event rejected — WHATSAPP_APP_SECRET is not set.');
    res.sendStatus(503);
    return;
  }

  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  if (!isValidWhatsAppSignature(rawBody, req.header('x-hub-signature-256'), appSecret)) {
    console.warn('[whatsapp-webhook] event rejected — invalid or missing X-Hub-Signature-256.');
    res.sendStatus(401);
    return;
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    res.sendStatus(400);
    return;
  }

  try {
    await processWebhookPayload(payload);
  } catch (err) {
    console.error('[whatsapp-webhook] processing failed:', err instanceof Error ? err.message : err);
  }
  res.sendStatus(200);
}

async function processWebhookPayload(payload: any): Promise<void> {
  if (payload?.object !== 'whatsapp_business_account') return;

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') continue;
      const value = change.value ?? {};

      for (const status of (value.statuses ?? []) as MetaStatus[]) {
        await recordStatus(status);
      }

      // Inbound messages (replies, "STOP") aren't handled yet — only counted,
      // never logged with content or sender number.
      const inbound = Array.isArray(value.messages) ? value.messages.length : 0;
      if (inbound > 0) {
        console.log(`[whatsapp-webhook] ${inbound} inbound message(s) received — inbound handling is not implemented.`);
      }
    }
  }
}

async function recordStatus(status: MetaStatus): Promise<void> {
  if (!status?.id || !status.status) return;

  const [sent] = await sql`
    SELECT entity_type, entity_id, user_id, metadata->>'template' AS template
    FROM platform_events
    WHERE event_type = 'whatsapp_sent' AND metadata->>'message_id' = ${status.id}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  // Meta can deliver the same status more than once.
  const [duplicate] = await sql`
    SELECT 1 FROM platform_events
    WHERE event_type = 'whatsapp_status'
      AND metadata->>'message_id' = ${status.id}
      AND metadata->>'status' = ${status.status}
    LIMIT 1
  `;
  if (duplicate) return;

  const errors = (status.errors ?? []).map((e) => ({
    code: e.code ?? null,
    title: e.title ?? null,
    details: e.error_data?.details ?? e.message ?? null,
  }));

  await recordWhatsAppEvent(
    'whatsapp_status',
    { entityType: sent?.entity_type ?? null, entityId: sent?.entity_id ?? null, userId: sent?.user_id ?? null },
    {
      message_id: status.id,
      status: status.status,
      template: sent?.template ?? null,
      to: status.recipient_id ? maskPhoneNumber(status.recipient_id) : null,
      meta_timestamp: status.timestamp ?? null,
      ...(errors.length > 0 && { errors }),
    },
  );

  const errorNote = errors.length > 0 ? ` — ${errors.map((e) => `${e.code}: ${e.title}`).join('; ')}` : '';
  console.log(`[whatsapp-webhook] ${sent?.template ?? 'message'} ${status.id} → ${status.status}${errorNote}${sent ? '' : ' (no matching whatsapp_sent record)'}`);
}
