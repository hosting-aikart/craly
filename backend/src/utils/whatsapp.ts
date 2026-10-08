import sql from '../db/index';
import { enqueueWhatsAppJob, type WhatsAppJobData } from '../queue/whatsappQueue';

// Meta WhatsApp Cloud API — server-side only. Reads its credentials from
// process.env at call time (like utils/sms.ts) so nothing here is ever
// bundled into, or reachable from, frontend code. The access token is only
// ever placed in the Authorization header — it is never logged or included
// in any thrown error message.
//
// Three layers:
//   sendWhatsAppTemplate()   — one Graph API call; throws WhatsAppError.
//   queueWhatsAppTemplate()  — API side (via ./whatsappNotifications.ts):
//                              writes a durable pg-boss job to Postgres.
//                              Never throws.
//   processWhatsAppJob()     — worker side (src/worker.ts): sends one job and
//                              decides complete / retry / dead-letter.

const DEFAULT_GRAPH_API_BASE_URL = 'https://graph.facebook.com';
const REQUEST_TIMEOUT_MS = 10_000;
// Must equal the language the templates are approved in on the WABA — Meta
// matches it exactly ("en" and "en_US" are different template languages;
// a mismatch fails with error 132001).
export const DEFAULT_LANGUAGE_CODE = 'en';

/**
 * Every template Craly sends, with the number of body parameters the
 * approved Meta template expects ({{1}}..{{n}}). Sending a different count
 * is rejected locally rather than burning a Meta call on error 132000.
 * Static URL buttons (e.g. contractor_welcome's "Visit website" →
 * https://craly.co) need no parameters at send time, so they don't appear
 * here. `staticUrlButton` records the URL the approved template is expected
 * to carry; scripts/test_whatsapp.ts check compares it against Meta.
 */
export const WHATSAPP_TEMPLATES = {
  contractor_welcome: { bodyParams: 1, staticUrlButton: 'https://craly.co' },
  contractor_verification_pending: { bodyParams: 1 },
  contractor_verification_approved: { bodyParams: 1 },
  contractor_verification_rejected: { bodyParams: 1 },
  contractor_verification_needs_changes: { bodyParams: 1 },
  kyc_document_reviewed: { bodyParams: 3 },
  new_opportunity: { bodyParams: 4 },
  application_submitted: { bodyParams: 2 },
  application_selected: { bodyParams: 2 },
  application_rejected: { bodyParams: 2 },
  application_not_selected: { bodyParams: 2 },
  engagement_confirmed: { bodyParams: 2 },
  contractor_unlisted: { bodyParams: 2 },
  contractor_relisted: { bodyParams: 1 },
  new_application: { bodyParams: 2 },
} as const;

export type WhatsAppTemplateName = keyof typeof WHATSAPP_TEMPLATES;

export interface SendWhatsAppTemplateInput {
  /** Recipient phone number. Any formatting is accepted; it is reduced to digits (E.164 without the "+"). */
  to: string;
  /** Name of an approved template in WhatsApp Manager, e.g. "application_selected". */
  templateName: string;
  /** Template language code, e.g. "en". Must match the approved template's language exactly. */
  languageCode: string;
  /** Values for the template body placeholders, in order: parameters[0] → {{1}}, parameters[1] → {{2}}, ... */
  parameters?: string[];
}

/** Successful response shape from POST /{phone-number-id}/messages. */
export interface WhatsAppSendResponse {
  messaging_product: 'whatsapp';
  contacts: { input: string; wa_id: string }[];
  messages: { id: string; message_status?: string }[];
}

/**
 * What went wrong, which decides whether a queued job is retried:
 *   config     — WHATSAPP_* env missing (retryable: ops can fix it)
 *   validation — bad phone / parameters / template name (permanent)
 *   network    — timeout, DNS, connection reset (retryable)
 *   api        — Meta returned non-2xx (see isRetryableWhatsAppError)
 *   response   — Meta returned 2xx without a message id (permanent: Meta
 *                may have accepted it, a retry could double-send)
 */
export type WhatsAppErrorKind = 'config' | 'validation' | 'network' | 'api' | 'response';

/**
 * Thrown for every WhatsApp failure. Carries Meta's error details (code,
 * fbtrace_id) when available so failures can be diagnosed from logs.
 */
export class WhatsAppError extends Error {
  readonly kind: WhatsAppErrorKind;
  readonly httpStatus?: number;
  readonly metaCode?: number;
  readonly metaSubcode?: number;
  readonly fbtraceId?: string;

  constructor(
    message: string,
    kind: WhatsAppErrorKind,
    details: { httpStatus?: number; metaCode?: number; metaSubcode?: number; fbtraceId?: string } = {},
  ) {
    super(message);
    this.name = 'WhatsAppError';
    this.kind = kind;
    this.httpStatus = details.httpStatus;
    this.metaCode = details.metaCode;
    this.metaSubcode = details.metaSubcode;
    this.fbtraceId = details.fbtraceId;
  }
}

// Plain-language hints for the Meta error codes this integration is most
// likely to hit, appended to WhatsAppError messages so a log line says what
// to fix, not just a number.
const META_ERROR_HINTS: Record<number, string> = {
  190: 'access token is invalid or expired — generate a new one',
  100: 'invalid parameter in the request',
  131030: 'recipient is not in the allowed list — add it as a test recipient in WhatsApp → API Setup',
  131026: 'message undeliverable — the number may not be on WhatsApp',
  132000: 'parameter count does not match the approved template',
  132001: 'template does not exist in this language, or is not approved yet',
  132012: 'parameter format does not match the approved template',
  132015: 'template is paused due to low quality',
  132016: 'template is disabled',
  133010: 'sender phone number is not registered with the Cloud API',
  130429: 'Cloud API throughput limit reached',
  131056: 'too many messages to this recipient in a short time',
};

// Meta error codes that are temporary — worth retrying with backoff. 190
// (token expired) is included because it's fixed by ops, not by changing the
// message; everything else 4xx (template missing, recipient not allowed,
// bad parameter) would fail identically on every retry.
const RETRYABLE_META_CODES = new Set([1, 2, 4, 190, 80007, 130429, 131000, 131016, 131056, 133004]);

export function isRetryableWhatsAppError(err: unknown): boolean {
  if (!(err instanceof WhatsAppError)) return true; // unknown bug/DB blip — let the retry policy handle it
  switch (err.kind) {
    case 'config':
    case 'network':
      return true;
    case 'validation':
    case 'response':
      return false;
    case 'api':
      if (err.metaCode !== undefined && RETRYABLE_META_CODES.has(err.metaCode)) return true;
      return err.httpStatus === undefined || err.httpStatus >= 500 || err.httpStatus === 429;
  }
}

interface WhatsAppCredentials {
  apiVersion: string;
  phoneNumberId: string;
  accessToken: string;
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_API_VERSION && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN,
  );
}

/** WHATSAPP_ENABLED=false stops new jobs being queued and makes the worker complete queued ones without sending. */
export function isWhatsAppEnabled(): boolean {
  return (process.env.WHATSAPP_ENABLED ?? 'true').trim().toLowerCase() !== 'false';
}

/**
 * graph.facebook.com, unless WHATSAPP_GRAPH_API_BASE_URL points somewhere
 * else — used only by the automated tests to aim the worker at a local mock
 * Meta server. Ignored when NODE_ENV=production so the access token can
 * never be sent to a non-Meta host in production.
 */
function graphBaseUrl(): string {
  const override = process.env.WHATSAPP_GRAPH_API_BASE_URL?.trim();
  if (override && process.env.NODE_ENV !== 'production') return override.replace(/\/$/, '');
  return DEFAULT_GRAPH_API_BASE_URL;
}

function getCredentials(): WhatsAppCredentials {
  const apiVersion = process.env.WHATSAPP_API_VERSION?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();

  const missing = [
    !apiVersion && 'WHATSAPP_API_VERSION',
    !phoneNumberId && 'WHATSAPP_PHONE_NUMBER_ID',
    !accessToken && 'WHATSAPP_ACCESS_TOKEN',
  ].filter(Boolean);
  if (missing.length > 0) {
    throw new WhatsAppError(`WhatsApp is not configured (missing ${missing.join(', ')})`, 'config');
  }

  return { apiVersion: apiVersion!, phoneNumberId: phoneNumberId!, accessToken: accessToken! };
}

/**
 * Reduces a stored phone number to the digits-only international form Meta
 * expects ("+91 98765-43210" → "919876543210"). A bare 10-digit national
 * number (signup doesn't require a country code) gets
 * WHATSAPP_DEFAULT_COUNTRY_CODE prepended — 91 (India) if unset.
 */
export function normalizeWhatsAppNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) {
    const countryCode = (process.env.WHATSAPP_DEFAULT_COUNTRY_CODE ?? '91').replace(/\D/g, '');
    return `${countryCode}${digits}`;
  }
  return digits;
}

/**
 * Meta rejects template text parameters containing newlines, tabs, or more
 * than four consecutive spaces (error 132018), so collapse all whitespace.
 */
function sanitizeParameter(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

async function readJsonBody(response: Response): Promise<{ raw: string; body: any }> {
  const raw = await response.text().catch(() => '');
  try {
    return { raw, body: raw ? JSON.parse(raw) : null };
  } catch {
    return { raw, body: null };
  }
}

function toWhatsAppError(response: Response, body: any): WhatsAppError {
  // Meta's error envelope: { error: { message, type, code, error_subcode, error_data: { details }, fbtrace_id } }
  const metaError = body?.error;
  const detail = metaError?.error_data?.details || metaError?.message || response.statusText || 'Unknown error';
  const hint = typeof metaError?.code === 'number' ? META_ERROR_HINTS[metaError.code] : undefined;
  return new WhatsAppError(`WhatsApp API error (HTTP ${response.status}): ${detail}${hint ? ` — ${hint}` : ''}`, 'api', {
    httpStatus: response.status,
    metaCode: metaError?.code,
    metaSubcode: metaError?.error_subcode,
    fbtraceId: metaError?.fbtrace_id,
  });
}

async function graphFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (err) {
    const reason = err instanceof Error && err.name === 'TimeoutError'
      ? `timed out after ${REQUEST_TIMEOUT_MS}ms`
      : err instanceof Error ? err.message : String(err);
    throw new WhatsAppError(`WhatsApp request failed: ${reason}`, 'network');
  }
}

/**
 * Sends an approved WhatsApp message template via the Meta Graph API:
 *   POST https://graph.facebook.com/{WHATSAPP_API_VERSION}/{WHATSAPP_PHONE_NUMBER_ID}/messages
 *
 * Resolves with Meta's response (including the WhatsApp message id) on a
 * 2xx; throws WhatsAppError on anything else. Note a 2xx means Meta accepted
 * the message, not that it was delivered — delivery status arrives later via
 * the webhook (see controllers/whatsappWebhookController.ts).
 */
export async function sendWhatsAppTemplate(input: SendWhatsAppTemplateInput): Promise<WhatsAppSendResponse> {
  const { apiVersion, phoneNumberId, accessToken } = getCredentials();

  const to = normalizeWhatsAppNumber(input.to ?? '');
  if (!/^[0-9]{8,15}$/.test(to)) {
    throw new WhatsAppError('Recipient phone number is missing or invalid', 'validation');
  }
  const templateName = input.templateName?.trim();
  if (!templateName) {
    throw new WhatsAppError('Template name is required', 'validation');
  }
  if (!input.languageCode?.trim()) {
    throw new WhatsAppError('Template language code is required', 'validation');
  }

  const parameters = (input.parameters ?? []).map((p) => sanitizeParameter(String(p ?? '')));
  const emptyIndex = parameters.findIndex((p) => p.length === 0);
  if (emptyIndex !== -1) {
    throw new WhatsAppError(`Template parameter {{${emptyIndex + 1}}} is empty`, 'validation');
  }
  const known = WHATSAPP_TEMPLATES[templateName as WhatsAppTemplateName];
  if (known && parameters.length !== known.bodyParams) {
    throw new WhatsAppError(
      `Template "${templateName}" expects ${known.bodyParams} parameter(s), got ${parameters.length}`,
      'validation',
    );
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: input.languageCode.trim() },
      ...(parameters.length > 0 && {
        components: [
          {
            type: 'body',
            parameters: parameters.map((text) => ({ type: 'text', text })),
          },
        ],
      }),
    },
  };

  const url = `${graphBaseUrl()}/${encodeURIComponent(apiVersion)}/${encodeURIComponent(phoneNumberId)}/messages`;
  const response = await graphFetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const { body } = await readJsonBody(response);
  if (!response.ok) {
    throw toWhatsAppError(response, body);
  }
  if (!body?.messages?.[0]?.id) {
    throw new WhatsAppError('WhatsApp API returned an unexpected response (no message id)', 'response', {
      httpStatus: response.status,
    });
  }

  return body as WhatsAppSendResponse;
}

export interface WhatsAppTemplateInfo {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
  components: { type: string; text?: string; buttons?: { type: string; text?: string; url?: string }[] }[];
}

/**
 * Lists the message templates on the WhatsApp Business Account
 * (WHATSAPP_BUSINESS_ACCOUNT_ID) — used by scripts/test_whatsapp.ts to check
 * that every template in WHATSAPP_TEMPLATES exists and is APPROVED.
 */
export async function fetchWhatsAppTemplates(): Promise<WhatsAppTemplateInfo[]> {
  const { apiVersion, accessToken } = getCredentials();
  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim();
  if (!wabaId) {
    throw new WhatsAppError('WhatsApp is not configured (missing WHATSAPP_BUSINESS_ACCOUNT_ID)', 'config');
  }

  const templates: WhatsAppTemplateInfo[] = [];
  let url: string | undefined =
    `${graphBaseUrl()}/${encodeURIComponent(apiVersion)}/${encodeURIComponent(wabaId)}/message_templates`
    + '?fields=id,name,language,status,category,components&limit=100';

  while (url) {
    const response = await graphFetch(url, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } });
    const { body } = await readJsonBody(response);
    if (!response.ok) {
      throw toWhatsAppError(response, body);
    }
    if (!Array.isArray(body?.data)) {
      throw new WhatsAppError('WhatsApp API returned an unexpected template list response', 'response');
    }
    templates.push(...body.data);
    url = body.paging?.next;
  }
  return templates;
}

/** "919876543210" → "91******3210" — for logs, so full numbers aren't written out. */
export function maskPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 6) return '***';
  return `${digits.slice(0, 2)}${'*'.repeat(digits.length - 6)}${digits.slice(-4)}`;
}

/** What a queued message is about — written to platform_events so sends are auditable and webhook statuses can be tied back to a Craly record. */
export interface WhatsAppContext {
  entityType: string;
  entityId: string;
  /** Recipient's users.id, when the recipient has a login. */
  userId?: string | null;
}

export interface QueueWhatsAppTemplateInput {
  to: string | null | undefined;
  template: WhatsAppTemplateName;
  parameters: string[];
  context: WhatsAppContext;
  /**
   * Identifies the business event this message is for, e.g.
   * "application_selected:<application id>:<updated_at>". The same key always
   * maps to the same pg-boss job id, so enqueuing the same event twice
   * creates one job.
   */
  idempotencyKey: string;
}

/**
 * API side: writes the message as a durable pg-boss job in Postgres and
 * returns once it is stored (so an API restart right after the response
 * can't lose it). Never throws — the Craly operation that triggered it has
 * already succeeded, and a queueing failure is logged rather than turning
 * that success into an error.
 */
export async function queueWhatsAppTemplate(input: QueueWhatsAppTemplateInput): Promise<void> {
  const { template, context } = input;

  if (!isWhatsAppEnabled()) {
    console.log(`[whatsapp] ${template} not queued — WHATSAPP_ENABLED=false.`);
    return;
  }
  if (!isWhatsAppConfigured()) {
    console.warn(`[whatsapp] ${template} not queued — WHATSAPP_* env vars are not set.`);
    return;
  }
  if (!input.to?.trim()) {
    console.warn(`[whatsapp] ${template} not queued — recipient has no phone number on file (${context.entityType} ${context.entityId}).`);
    return;
  }

  const data: WhatsAppJobData = {
    template,
    languageCode: DEFAULT_LANGUAGE_CODE,
    to: input.to,
    parameters: input.parameters,
    context: { entityType: context.entityType, entityId: context.entityId, userId: context.userId ?? null },
    idempotencyKey: input.idempotencyKey,
    queuedAt: new Date().toISOString(),
  };

  try {
    const jobId = await enqueueWhatsAppJob(data);
    if (jobId) {
      console.log(`[whatsapp] ${template} queued (job ${jobId}) for ${maskPhoneNumber(normalizeWhatsAppNumber(input.to))}.`);
    } else {
      console.log(`[whatsapp] ${template} already queued for this event — duplicate skipped (${input.idempotencyKey}).`);
    }
  } catch (err) {
    console.error(`[whatsapp] ${template} could NOT be queued (${input.idempotencyKey}):`, err instanceof Error ? err.message : err);
  }
}

export type WhatsAppJobOutcome =
  | { status: 'completed'; output: Record<string, unknown> }
  | { status: 'failed'; output: Record<string, unknown> }
  | { status: 'deadletter'; output: Record<string, unknown> };

/**
 * Worker side: sends one queued job and decides what pg-boss does with it.
 *   completed  — Meta accepted it (or WhatsApp is switched off)
 *   failed     — temporary error; pg-boss retries with backoff, and moves
 *                it to the dead-letter queue once retries run out
 *   deadletter — permanent error; straight to the dead-letter queue
 * Never throws.
 */
export async function processWhatsAppJob(
  data: WhatsAppJobData,
  attempt: { jobId: string; retryCount: number; retryLimit: number },
): Promise<WhatsAppJobOutcome> {
  const { template, context } = data;
  const attemptLabel = `attempt ${attempt.retryCount + 1}/${attempt.retryLimit + 1}`;

  if (!isWhatsAppEnabled()) {
    console.log(`[whatsapp-worker] job ${attempt.jobId} ${template} completed without sending — WHATSAPP_ENABLED=false.`);
    return { status: 'completed', output: { skipped: 'WHATSAPP_ENABLED=false' } };
  }

  // WHATSAPP_TEST_RECIPIENT redirects every send to one number — for
  // running against a database with real contractors' phone numbers while
  // the Meta test number is configured.
  const testRecipient = process.env.WHATSAPP_TEST_RECIPIENT?.trim();
  const to = testRecipient || data.to;
  const masked = maskPhoneNumber(normalizeWhatsAppNumber(to));
  const redirectNote = testRecipient ? ` (redirected from ${maskPhoneNumber(normalizeWhatsAppNumber(data.to))} by WHATSAPP_TEST_RECIPIENT)` : '';

  try {
    const result = await sendWhatsAppTemplate({
      to,
      templateName: template,
      languageCode: data.languageCode,
      parameters: data.parameters,
    });
    const messageId = result.messages[0].id;
    console.log(`[whatsapp-worker] job ${attempt.jobId} ${template} accepted by Meta for ${masked}${redirectNote} (message id ${messageId}, ${attemptLabel}).`);
    await recordWhatsAppEvent('whatsapp_sent', context, {
      template,
      message_id: messageId,
      to: masked,
      redirected: Boolean(testRecipient),
      job_id: attempt.jobId,
      idempotency_key: data.idempotencyKey,
      attempt: attempt.retryCount + 1,
    });
    return { status: 'completed', output: { messageId, to: masked, attempt: attempt.retryCount + 1 } };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const retryable = isRetryableWhatsAppError(err);
    const lastAttempt = attempt.retryCount >= attempt.retryLimit;
    const metaDetails = err instanceof WhatsAppError
      ? { kind: err.kind, http_status: err.httpStatus ?? null, meta_code: err.metaCode ?? null, fbtrace_id: err.fbtraceId ?? null }
      : { kind: 'unexpected' };
    const output = { error: message, retryable, attempt: attempt.retryCount + 1, ...metaDetails };

    if (retryable && !lastAttempt) {
      console.warn(`[whatsapp-worker] job ${attempt.jobId} ${template} to ${masked}${redirectNote} failed (${attemptLabel}), will retry: ${message}`);
      return { status: 'failed', output };
    }

    const reason = retryable ? 'retries exhausted' : 'permanent error';
    console.error(`[whatsapp-worker] job ${attempt.jobId} ${template} to ${masked}${redirectNote} dead-lettered (${reason}, ${attemptLabel}): ${message}`);
    await recordWhatsAppEvent('whatsapp_failed', context, {
      template,
      to: masked,
      redirected: Boolean(testRecipient),
      job_id: attempt.jobId,
      idempotency_key: data.idempotencyKey,
      reason,
      ...output,
    });
    // Retryable-but-exhausted goes back as 'failed' (pg-boss dead-letters it
    // because retries are used up); permanent goes as 'deadletter' to skip
    // the remaining retries.
    return { status: retryable ? 'failed' : 'deadletter', output: { ...output, reason } };
  }
}

/**
 * Appends to platform_events (the existing analytics/event table — see
 * migrations/1787400000000_admin_workspace_tables.cjs) rather than a new
 * table. Never throws: an audit-write failure is logged, not propagated.
 */
export async function recordWhatsAppEvent(
  eventType: 'whatsapp_sent' | 'whatsapp_failed' | 'whatsapp_status',
  context: { entityType: string | null; entityId: string | null; userId?: string | null },
  metadata: Record<string, unknown>,
): Promise<void> {
  try {
    await sql`
      INSERT INTO platform_events (event_type, user_id, entity_type, entity_id, metadata)
      VALUES (${eventType}, ${context.userId ?? null}, ${context.entityType}, ${context.entityId}, ${sql.json(metadata as any)})
    `;
  } catch (err) {
    console.error(`[whatsapp] failed to record ${eventType} in platform_events:`, err instanceof Error ? err.message : err);
  }
}
