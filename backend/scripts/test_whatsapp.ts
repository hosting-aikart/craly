import 'dotenv/config';
import {
  WHATSAPP_TEMPLATES,
  WhatsAppTemplateName,
  WhatsAppError,
  fetchWhatsAppTemplates,
  maskPhoneNumber,
  normalizeWhatsAppNumber,
  sendWhatsAppTemplate,
} from '../src/utils/whatsapp';

/**
 * Real Meta WhatsApp Cloud API checks — talks to graph.facebook.com using
 * the WHATSAPP_* values in backend/.env. Never prints the access token.
 * Does not read or write the Craly database.
 *
 * Usage (from backend/):
 *   npx ts-node --transpile-only scripts/test_whatsapp.ts check
 *       env vars + phone normalization + every template's Meta status/params
 *   npx ts-node --transpile-only scripts/test_whatsapp.ts send <phone> <template|all>
 *       sends real messages with the sample parameters below
 *
 * While the sender is Meta's test number, <phone> must be on the test
 * number's allowed recipient list (WhatsApp → API Setup → "To").
 */

// Sample values only — real sends from Craly take these from the database.
const SAMPLE_PARAMETERS: Record<WhatsAppTemplateName, string[]> = {
  contractor_welcome: ['Vishal Contractor'],
  contractor_verification_pending: ['Vishal Contractor'],
  contractor_verification_approved: ['Vishal Contractor'],
  contractor_verification_rejected: ['Vishal Contractor'],
  contractor_verification_needs_changes: ['Vishal Contractor'],
  kyc_document_reviewed: ['Vishal Contractor', 'PAN', 'Approved'],
  new_opportunity: ['Vishal Contractor', 'Welders for Pune Plant', 'Chakan, Pune', '25'],
  application_submitted: ['Vishal Contractor', 'Welders for Pune Plant'],
  application_selected: ['Vishal Contractor', 'Welders for Pune Plant'],
  application_rejected: ['Vishal Contractor', 'Welders for Pune Plant'],
  application_not_selected: ['Vishal Contractor', 'Welders for Pune Plant'],
  engagement_confirmed: ['Vishal Contractor', 'Welders for Pune Plant'],
  contractor_unlisted: ['Vishal Contractor', 'Documents expired'],
  contractor_relisted: ['Vishal Contractor'],
  new_application: ['Apex Manufacturing', 'Welders for Pune Plant'],
};

const LANGUAGE = 'en_US';

function describeEnv(name: string, showValue: boolean): string {
  const v = process.env[name];
  if (v === undefined) return 'UNSET';
  if (v.trim() === '') return 'EMPTY';
  return showValue ? `set = ${v}` : `set (${v.length} chars, value hidden)`;
}

async function check(): Promise<boolean> {
  let ok = true;
  console.log('== 1. Environment');
  for (const [name, show, required] of [
    ['WHATSAPP_API_VERSION', true, true],
    ['WHATSAPP_PHONE_NUMBER_ID', true, true],
    ['WHATSAPP_ACCESS_TOKEN', false, true],
    ['WHATSAPP_BUSINESS_ACCOUNT_ID', true, true],
    ['WHATSAPP_DEFAULT_COUNTRY_CODE', true, false],
    ['WHATSAPP_TEST_RECIPIENT', false, false],
    ['WHATSAPP_ENABLED', true, false],
    ['WHATSAPP_APP_SECRET', false, false],
    ['WHATSAPP_WEBHOOK_VERIFY_TOKEN', false, false],
  ] as const) {
    const state = describeEnv(name, show);
    if (required && (state === 'UNSET' || state === 'EMPTY')) ok = false;
    console.log(`  ${name.padEnd(32)} ${state}${required ? '' : ' (optional)'}`);
  }
  if (!ok) {
    console.log('\nRequired WhatsApp variables are missing — add them to backend/.env and re-run.');
    return false;
  }

  console.log('\n== 2. Phone normalization');
  for (const sample of ['8793964438', '+91 87939 64438', '918793964438']) {
    const n = normalizeWhatsAppNumber(sample);
    console.log(`  ${sample.padEnd(18)} → ${maskPhoneNumber(n)} (${n.length} digits)`);
  }

  console.log('\n== 3. Templates on the WhatsApp Business Account');
  let templates;
  try {
    templates = await fetchWhatsAppTemplates();
  } catch (err) {
    console.log(`  FAILED to list templates: ${err instanceof Error ? err.message : err}`);
    return false;
  }
  console.log(`  ${templates.length} template(s) found on the account: ${templates.map((t) => `${t.name}[${t.language}:${t.status}]`).join(', ') || '(none)'}`);

  console.log('\n== 4. Craly templates vs Meta');
  for (const [name, spec] of Object.entries(WHATSAPP_TEMPLATES)) {
    const match = templates.find((t) => t.name === name && t.language === LANGUAGE);
    const otherLangs = templates.filter((t) => t.name === name && t.language !== LANGUAGE).map((t) => t.language);
    if (!match) {
      ok = false;
      console.log(`  MISSING   ${name} (${LANGUAGE})${otherLangs.length ? ` — exists only in: ${otherLangs.join(', ')}` : ''}`);
      continue;
    }
    const body = match.components.find((c) => c.type === 'BODY')?.text ?? '';
    const metaParams = new Set(body.match(/\{\{\d+\}\}/g) ?? []).size;
    const buttons = match.components.find((c) => c.type === 'BUTTONS')?.buttons ?? [];
    const dynamicUrl = buttons.some((b) => b.type === 'URL' && b.url?.includes('{{'));
    const expectedButton = 'staticUrlButton' in spec ? spec.staticUrlButton : undefined;
    const buttonUrls = buttons.filter((b) => b.type === 'URL').map((b) => (b.url ?? '').replace(/\/$/, ''));
    const problems = [
      expectedButton && !buttonUrls.includes(expectedButton.replace(/\/$/, '')) && `expected URL button ${expectedButton}`,
      match.status !== 'APPROVED' && `status ${match.status}`,
      metaParams !== spec.bodyParams && `body has ${metaParams} params, code sends ${spec.bodyParams}`,
      dynamicUrl && 'has a dynamic URL button (code sends no button parameters)',
    ].filter(Boolean);
    if (problems.length) ok = false;
    console.log(`  ${problems.length ? 'PROBLEM ' : 'OK      '}  ${name} — ${match.status}, ${match.category}, ${metaParams} body param(s)`
      + `${buttons.length ? `, buttons: ${buttons.map((b) => `${b.type}${b.url ? ` ${b.url}` : ''}`).join(' | ')}` : ''}`
      + `${problems.length ? ` → ${problems.join('; ')}` : ''}`);
  }
  return ok;
}

async function send(phone: string, which: string): Promise<boolean> {
  const names = which === 'all'
    ? (Object.keys(WHATSAPP_TEMPLATES) as WhatsAppTemplateName[])
    : [which as WhatsAppTemplateName];
  if (names.some((n) => !(n in WHATSAPP_TEMPLATES))) {
    console.error(`Unknown template "${which}". Known: ${Object.keys(WHATSAPP_TEMPLATES).join(', ')}, all`);
    return false;
  }

  const to = normalizeWhatsAppNumber(phone);
  console.log(`Recipient ${maskPhoneNumber(to)} · language ${LANGUAGE} · API ${process.env.WHATSAPP_API_VERSION} · phone number id ${process.env.WHATSAPP_PHONE_NUMBER_ID}\n`);

  let allOk = true;
  for (const name of names) {
    const parameters = SAMPLE_PARAMETERS[name];
    try {
      const result = await sendWhatsAppTemplate({ to: phone, templateName: name, languageCode: LANGUAGE, parameters });
      console.log(`ACCEPTED  ${name.padEnd(38)} params=${JSON.stringify(parameters)} wa_id=${maskPhoneNumber(result.contacts?.[0]?.wa_id ?? '')} message_id=${result.messages[0].id} message_status=${result.messages[0].message_status ?? 'n/a'}`);
    } catch (err) {
      allOk = false;
      const e = err as WhatsAppError;
      console.log(`FAILED    ${name.padEnd(38)} params=${JSON.stringify(parameters)} ${e.message}`
        + `${e.metaCode !== undefined ? ` [code ${e.metaCode}${e.metaSubcode ? `/${e.metaSubcode}` : ''}]` : ''}`
        + `${e.fbtraceId ? ` [fbtrace_id ${e.fbtraceId}]` : ''}`);
    }
  }
  console.log('\n"ACCEPTED" means Meta accepted the message (HTTP 200 + message id). Delivery is only confirmed by the webhook status or by the phone itself.');
  return allOk;
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  let ok: boolean;
  if (command === 'check') {
    ok = await check();
  } else if (command === 'send' && args.length === 2) {
    ok = await send(args[0], args[1]);
  } else {
    console.error('Usage:\n  ts-node scripts/test_whatsapp.ts check\n  ts-node scripts/test_whatsapp.ts send <phone> <template|all>');
    process.exit(2);
  }
  process.exit(ok ? 0 : 1);
}

main();
