#!/usr/bin/env bun
/**
 apply-migration.ts — apply single SQL migration file to Supabase
 Usage: bun run scripts/apply-migration.ts <path-to-sql-file>
 Reads DATABASE_URL from C:/Users/Syahfalah/.env
*/

import { Client } from 'pg';
import { readFileSync } from 'node:fs';

if (!process.env.DATABASE_URL) {
  try {
    const envText = readFileSync('C:/Users/Syahfalah/.env', 'utf8');
    for (const line of envText.split(/\r?\n/)) {
      const m = line.match(/^DATABASE_URL=(.+)$/);
      if (m) process.env.DATABASE_URL = m[1].trim();
    }
  } catch {}
}

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error('usage: bun run scripts/apply-migration.ts <sql-file>');
  process.exit(1);
}

const sql = readFileSync(sqlFile, 'utf8');

const client = new Client({ connectionString: process.env.DATABASE_URL!, ssl: { rejectUnauthorized: false } });

(async () => {
  await client.connect();
  console.log(`[migrate] connected. applying ${sqlFile}`);
  try {
    await client.query(sql);
    console.log('[migrate] OK');
  } catch (e: any) {
    console.error('[migrate] FAILED', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
