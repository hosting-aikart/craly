import fs from 'fs';
import path from 'path';
import sql from '../src/db';

/**
 * Escapes a JS string for safe insertion into a Postgres SQL statement.
 */
function escapeSqlString(str: string): string {
  return `'${str.replace(/'/g, "''")}'`;
}

/**
 * Formats a JS value into a Postgres SQL literal expression based on column metadata.
 */
function formatSqlValue(val: any, udtName: string, dataType: string): string {
  if (val === null || val === undefined) {
    return 'NULL';
  }

  if (typeof val === 'boolean') {
    return val ? 'TRUE' : 'FALSE';
  }

  if (typeof val === 'number') {
    return val.toString();
  }

  if (val instanceof Date) {
    return `${escapeSqlString(val.toISOString())}::timestamptz`;
  }

  if (Array.isArray(val)) {
    if (val.length === 0) {
      return `'{}'::text[]`;
    }
    const escapedItems = val.map((item) => {
      if (item === null || item === undefined) return 'NULL';
      if (typeof item === 'number' || typeof item === 'boolean') return String(item);
      return escapeSqlString(String(item));
    });
    return `ARRAY[${escapedItems.join(', ')}]::text[]`;
  }

  if (typeof val === 'object') {
    return `${escapeSqlString(JSON.stringify(val))}::jsonb`;
  }

  const strVal = String(val);

  if (dataType === 'timestamp with time zone' || udtName === 'timestamptz') {
    return `${escapeSqlString(strVal)}::timestamptz`;
  }

  if (dataType === 'timestamp without time zone' || udtName === 'timestamp') {
    return `${escapeSqlString(strVal)}::timestamp`;
  }

  if (dataType === 'date' || udtName === 'date') {
    return `${escapeSqlString(strVal)}::date`;
  }

  if (dataType === 'jsonb' || dataType === 'json') {
    return `${escapeSqlString(strVal)}::jsonb`;
  }

  if (dataType === 'uuid' || udtName === 'uuid') {
    return `${escapeSqlString(strVal)}::uuid`;
  }

  if (dataType === 'citext' || udtName === 'citext') {
    return `${escapeSqlString(strVal)}::citext`;
  }

  return escapeSqlString(strVal);
}

async function exportDatabase() {
  const outputPath = path.resolve(__dirname, '../craly_backup.sql');
  console.log(`[Backup] Fetching database schema & data...`);

  const sqlStatements: string[] = [];

  // Header & Session Config
  sqlStatements.push(`-- ============================================================`);
  sqlStatements.push(`-- Craly Database Complete Backup SQL File`);
  sqlStatements.push(`-- Generated At: ${new Date().toISOString()}`);
  sqlStatements.push(`-- ============================================================`);
  sqlStatements.push(``);
  sqlStatements.push(`SET statement_timeout = 0;`);
  sqlStatements.push(`SET lock_timeout = 0;`);
  sqlStatements.push(`SET client_encoding = 'UTF8';`);
  sqlStatements.push(`SET standard_conforming_strings = on;`);
  sqlStatements.push(`SET check_function_bodies = false;`);
  sqlStatements.push(`SET xmloption = content;`);
  sqlStatements.push(`SET client_min_messages = warning;`);
  sqlStatements.push(`SET row_security = off;`);
  sqlStatements.push(`SET session_replication_role = 'replica';`);
  sqlStatements.push(``);

  // 1. Required Extensions
  sqlStatements.push(`-- ------------------------------------------------------------`);
  sqlStatements.push(`-- Extensions`);
  sqlStatements.push(`-- ------------------------------------------------------------`);
  sqlStatements.push(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
  sqlStatements.push(`CREATE EXTENSION IF NOT EXISTS "citext";`);
  sqlStatements.push(``);

  // 2. Bulk fetch all table metadata in 3 fast queries
  const tablesResult = await sql<{ table_name: string }[]>`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;
  const tables = tablesResult.map((t) => t.table_name);

  const allColumns = await sql`
    SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default, character_maximum_length
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `;

  const allPks = await sql`
    SELECT tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY'
      AND tc.table_schema = 'public'
    ORDER BY tc.table_name, kcu.ordinal_position;
  `;

  const allFks = await sql`
    SELECT
      tc.table_name,
      tc.constraint_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public';
  `;

  // 3. For each table, generate CREATE TABLE statement and INSERT statements
  for (const tableName of tables) {
    sqlStatements.push(`-- ------------------------------------------------------------`);
    sqlStatements.push(`-- Table: "${tableName}"`);
    sqlStatements.push(`-- ------------------------------------------------------------`);

    const columns = allColumns.filter((c) => c.table_name === tableName);
    const pkColumns = allPks.filter((p) => p.table_name === tableName).map((p) => p.column_name);
    const fkConstraints = allFks.filter((f) => f.table_name === tableName);

    // Construct CREATE TABLE DDL
    const columnDefs: string[] = [];
    for (const col of columns) {
      let typeDef = col.data_type.toUpperCase();
      if (col.data_type === 'USER-DEFINED') {
        typeDef = col.udt_name.toUpperCase();
      } else if (col.data_type === 'ARRAY') {
        typeDef = 'TEXT[]';
      } else if (col.data_type === 'CHARACTER VARYING' && col.character_maximum_length) {
        typeDef = `VARCHAR(${col.character_maximum_length})`;
      }

      let colStr = `  "${col.column_name}" ${typeDef}`;
      if (col.column_default) {
        colStr += ` DEFAULT ${col.column_default}`;
      }
      if (col.is_nullable === 'NO') {
        colStr += ` NOT NULL`;
      }
      columnDefs.push(colStr);
    }

    if (pkColumns.length > 0) {
      columnDefs.push(`  PRIMARY KEY (${pkColumns.map((c) => `"${c}"`).join(', ')})`);
    }

    for (const fk of fkConstraints) {
      columnDefs.push(
        `  CONSTRAINT "${fk.constraint_name}" FOREIGN KEY ("${fk.column_name}") REFERENCES "${fk.foreign_table_name}" ("${fk.foreign_column_name}")`
      );
    }

    sqlStatements.push(`CREATE TABLE IF NOT EXISTS "${tableName}" (`);
    sqlStatements.push(columnDefs.join(',\n'));
    sqlStatements.push(`);`);
    sqlStatements.push(``);

    // Fetch and Dump Data Rows
    const rows = await sql.unsafe(`SELECT * FROM "${tableName}"`);
    if (rows.length > 0) {
      const colNames = columns.map((c) => `"${c.column_name}"`).join(', ');

      for (const row of rows) {
        const valStrings: string[] = [];
        for (const col of columns) {
          const val = row[col.column_name];
          valStrings.push(formatSqlValue(val, col.udt_name, col.data_type));
        }
        sqlStatements.push(`INSERT INTO "${tableName}" (${colNames}) VALUES (${valStrings.join(', ')});`);
      }
      sqlStatements.push(``);
    }

    // Sequence sync for serial columns
    for (const col of columns) {
      if (col.column_default && col.column_default.includes('nextval')) {
        const match = col.column_default.match(/nextval\('([^']+)'/);
        if (match && match[1]) {
          const seqName = match[1];
          sqlStatements.push(
            `SELECT setval('${seqName}', COALESCE((SELECT MAX("${col.column_name}") FROM "${tableName}"), 1), true);`
          );
        }
      }
    }
    sqlStatements.push(``);
  }

  // 4. Custom Indexes
  sqlStatements.push(`-- ------------------------------------------------------------`);
  sqlStatements.push(`-- Indexes`);
  sqlStatements.push(`-- ------------------------------------------------------------`);
  const indexes = await sql`
    SELECT indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%'
  `;
  for (const idx of indexes) {
    if (!idx.indexdef.includes('_pkey')) {
      let indexDef = idx.indexdef;
      if (!indexDef.includes('IF NOT EXISTS')) {
        indexDef = indexDef.replace('CREATE INDEX ', 'CREATE INDEX IF NOT EXISTS ');
        indexDef = indexDef.replace('CREATE UNIQUE INDEX ', 'CREATE UNIQUE INDEX IF NOT EXISTS ');
      }
      sqlStatements.push(`${indexDef};`);
    }
  }

  sqlStatements.push(``);
  sqlStatements.push(`-- Re-enable triggers and foreign keys`);
  sqlStatements.push(`SET session_replication_role = 'origin';`);
  sqlStatements.push(``);
  sqlStatements.push(`-- End of Backup`);

  const fileContent = sqlStatements.join('\n');
  fs.writeFileSync(outputPath, fileContent, 'utf-8');

  console.log(`[Backup] Complete! Exported ${tables.length} tables to ${outputPath} (${fileContent.length} bytes).`);
  process.exit(0);
}

exportDatabase().catch((err) => {
  console.error('[Backup] Export failed:', err);
  process.exit(1);
});
