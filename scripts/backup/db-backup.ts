#!/usr/bin/env bun
/**
 db-backup.ts — targeted data-only backup via node-postgres
 Usage: bun run scripts/backup/db-backup.ts [output-file]
 Output: SQL file with INSERTs (compatible with `psql -f` restore)
*/

import { Client } from 'pg';
import { writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';

// Load DATABASE_URL from C:/Users/Syahfalah/.env if not in process.env
if (!process.env.DATABASE_URL) {
  try {
    const envText = readFileSync('C:/Users/Syahfalah/.env', 'utf8');
    for (const line of envText.split(/\r?\n/)) {
      const m = line.match(/^DATABASE_URL=(.+)$/);
      if (m) process.env.DATABASE_URL = m[1].trim();
    }
  } catch {}
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('[backup] DATABASE_URL not set');
  process.exit(1);
}

const TABLES = [
  'public.users',
  'public.tasks',
  'public.weekly_plans',
  'public.monthly_plans',
  'public.sow_tasks',
  'public.kpi_actuals',
  'public.api_audit_log',
];

const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outFile = process.argv[2] ?? `C:/Users/Syahfalah/backups/backup_pre_replace_${ts.replace('T', '_').slice(0, 19)}.sql`;

const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function dump(): Promise<void> {
  await client.connect();
  console.log(`[backup] connected. dumping ${TABLES.length} tables to ${outFile}`);

  const lines: string[] = [];
  lines.push(`-- SYAHFALAH DB backup ${ts}`);
  lines.push(`-- Source: ${DATABASE_URL.replace(/:[^:@]+@/, ':***@')}`);
  lines.push(`-- Tables: ${TABLES.join(', ')}`);
  lines.push('');
  lines.push('BEGIN;');
  lines.push('');

  for (const tbl of TABLES) {
    const exists = await client.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2 LIMIT 1`,
      [tbl.split('.')[0], tbl.split('.')[1]]
    );
    if (exists.rowCount === 0) {
      console.log(`[backup] skip ${tbl} (not found)`);
      continue;
    }
    const cols = await client.query<{ column_name: string; data_type: string }>(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 ORDER BY ordinal_position`,
      [tbl.split('.')[0], tbl.split('.')[1]]
    );
    const colNames = cols.rows.map((r) => r.column_name);
    const countRes = await client.query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM ${tbl}`);
    const count = Number(countRes.rows[0].c);
    console.log(`[backup] ${tbl}: ${count} rows, ${colNames.length} cols`);

    if (count === 0) {
      lines.push(`-- ${tbl}: 0 rows`);
      continue;
    }

    lines.push(`-- ${tbl}: ${count} rows`);
    lines.push(`TRUNCATE TABLE ${tbl} CASCADE;`);

    const rows = await client.query(`SELECT * FROM ${tbl}`);
    for (const row of rows.rows) {
      const vals = colNames.map((c) => {
        const v = row[c];
        if (v === null) return 'NULL';
        if (typeof v === 'number') return String(v);
        if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
        if (v instanceof Date) return `'${v.toISOString()}'`;
        if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
        return `'${String(v).replace(/'/g, "''")}'`;
      });
      lines.push(`INSERT INTO ${tbl} (${colNames.join(', ')}) VALUES (${vals.join(', ')});`);
    }
    lines.push('');
  }

  lines.push('COMMIT;');
  lines.push('');
  writeFileSync(outFile, lines.join('\n'), 'utf8');
  console.log(`[backup] written: ${outFile}`);
  console.log(`[backup] size: ${(lines.join('\n').length / 1024).toFixed(1)} KB`);
  await client.end();
}

dump().catch((e) => {
  console.error('[backup] FAILED', e);
  process.exit(1);
});
