import dns from 'dns';
import fs from 'fs';
import path from 'path';
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

// libpq-style TLS options. postgres.js does not understand these: it forwards
// every query-string parameter it doesn't recognise to the server as a
// session setting, so `sslrootcert=...` in DATABASE_URL makes RDS reject the
// connection with `unrecognized configuration parameter "sslrootcert"`.
// They are stripped from the URL and expressed as an explicit `ssl` object.
const LIBPQ_SSL_PARAMS = ['sslmode', 'sslrootcert', 'sslcert', 'sslkey'];

// Amazon RDS CA bundle (https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem),
// kept next to package.json — resolves to backend/ from both src/db and dist/db.
const DEFAULT_RDS_CA_PATH = path.resolve(__dirname, '..', '..', 'global-bundle.pem');

/**
 * Reads the RDS CA bundle — from DATABASE_URL's sslrootcert when given,
 * otherwise backend/global-bundle.pem. Fails startup with a clear message
 * (never the URL itself, which contains the password) if it's missing.
 */
function getRdsCa(caPath: string): string {
  try {
    return fs.readFileSync(caPath, 'utf8');
  } catch (err) {
    throw new Error(
      `[db] RDS CA certificate not readable at ${caPath} (${err instanceof Error ? err.message : err}). `
        + 'Download https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem to backend/global-bundle.pem.',
    );
  }
}

/**
 * Splits DATABASE_URL into the URL postgres.js should see (SSL params
 * removed) and the TLS options to use: verified TLS against the RDS CA for
 * RDS hosts (or whenever sslrootcert is given), unchanged `ssl: 'require'`
 * for everything else (e.g. Neon in development).
 */
function buildConnection(databaseUrl: string): { url: string; ssl: 'require' | { ca: string; rejectUnauthorized: true } } {
  if (!databaseUrl) return { url: databaseUrl, ssl: 'require' };

  const url = new URL(databaseUrl);
  const sslRootCert = url.searchParams.get('sslrootcert');
  for (const param of LIBPQ_SSL_PARAMS) url.searchParams.delete(param);

  const isRds = url.hostname.endsWith('.rds.amazonaws.com');
  if (!isRds && !sslRootCert) return { url: url.toString(), ssl: 'require' };

  return {
    url: url.toString(),
    ssl: { ca: getRdsCa(sslRootCert || DEFAULT_RDS_CA_PATH), rejectUnauthorized: true },
  };
}

const connection = buildConnection(config.databaseUrl);

/**
 * postgres.js connection pool. On AWS RDS: TLS verified against the RDS CA
 * bundle; elsewhere (Neon in development): TLS required.
 *
 * Usage:
 *   import sql from '@/db';
 *   const rows = await sql`SELECT * FROM contractors WHERE id = ${id}`;
 */
const sql = postgres(connection.url, {
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
  ssl: connection.ssl,    // see buildConnection() above
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
