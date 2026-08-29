import dns from 'dns';
import postgres from 'postgres';
import config from '../config/index';

/**
 * Enforce IPv4-only DNS lookup for database connection attempts.
 * Prevents Node.js 18+ dual-stack internalConnectMultiple Happy Eyeballs
 * timeout (AggregateError) on networks where IPv6 is unreachable.
 */
const origLookup = dns.lookup;
dns.lookup = function (hostname: any, options: any, callback: any) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  const opts = typeof options === 'object' && options ? { ...options, family: 4 } : { family: 4 };
  return (origLookup as any)(hostname, opts, callback);
} as typeof dns.lookup;

try {
  // Ensure DNS has reliable resolvers if local resolver is unavailable
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch {
  // Ignore if unsupported
}

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // Ignore if unsupported
}

/**
 * postgres.js connection pool configured for Neon DB serverless compatibility.
 *
 * Usage:
 *   import sql from '@/db';
 *   const rows = await sql`SELECT * FROM contractors WHERE id = ${id}`;
 */
const sql = postgres(config.databaseUrl, {
  max: 10,              // max pool connections
  idle_timeout: 120,    // 120s idle timeout to keep active connections warm
  // Neon's own cold-start is normally ~1s; 30s here meant a single network
  // blip (DNS/TCP hiccup, transient pooler routing issue) held every request
  // that touched the DB — e.g. GET /api/auth/me on every page load — hanging
  // for a full 30s before failing. 10s still gives 10x headroom over a
  // normal cold-start while keeping the API responsive when the DB is
  // actually unreachable.
  connect_timeout: 10,
  max_lifetime: 300,    // recycle connections every 5 mins (300s) to maintain pool stability
  onnotice: () => {},     // suppress NOTICE messages in dev
  ssl: 'require',         // enforce SSL for Neon database connection
  // `fetch_types: false` looks like a harmless startup-speed shortcut, but it
  // disables postgres.js's one-time-per-connection pg_catalog lookup that
  // registers array-type parsers (see fetchArrayTypes() in postgres.js) —
  // without it, EVERY text[]/array column (contractor_profiles.skills,
  // .service_areas, etc.) comes back as a raw, unparsed Postgres array
  // literal string (e.g. '{"a","b"}') instead of a JS array, which crashes
  // any code that calls .map()/.length on it expecting an array. Must stay
  // at its default (true).
});

export default sql;
