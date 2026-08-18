#!/usr/bin/env bun
/**
 * fix-user-divisions.ts — backfill division_id for owner + kepala_kantor
 */
import { Client } from 'pg';
import { readFileSync } from 'node:fs';

const envText = readFileSync('C:/Users/Syahfalah/.env', 'utf8');
const dbUrl = envText.match(/DATABASE_URL=(.+)/)![1].trim();
const c = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

(async () => {
  await c.connect();
  const office = await c.query<{ id: string }>(
    `SELECT id FROM public.divisions WHERE code = 'OFFICE' LIMIT 1`
  );
  if (!office.rowCount) throw new Error('OFFICE division not found');
  const officeId = office.rows[0].id;
  const r = await c.query(
    `UPDATE public.users SET division_id = $1 WHERE division_id IS NULL AND role IN ('owner','kepala_kantor') RETURNING full_name, role`,
    [officeId]
  );
  console.log('updated:', r.rows);
  await c.end();
})();