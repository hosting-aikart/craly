import type { CorsOptions } from 'cors';

/**
 * Single source of truth for which browser origins may call the API with
 * credentials (the auth cookie). Used by Express (server.ts) and Socket.IO
 * (socket/index.ts) so the two can never disagree.
 *
 * Allowed:
 *   - requests with no Origin header (same-origin, curl, server-to-server);
 *   - Craly's own sites over HTTPS: https://craly.co and https://<sub>.craly.co
 *     (e.g. https://www.craly.co) — matched on the exact hostname, so
 *     look-alikes such as https://evilcraly.co or https://craly.co.evil.com
 *     are refused;
 *   - anything listed in ALLOWED_ORIGINS (exact match), plus Vercel preview
 *     URLs when a vercel.app origin is listed.
 */

const CRALY_DOMAIN = 'craly.co';

function isCralySite(url: URL): boolean {
  return url.protocol === 'https:' && (url.hostname === CRALY_DOMAIN || url.hostname.endsWith(`.${CRALY_DOMAIN}`));
}

export function isAllowedOrigin(origin: string | undefined, allowedOrigins: readonly string[]): boolean {
  if (!origin) return true;
  if (allowedOrigins.includes('*')) return true;

  let url: URL;
  try {
    url = new URL(origin.trim());
  } catch {
    return false;
  }
  if (isCralySite(url)) return true;

  return allowedOrigins.some((allowed) => {
    const cleanAllowed = allowed.trim().replace(/\/$/, '');
    if (!cleanAllowed) return false;
    if (cleanAllowed === '*') return true;
    if (url.origin === cleanAllowed) return true;
    // Allow Vercel preview deployment URLs if vercel.app is configured
    if (cleanAllowed.includes('vercel.app') && url.hostname.endsWith('.vercel.app')) return true;
    return false;
  });
}

/** Express `cors()` options — credentials on, so the origin is always echoed exactly (never `*`). */
export function buildCorsOptions(allowedOrigins: readonly string[]): CorsOptions {
  return {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin, allowedOrigins)) return callback(null, true);
      console.warn(`[cors] Blocked origin: ${origin}`);
      callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true,
  };
}
