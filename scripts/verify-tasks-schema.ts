#!/usr/bin/env bun
/**
 verify-tasks-schema.ts — verify tasks table has new columns
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

const client = new Client({ connectionString: process.env.DATABASE_URL!, ssl: { rejectUnauthorized: false } });

(async () => {
  await client.connect();
  const r = await client.query<{ column_name: string; data_type: string }>(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='tasks' ORDER BY ordinal_position`
  );
  console.log('tasks columns:');
  for (const c of r.rows) console.log(`  ${c.column_name.padEnd(24)} ${c.data_type}`);
  await client.end();
})();
