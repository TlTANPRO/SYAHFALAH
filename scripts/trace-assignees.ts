#!/usr/bin/env bun
/**
 * trace-assignees.ts — show title + category for tasks assigned to Pak Ardian
 */
import { Client } from 'pg';
import { readFileSync } from 'node:fs';

const envText = readFileSync('C:/Users/Syahfalah/.env', 'utf8');
const dbUrl = envText.match(/DATABASE_URL=(.+)/)![1].trim();
const c = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

(async () => {
  await c.connect();
  const r = await c.query(
    `SELECT t.title, t.external_id
     FROM public.tasks t JOIN public.users u ON u.id = t.user_id
     WHERE u.full_name = 'Pak Ardian' AND t.type = 'ad_hoc'
     ORDER BY t.external_id`
  );
  console.log(`Pak Ardian ad_hoc (${r.rowCount}):`);
  for (const row of r.rows) console.log(`  ${row.external_id} → ${row.title}`);
  await c.end();
})();