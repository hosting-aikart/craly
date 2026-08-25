import config, { isMsg91Configured } from '../config/index';

const MSG91_WIDGET_SEND_URL = 'https://api.msg91.com/api/v5/widget/sendOtp';
const MSG91_WIDGET_VERIFY_URL = 'https://api.msg91.com/api/v5/widget/verifyOtp';

export interface SendPhoneOtpResult {
  /** Opaque request handle MSG91 returns from sendOtp — not secret, not the
   *  OTP itself. Must be stored and passed back into verifyPhoneOtp. */
  reqId: string;
}

/**
 * Phone OTP delivery + verification via MSG91's OTP Widget REST API
 * (POST /api/v5/widget/sendOtp, /api/v5/widget/verifyOtp — authenticated by
 * `tokenAuth` in the JSON body alongside `widgetId`, NOT the account
 * `authkey` header the old /api/v5/otp flow used; confirmed empirically —
 * the `authkey` header alone returns `AuthenticationFailure` on these widget
 * endpoints. Called entirely server-to-server; there is no client-side
 * widget SDK anywhere in this app, and the frontend never talks to MSG91
 * directly). This uses the widget's default SMS template, which
 * MSG91 provisions without DLT registration — unlike the old /api/v5/otp
 * flow, no MSG91_TEMPLATE_ID is configured or needed.
 *
 * IMPORTANT TRUST-MODEL NOTE: this is a real shift from how email OTP still
 * works (see utils/otp.ts + authController.ts, unchanged). For phone, MSG91
 * generates the 4-digit code on its own servers (per the widget's dashboard
 * config — 4 digits, India, default template) and is the sole authority on
 * whether a submitted code is correct; this app never sees the plaintext
 * code and has nothing to hash or compare locally for phone. What this app
 * still owns: the `auth_verifications`/`users.is_phone_verified` row, the
 * local 10-minute expiry gate, the 5-attempt cap, the OTP resend/rate
 * limiter, and the requirement (in authController.signup) that both the
 * email and phone rows be verified before an account is created — MSG91's
 * verifyOtp response is only the single fact that flips the phone row's
 * `verified` column.
 *
 * Production never falls back to auto-accepting a code: if MSG91 isn't
 * configured, sendPhoneOtp throws and the caller (authController.sendSignupOtp)
 * surfaces a clear failure rather than pretending the SMS went out. The dev
 * fallback below only ever runs in non-production when MSG91_AUTH_KEY/
 * MSG91_WIDGET_ID are missing entirely — since there's no way to fake an
 * MSG91-generated code locally, dev fallback mode accepts any 4-digit
 * numeric input instead (see verifyPhoneOtp) so the rest of the signup flow
 * stays testable without live MSG91 credentials. A genuine send/verify
 * failure against a real, configured MSG91 account always throws/returns
 * false, in every environment.
 */
export async function sendPhoneOtp(phone: string): Promise<SendPhoneOtpResult> {
  // MSG91 expects the mobile number as country-code + number, digits
  // only — no leading '+', spaces, or punctuation (e.g. "919876543210").
  const identifier = phone.trim().replace(/[^0-9]/g, '');

  if (!isMsg91Configured) {
    if (config.nodeEnv === 'production') {
      throw new Error('SMS service is not configured (MSG91_AUTH_KEY / MSG91_WIDGET_ID is missing)');
    }
    console.warn('[sms] DEV MODE: MSG91 widget not configured — skipping real SMS send.');
    console.log(`[DEV SMS OTP] To: ${identifier}  (dev fallback: any 4-digit code will verify)`);
    return { reqId: 'DEV_NO_MSG91' };
  }

  let response: Response;
  try {
    response = await fetch(MSG91_WIDGET_SEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        widgetId: config.msg91WidgetId,
        identifier,
        tokenAuth: config.msg91AuthKey,
      }),
    });
  } catch (err) {
    throw new Error(`MSG91 request failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Read the body once as text, then attempt to parse it — MSG91 can
  // return a non-2xx status with a plain-text body on some failures, and
  // calling response.json() directly would throw before we could fall
  // back to the raw text for the error message.
  const rawBody = await response.text().catch(() => '');
  let body: { type?: string; message?: string } | null = null;
  try {
    body = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    // Not JSON — body stays null, raw text is still used below.
  }

  // MSG91 signals a logical failure via `type: "error"` in the JSON body,
  // which can arrive alongside an HTTP 200 — so both must be checked.
  if (!response.ok || !body || body.type !== 'success' || !body.message) {
    const detail = body?.message || rawBody || response.statusText;
    throw new Error(`MSG91 failed to send SMS (HTTP ${response.status}): ${detail}`);
  }

  // On success, MSG91's widget/sendOtp response carries the reqId in the
  // `message` field (the same {type, message} envelope MSG91 uses across
  // its v5 API family).
  return { reqId: body.message };
}

/**
 * Verifies a phone OTP against MSG91's OTP Widget (POST /api/v5/widget/verifyOtp).
 * Returns `false` for a request MSG91 actually processed and rejected
 * (wrong/expired code) — the caller treats that like any other wrong-OTP
 * attempt. Throws only for a genuine infrastructure failure (network error,
 * malformed/unexpected response), so those surface as a clear 500 instead
 * of silently counting against the user's attempt limit as a "wrong code".
 */
export async function verifyPhoneOtp(reqId: string, otp: string): Promise<boolean> {
  if (reqId === 'DEV_NO_MSG91') {
    if (config.nodeEnv === 'production') {
      throw new Error('SMS service is not configured (MSG91_AUTH_KEY / MSG91_WIDGET_ID is missing)');
    }
    console.warn('[sms] DEV MODE: MSG91 widget not configured — auto-accepting submitted code.');
    return /^\d{4}$/.test(otp);
  }

  if (!isMsg91Configured) {
    throw new Error('SMS service is not configured (MSG91_AUTH_KEY / MSG91_WIDGET_ID is missing)');
  }

  let response: Response;
  try {
    response = await fetch(MSG91_WIDGET_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        widgetId: config.msg91WidgetId,
        reqId,
        otp,
        tokenAuth: config.msg91AuthKey,
      }),
    });
  } catch (err) {
    throw new Error(`MSG91 request failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  const rawBody = await response.text().catch(() => '');
  let body: { type?: string; message?: string } | null = null;
  try {
    body = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    // Not JSON — body stays null.
  }

  if (body && body.type === 'success') {
    return true;
  }
  if (body && body.type === 'error') {
    // MSG91 processed the request and says the code is wrong/expired —
    // a legitimate "false", not an infrastructure error.
    return false;
  }

  // Anything else (non-2xx with no parseable {type} envelope, connection
  // reset, etc.) is a genuine failure, not a verification result.
  const detail = body?.message || rawBody || response.statusText;
  throw new Error(`MSG91 verifyOtp request failed (HTTP ${response.status}): ${detail}`);
}
