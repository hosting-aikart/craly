import postgres from 'postgres';
import config from '../config/index';

/**
 * postgres.js connection pool.
 *
 * Usage:
 *   import sql from '@/db';
 *   const rows = await sql`SELECT * FROM contractors WHERE id = ${id}`;
 */
const sql = postgres(config.databaseUrl, {
  max: 10,           // max pool connections
  idle_timeout: 20,  // close idle connections after 20s
  connect_timeout: 10,
  onnotice: () => {}, // suppress NOTICE messages in dev
});

export default sql;
