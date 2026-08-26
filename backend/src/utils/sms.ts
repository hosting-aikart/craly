import config, { isMsg91Configured } from '../config/index';

const MSG91_VERIFY_ACCESS_TOKEN_URL = 'https://control.msg91.com/api/v5/widget/verifyAccessToken';

export interface VerifyMsg91AccessTokenResult {
  verified: boolean;
  /** The mobile number MSG91 confirms this token was verified for, when available. */
  mobile?: string;
}

/**
 * Confirms a phone-verification access-token (JWT) issued by MSG91's OTP
 * Widget, via MSG91's server-side verifyAccessToken API — the ONLY
 * server-to-server MSG91 call this app makes for phone OTP.
 *
 * IMPORTANT ARCHITECTURE NOTE: MSG91's OTP Widget is a client-side
 * product. The widget's JS SDK (loaded on the signup page — see
 * frontend/app/signup/page.tsx) runs entirely in the browser: it sends
 * the SMS, shows/collects the code, and verifies it, talking to MSG91
 * directly using `widgetId` + `tokenAuth` (both intentionally
 * frontend-exposed — MSG91 documents tokenAuth as Web SDK configuration,
 * not a backend secret; see NEXT_PUBLIC_MSG91_WIDGET_ID /
 * NEXT_PUBLIC_MSG91_TOKEN_AUTH). On success the widget hands the browser
 * an access-token (JWT) as proof of verification. Craly's backend never
 * sends or checks the actual OTP digits for phone — its only job is this
 * one call, confirming that JWT is genuine using the MSG91 account
 * Authkey (a real secret, server-side only, from the MSG91 dashboard's
 * general API section — NOT the widget-scoped Token).
 *
 * This replaced an earlier implementation that POSTed directly to
 * api.msg91.com/api/v5/widget/sendOtp + /verifyOtp server-to-server — that
 * request shape doesn't correspond to any real MSG91 endpoint (confirmed
 * against MSG91's own dashboard-generated Server-Side Integration sample,
 * which only ever shows this verifyAccessToken call) and consistently
 * returned HTTP 403 "Invalid request" in production.
 *
 * Production never falls back to auto-accepting a token: if MSG91_AUTH_KEY
 * isn't configured, this throws and the caller (authController.verifySignupOtp)
 * surfaces a clear failure. The dev fallback below only ever runs in
 * non-production when MSG91_AUTH_KEY is missing entirely — since there's
 * no way to fake a genuine MSG91 JWT locally, dev fallback mode accepts
 * any non-empty token so the rest of the signup flow stays testable
 * without live MSG91 credentials. A genuine verify failure against a
 * real, configured MSG91 account always throws/returns false, in every
 * environment.
 */
export async function verifyMsg91AccessToken(accessToken: string): Promise<VerifyMsg91AccessTokenResult> {
  if (!isMsg91Configured) {
    if (config.nodeEnv === 'production') {
      throw new Error('SMS verification service is not configured (MSG91_AUTH_KEY is missing)');
    }
    console.warn('[sms] DEV MODE: MSG91_AUTH_KEY not configured — auto-accepting any submitted access-token.');
    return { verified: Boolean(accessToken) };
  }

  let response: Response;
  try {
    response = await fetch(MSG91_VERIFY_ACCESS_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        authkey: config.msg91AuthKey,
        'access-token': accessToken,
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
    // MSG91's verifyAccessToken response carries the verified identifier
    // (mobile/email) in `message` on success, mirroring the {type,
    // message} envelope used across MSG91's v5 API family.
    return { verified: true, mobile: body.message };
  }
  if (body && body.type === 'error') {
    // MSG91 processed the request and says the token is invalid/expired —
    // a legitimate "false", not an infrastructure error.
    return { verified: false };
  }

  // Anything else (non-2xx with no parseable {type} envelope, connection
  // reset, etc.) is a genuine failure, not a verification result.
  const detail = body?.message || rawBody || response.statusText;
  throw new Error(`MSG91 verifyAccessToken request failed (HTTP ${response.status}): ${detail}`);
}
