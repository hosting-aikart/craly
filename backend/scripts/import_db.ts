import fs from 'fs';
import path from 'path';
import postgres from 'postgres';
import config from '../src/db'; // imports sql connection, or read env

async function importDatabase() {
  const args = process.argv.slice(2);
  let backupFilePath = path.resolve(__dirname, '../craly_backup.sql');
  let targetDbUrl = process.env.DATABASE_URL;

  for (const arg of args) {
    if (arg.startsWith('--file=')) {
      backupFilePath = path.resolve(arg.split('=')[1]);
    } else if (arg.startsWith('--url=')) {
      targetDbUrl = arg.split('=')[1];
    }
  }

  if (!targetDbUrl) {
    console.error('[Restore] Error: No DATABASE_URL provided or configured in backend/.env');
    process.exit(1);
  }

  if (!fs.existsSync(backupFilePath)) {
    console.error(`[Restore] Error: Backup SQL file not found at: ${backupFilePath}`);
    process.exit(1);
  }

  console.log(`[Restore] Reading backup file: ${backupFilePath}...`);
  const sqlContent = fs.readFileSync(backupFilePath, 'utf-8');

  console.log(`[Restore] Connecting to target database...`);
  const sql = postgres(targetDbUrl, {
    ssl: 'require',
    connect_timeout: 15,
  });

  try {
    console.log(`[Restore] Executing SQL restore script...`);
    await sql.unsafe(sqlContent);
    console.log(`[Restore] Success! All schema definitions and data have been successfully imported.`);
  } catch (err) {
    console.error('[Restore] Error during database restoration:', err);
    process.exit(1);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

importDatabase();
