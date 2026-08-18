#!/usr/bin/env bun
/**
 * verify-seed.ts — check tasks/users after seed
 */
import { Client } from 'pg';
import { readFileSync } from 'node:fs';

const envText = readFileSync('C:/Users/Syahfalah/.env', 'utf8');
const dbUrl = envText.match(/DATABASE_URL=(.+)/)![1].trim();
const c = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

(async () => {
  await c.connect();
  const t = await c.query<{ n: string; type: string }>(
    `SELECT COUNT(*)::int as n, type FROM public.tasks GROUP BY type ORDER BY type`
  );
  console.log('tasks by type:', t.rows);
  const s = await c.query<{ n: string }>(`SELECT COUNT(*)::int as n FROM public.sow_tasks`);
  console.log('sow_tasks:', s.rows);
  const u = await c.query(
    `SELECT full_name, role, division_id FROM public.users WHERE full_name IN ('Pak Ardian','Mada') ORDER BY full_name`
  );
  console.log('key users:', u.rows);
  const recur = await c.query<{ n: string }>(
    `SELECT COUNT(*)::int as n FROM public.tasks WHERE recurrence_rule IS NOT NULL`
  );
  console.log('recurring tasks:', recur.rows);
  const assign = await c.query<{ full_name: string; n: string }>(
    `SELECT u.full_name, COUNT(t.id)::int as n
     FROM public.users u LEFT JOIN public.tasks t ON t.user_id = u.id
     GROUP BY u.full_name ORDER BY u.full_name`
  );
  console.log('tasks per user:', assign.rows);
  await c.end();
})();