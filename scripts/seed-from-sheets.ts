#!/usr/bin/env bun
/**
 seed-from-sheets.ts — populate dashboard tasks + users from public Google Sheets
 Usage:
   bun run scripts/seed-from-sheets.ts --dry-run    # preview only, no DB writes
   bun run scripts/seed-from-sheets.ts --execute    # destructive: truncate + insert
   bun run scripts/seed-from-sheets.ts --users-only # only upsert users
   bun run scripts/seed-from-sheets.ts --tasks-only # only refresh tasks (preserves users)
*/

import { Client } from 'pg';
import { readFileSync } from 'node:fs';
import { pbkdf2Sync, randomBytes } from 'node:crypto';

const SPREADSHEET_ID = '118KVpPLWdyJZO_3TUr444hpSgFFysEvRW--15bJXCk0';

// Tab name → gid (from sheet inspection)
const TABS: Record<string, number> = {
  MARKETING: 1890167304,
  MASTER: 0, // discover via API
  NISYA: 0,
  MADA: 0,
  RIZAL: 0,
  AMIR: 0,
  NOFITA: 0,
};

// User PIN → role mapping per plan. division_code maps to existing DB division codes.
// Use 'OFFICE' for kepala_kantor/owner, 'MARKETING' for marketing staff, 'SALES' for sales staff.
const EMPLOYEES: Array<{ name: string; pin: string; role: string; division_code: string }> = [
  { name: 'Mada', pin: '0327', role: 'kepala_kantor', division_code: 'OFFICE' },
  { name: 'Pak Ardian', pin: '1607', role: 'owner', division_code: 'OFFICE' },
  { name: 'Bu Nisya', pin: '4475', role: 'pic_divisi', division_code: 'MARKETING' },
  { name: 'Reni', pin: '5008', role: 'pic_divisi', division_code: 'MARKETING' },
  { name: 'Rizal', pin: '4410', role: 'pic_divisi', division_code: 'SALES' },
  { name: 'Amir', pin: '6478', role: 'staff', division_code: 'MARKETING' },
  { name: 'Andi', pin: '5143', role: 'staff', division_code: 'OFFICE' },
  { name: 'Novita', pin: '5528', role: 'staff', division_code: 'OFFICE' },
  { name: 'Reta', pin: '5182', role: 'staff', division_code: 'MARKETING' },
  { name: 'Rifki', pin: '1532', role: 'staff', division_code: 'MARKETING' },
  { name: 'Riza', pin: '5991', role: 'staff', division_code: 'SALES' },
  { name: 'Sinta', pin: '8143', role: 'staff', division_code: 'OFFICE' },
  { name: 'Yudi', pin: '7927', role: 'staff', division_code: 'SALES' },
];

// Default repeating jobdesks per role (RRULE strings per RFC 5545)
const REPEAT_DEFAULTS: Record<string, Array<{ title: string; rule: string; category: string }>> = {
  kepala_kantor: [
    { title: 'Weekly Briefing Senin 09:00', rule: 'FREQ=WEEKLY;BYDAY=MO', category: 'Marketing Planning' },
  ],
  pic_divisi: [
    { title: 'Daily Standup Marketing', rule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', category: 'Marketing Planning' },
  ],
  staff: [],
};

// ─── helpers ────────────────────────────────────────────────────────

function loadDbUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const txt = readFileSync('C:/Users/Syahfalah/.env', 'utf8');
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^DATABASE_URL=(.+)$/);
    if (m) return m[1].trim();
  }
  throw new Error('DATABASE_URL not set');
}

async function fetchCsv(tabName: string, gid: number): Promise<string[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${gid}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${tabName} (gid=${gid}) failed: ${r.status}`);
  const text = await r.text();
  // parse CSV (no quoted commas for our purposes — quoted values exist; basic parser)
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (c === '\r') { /* skip */ }
      else cur += c;
    }
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

function parseDdMmYyyy(s: string): string | null {
  const m = s.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function mapPriority(raw: string): string {
  const t = raw.trim();
  if (t.includes('🔴') || /high/i.test(t)) return 'high';
  if (t.includes('🟡') || /medium/i.test(t)) return 'medium';
  if (t.includes('🔵') || /low/i.test(t)) return 'low';
  if (/critical/i.test(t)) return 'critical';
  return 'medium';
}

function mapStatus(raw: string): string {
  const t = raw.trim();
  if (t.includes('✅') || /done|completed/i.test(t)) return 'completed';
  if (/progress/i.test(t)) return 'in_progress';
  if (/cancel/i.test(t)) return 'cancelled';
  return 'pending'; // 'Planned' → pending (not started yet)
}

// PBKDF2-SHA256 100k iter, 16-byte salt hex, 32-byte hash hex — matches src/lib/auth/pin.ts
function hashPin(pin: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(pin, salt, 100000, 32, 'sha256').toString('hex');
  return { hash, salt };
}

// ─── main ───────────────────────────────────────────────────────────

const MODE = process.argv.includes('--execute')
  ? 'execute'
  : process.argv.includes('--users-only')
  ? 'users-only'
  : process.argv.includes('--tasks-only')
  ? 'tasks-only'
  : 'dry-run';

const dbUrl = loadDbUrl();
const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function discoverGids(): Promise<void> {
  // For tabs we don't know gids for, fetch the spreadsheet HTML to extract
  // (Skip if not necessary — MARKETING gid is known.)
}

async function getOrCreateDivision(code: string, name?: string): Promise<string> {
  const existing = await client.query<{ id: string }>(
    `SELECT id FROM public.divisions WHERE code = $1 LIMIT 1`, [code]
  );
  if (existing.rowCount) return existing.rows[0].id;
  const ins = await client.query<{ id: string }>(
    `INSERT INTO public.divisions (code, name) VALUES ($1, $2) RETURNING id`,
    [code, name ?? code]
  );
  return ins.rows[0].id;
}

async function getOrCreateUser(emp: typeof EMPLOYEES[number], divisionId: string): Promise<string> {
  const existing = await client.query<{ id: string; pin_salt: string | null }>(
    `SELECT id, pin_salt FROM public.users WHERE full_name = $1 LIMIT 1`, [emp.name]
  );
  if (existing.rowCount) {
    const id = existing.rows[0].id;
    if (!existing.rows[0].pin_salt) {
      // Backfill PIN if missing
      const { hash, salt } = hashPin(emp.pin);
      await client.query(
        `UPDATE public.users SET pin_hash = $1, pin_salt = $2 WHERE id = $3`, [hash, salt, id]
      );
      console.log(`  user ${emp.name}: backfilled PIN`);
    }
    return id;
  }
  const { hash, salt } = hashPin(emp.pin);
  const email = `${emp.name.toLowerCase().replace(/\s+/g, '.')}@syahfalah.local`;
  const ins = await client.query<{ id: string }>(
    `INSERT INTO public.users (email, full_name, pin_hash, pin_salt, role, division_id, position, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true)
     RETURNING id`,
    [email, emp.name, hash, salt, emp.role, divisionId, emp.role]
  );
  console.log(`  user ${emp.name}: created (${emp.role})`);
  return ins.rows[0].id;
}

async function seedUsers(): Promise<Map<string, string>> {
  console.log('[seed] users...');
  const userByName = new Map<string, string>();
  for (const emp of EMPLOYEES) {
    const divId = await getOrCreateDivision(emp.division_code);
    const userId = await getOrCreateUser(emp, divId);
    userByName.set(emp.name, userId);
  }
  return userByName;
}

async function seedMarketingTasks(userByName: Map<string, string>): Promise<number> {
  console.log('[seed] tasks from MARKETING...');
  if (MODE === 'execute') {
    console.log('[seed] PURGE: deleting all tasks + sow_tasks');
    const t1 = await client.query('DELETE FROM public.tasks');
    const t2 = await client.query('DELETE FROM public.sow_tasks');
    console.log(`[seed]   tasks: ${t1.rowCount ?? 0} deleted, sow_tasks: ${t2.rowCount ?? 0} deleted`);
  }
  const rows = await fetchCsv('MARKETING', TABS.MARKETING);
  // Find header row: column B contains 'Daftar Pekerjaan'
  const headerRowIdx = rows.findIndex((r) => r.some((c) => c.trim() === 'Daftar Pekerjaan'));
  if (headerRowIdx < 0) throw new Error('MARKETING header not found');
  // Header positions (verified): Daftar Pekerjaan=1, Batas Waktu=7, Prioritas=9, Status=11,
  //   Kategori=13, Catatan=17, Tanggal Selesai=19. Data positions (verified): title=2, due=7,
  //   priority=9, status=11, category=13, notes=17, completed=19. Only title is shifted +1
  //   (data has seq_num at idx 0 + 'FALSE' at idx 1). Others align with header directly.
  const header = rows[headerRowIdx];
  const colIdx = (name: string) => header.findIndex((c) => c.trim() === name);
  const IDX_TITLE = colIdx('Daftar Pekerjaan') + 1;
  const IDX_DUE = colIdx('Batas Waktu');
  const IDX_PRIORITY = colIdx('Prioritas');
  const IDX_STATUS = colIdx('Status');
  const IDX_CATEGORY = colIdx('Kategori');
  const IDX_NOTES = colIdx('Catatan');
  const IDX_COMPLETED = colIdx('Tanggal Selesai');

  let inserted = 0;
  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    const title = (r[IDX_TITLE] || '').trim();
    if (!title) continue;
    const dueDate = parseDdMmYyyy(r[IDX_DUE] || '');
    const priority = mapPriority(r[IDX_PRIORITY] || '');
    const status = mapStatus(r[IDX_STATUS] || '');
    const category = (r[IDX_CATEGORY] || '').trim() || 'Uncategorized';
    const notes = (r[IDX_NOTES] || '').trim();
    const completedAt = parseDdMmYyyy(r[IDX_COMPLETED] || '');
    const externalId = `sheets:MARKETING:R${i + 1}`;

    // Assignee: empty rows → null (per user choice 'planned placeholder')
    const hasContent = title || dueDate || notes;
    const assigneeName = categoryToAssignee(category) ?? titleContainsAssignee(title);
    let userId = hasContent && assigneeName ? userByName.get(assigneeName) ?? null : null;
    // Fallback for Uncategorized / unmapped rows: assign to Pak Ardian (owner) as catch-all
    if (!userId) userId = userByName.get('Pak Ardian') ?? null;

    if (MODE === 'dry-run') {
      console.log(`  [dry] ${externalId} → ${title} | ${priority} | ${status} | ${category} | ${assigneeName ?? 'unassigned'}`);
    } else {
      await client.query(
        `INSERT INTO public.tasks
           (title, type, status, priority, user_id, division_id, scheduled_date, due_date, completed_at, external_id, last_synced_at)
         VALUES ($1, 'ad_hoc', $2, $3, $4, NULL, COALESCE($5::date, CURRENT_DATE), $5::timestamptz, $6::timestamptz, $7, NOW())
         ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO UPDATE SET
           title = EXCLUDED.title,
           status = EXCLUDED.status,
           priority = EXCLUDED.priority,
           user_id = EXCLUDED.user_id,
           due_date = EXCLUDED.due_date,
           completed_at = EXCLUDED.completed_at,
           last_synced_at = NOW()`,
        [title, status, priority, userId, dueDate, completedAt, externalId]
      );
    }
    inserted++;
  }
  console.log(`[seed] ${inserted} task rows processed from MARKETING`);
  return inserted;
}

function categoryToAssignee(category: string): string | null {
  const t = category.trim().toLowerCase();
  const map: Record<string, string> = {
    'marketing planning': 'Bu Nisya',
    'product knowledge': 'Reta',
    'lead generation': 'Reni',
    'lead management': 'Reni',
    'sales support': 'Reta',
    'digital marketing': 'Rifki',
    'advertising': 'Amir',
    'content marketing': 'Reta',
    'promotion & event': 'Bu Nisya',
    'research, analysis & reporting': 'Bu Nisya',
  };
  return map[t] ?? null;
}

function titleContainsAssignee(title: string): string | null {
  const t = title.toLowerCase();
  if (/(desain|banner|sticker|billboard|carousel|visual)/.test(t)) return 'Rifki';
  if (/(copywriting|bc harian|broadcast)/.test(t)) return 'Reta';
  if (/(ads|meta ads|tiktok ads|budgeting ads)/.test(t)) return 'Amir';
  if (/(kanvasing|telemarketing|komunitas|fb group)/.test(t)) return 'Reni';
  if (/(live tiktok|video|reels)/.test(t)) return 'Rifki';
  if (/(sosial media|handling|kolaborasi|collab)/.test(t)) return 'Rifki';
  if (/(evaluasi|strategy|laporan|reporting)/.test(t)) return 'Bu Nisya';
  if (/(landing page|katalog|pricelist|prospekt|brosur)/.test(t)) return 'Reta';
  if (/(promo|promotion|diskon)/.test(t)) return 'Bu Nisya';
  if (/(exhouse|open house|open table)/.test(t)) return 'Reta';
  return null;
}

async function seedRepeatingJobdesks(userByName: Map<string, string>): Promise<number> {
  console.log('[seed] repeating jobdesks (hardcoded defaults)...');
  let inserted = 0;
  for (const emp of EMPLOYEES) {
    const defaults = REPEAT_DEFAULTS[emp.role] ?? [];
    for (const def of defaults) {
      const externalId = `default:${emp.name}:${def.title}`;
      const userId = userByName.get(emp.name)!;
      if (MODE === 'dry-run') {
        console.log(`  [dry] ${externalId} → ${emp.name} | ${def.rule} | ${def.title}`);
      } else {
        await client.query(
          `INSERT INTO public.tasks
             (title, type, status, priority, user_id, division_id, scheduled_date,
              recurrence_rule, recurrence_start, external_id, last_synced_at)
           VALUES ($1, 'daily_routine', 'pending', 'medium', $2, NULL, CURRENT_DATE,
                   $3, CURRENT_DATE, $4, NOW())
           ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO UPDATE SET
             title = EXCLUDED.title,
             recurrence_rule = EXCLUDED.recurrence_rule,
             last_synced_at = NOW()`,
          [def.title, userId, def.rule, externalId]
        );
      }
      inserted++;
    }
  }
  return inserted;
}

async function main(): Promise<void> {
  await client.connect();
  console.log(`[seed] mode=${MODE} db=${dbUrl.replace(/:[^:@]+@/, ':***@')}`);

  if (MODE === 'execute') {
    console.log('[seed] WARNING: destructive. Existing tasks with no external_id will remain.');
    console.log('[seed] (only tasks with external_id matching Sheets are upserted; others untouched.)');
  }

  try {
    const userByName: Map<string, string> = MODE === 'tasks-only'
      ? await (async () => {
          const m = new Map<string, string>();
          const res = await client.query<{ id: string; full_name: string }>(
            `SELECT id, full_name FROM public.users`
          );
          for (const r of res.rows) m.set(r.full_name, r.id);
          return m;
        })()
      : await seedUsers();
    if (MODE !== 'users-only') {
      await seedMarketingTasks(userByName);
      await seedRepeatingJobdesks(userByName);
    }
    if (MODE === 'execute' || MODE === 'tasks-only') {
      await client.query('COMMIT').catch(() => {}); // no-op if no tx; each query is auto-commit
    }
    console.log('[seed] done');
  } catch (e) {
    console.error('[seed] FAILED', e);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
