import postgres from 'postgres';
import config from '../config/index';

/**
 * postgres.js connection pool configured for Neon DB serverless compatibility.
 *
 * Usage:
 *   import sql from '@/db';
 *   const rows = await sql`SELECT * FROM contractors WHERE id = ${id}`;
 */
const sql = postgres(config.databaseUrl, {
  max: 10,              // max pool connections
  idle_timeout: 15,     // close idle connections after 15s
  connect_timeout: 30,    // 30s timeout to allow Neon cold-start / wake up
  max_lifetime: 60,       // recycle connections every 60s to avoid stale sockets
  onnotice: () => {},     // suppress NOTICE messages in dev
  ssl: 'require',         // enforce SSL for Neon database connection
});

export default sql;
