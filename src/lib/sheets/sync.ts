// src/lib/sheets/sync.ts
// Phase Sheets — shared mapping + parsing for the 9-tracked joblist tabs.
// Imported by /api/sheets/webhook (realtime, primary) and /api/cron/sync-sheets
// (cron safety net, every 15 min). Keep these in lock-step — drift between
// webhook and cron mapping is the #1 source of "row updated in sheet but
// dashboard still shows old data" reports.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Sheet registry — 9 tabs the user wants to mirror.
// gid values resolved from docs.google.com/spreadsheets/d/{SHEET_ID}#gid=<n>.
// To add a new sheet: append entry + bump SHEET_KEYS. Webhook will then
// accept onEdit events for that tab name (case-insensitive match).
// ---------------------------------------------------------------------------

export type SheetKey =
  | 'MASTER'
  | 'NISYA'
  | 'TDL_NISYA_HARIAN'
  | 'TDL_RIZAL_HARIAN'
  | 'NOFITA'
  | 'MADA'
  | 'RIZAL'
  | 'AMIR'
  | 'SDEX'
  | 'BACKUP_TM'
  | 'BACKUP_WT'

export interface SheetEntry {
  key: SheetKey
  /** Tab name exactly as it appears in Google Sheets (URL-encoded with %20 for spaces). */
  tabName: string
  /** Free-form name used as `external_id` prefix. */
  prefix: string
  /** If set, every row on this sheet is auto-assigned to this user full_name. */
  defaultAssignee?: string
  /** Sheet role: 'master' (master joblist, all PICs) or 'personal' (single-person TDL) or 'backup'. */
  kind: 'master' | 'personal' | 'backup'
}

export const SHEET_REGISTRY: Record<SheetKey, SheetEntry> = {
  MASTER: { key: 'MASTER', tabName: 'MASTER', prefix: 'MASTER', kind: 'master' },
  NISYA: { key: 'NISYA', tabName: 'NISYA', prefix: 'NISYA', kind: 'master' },
  TDL_NISYA_HARIAN: { key: 'TDL_NISYA_HARIAN', tabName: 'TDL NISYA HARIAN', prefix: 'TDL_NISYA', defaultAssignee: 'Bu Nisya', kind: 'personal' },
  TDL_RIZAL_HARIAN: { key: 'TDL_RIZAL_HARIAN', tabName: 'TDL RIZAL HARIAN', prefix: 'TDL_RIZAL', defaultAssignee: 'Pak Rizal', kind: 'personal' },
  NOFITA: { key: 'NOFITA', tabName: 'NOFITA', prefix: 'NOFITA', kind: 'master' },
  MADA: { key: 'MADA', tabName: 'MADA', prefix: 'MADA', kind: 'master' },
  RIZAL: { key: 'RIZAL', tabName: 'RIZAL', prefix: 'RIZAL', kind: 'master' },
  AMIR: { key: 'AMIR', tabName: 'AMIR', prefix: 'AMIR', kind: 'master' },
  SDEX: { key: 'SDEX', tabName: 'SDEX', prefix: 'SDEX', kind: 'master' },
  BACKUP_TM: { key: 'BACKUP_TM', tabName: 'BACKUP TM', prefix: 'BACKUP_TM', kind: 'backup' },
  BACKUP_WT: { key: 'BACKUP_WT', tabName: 'BACKUP WT', prefix: 'BACKUP_WT', kind: 'backup' },
}

/** Set of canonical sheet keys — used to reject arbitrary sheet names from webhook. */
export const SHEET_KEYS: ReadonlySet<SheetKey> = new Set(Object.keys(SHEET_REGISTRY) as SheetKey[])

/** Resolve a free-form sheet name (case-insensitive) to a registry entry, or null. */
export function resolveSheet(rawName: string): SheetEntry | null {
  const upper = rawName.trim().toUpperCase().replace(/\s+/g, '_')
  return SHEET_REGISTRY[upper as SheetKey] ?? null
}

// ---------------------------------------------------------------------------
// Row → task mapper.
// Source columns: 0=Daftar Pekerjaan, 1=Batas Waktu, 2=Prioritas, 3=Status,
// 4=Kategori, 5=Sisa Hari (formula text, ignored), 6=Catatan, 7=Tanggal Selesai.
// Header detection is dynamic — we resolve columns by header name, not index,
// so adding/reordering columns in the sheet doesn't break sync.
// ---------------------------------------------------------------------------

export interface ParsedSheetRow {
  rowIdx: number
  title: string
  dueDate: string | null
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled'
  category: string
  notes: string
  completedAt: string | null
}

const HEADER_TITLE = 'Daftar Pekerjaan'
const HEADER_DUE = 'Batas Waktu'
const HEADER_PRIORITY = 'Prioritas'
const HEADER_STATUS = 'Status'
const HEADER_CATEGORY = 'Kategori'
const HEADER_NOTES = 'Catatan'
const HEADER_COMPLETED = 'Tanggal Selesai'

/** Find the row in `rows` that contains the expected header cells. Returns -1 if missing. */
export function findHeaderRow(rows: string[][]): number {
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].some((c) => c.trim() === HEADER_TITLE)) return i
  }
  return -1
}

/** Build a 1-based-column resolver. Negative if column missing. */
export function buildColumnResolver(header: string[]): {
  title: number
  due: number
  priority: number
  status: number
  category: number
  notes: number
  completed: number
} {
  const find = (name: string) => header.findIndex((c) => c.trim() === name)
  return {
    title: find(HEADER_TITLE),
    due: find(HEADER_DUE),
    priority: find(HEADER_PRIORITY),
    status: find(HEADER_STATUS),
    category: find(HEADER_CATEGORY),
    notes: find(HEADER_NOTES),
    completed: find(HEADER_COMPLETED),
  }
}

/** Parse one data row using the column index map. Returns null if title missing. */
export function parseSheetRow(row: string[], cols: ReturnType<typeof buildColumnResolver>, rowIdx: number): ParsedSheetRow | null {
  const title = (row[cols.title] ?? '').trim()
  if (!title) return null
  return {
    rowIdx,
    title,
    dueDate: parseDdMmYyyy(row[cols.due] ?? ''),
    priority: mapPriority(row[cols.priority] ?? ''),
    status: mapStatus(row[cols.status] ?? ''),
    category: (row[cols.category] ?? '').trim() || 'Uncategorized',
    notes: (row[cols.notes] ?? '').trim(),
    completedAt: parseDdMmYyyy(row[cols.completed] ?? ''),
  }
}

// ---------------------------------------------------------------------------
// Field mappers — emoji-prefixed shorthand from sheet → enum values for DB.
// Single source of truth; both webhook + cron use these. Do NOT duplicate.
// ---------------------------------------------------------------------------

export function parseDdMmYyyy(s: string): string | null {
  const m = (s ?? '').trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (!m) return null
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

export function mapPriority(raw: string): ParsedSheetRow['priority'] {
  const t = (raw ?? '').trim()
  if (t.includes('🔴') || /high/i.test(t)) return 'high'
  if (t.includes('🟡') || /medium/i.test(t)) return 'medium'
  if (t.includes('🔵') || /low/i.test(t)) return 'low'
  return 'medium'
}

export function mapStatus(raw: string): ParsedSheetRow['status'] {
  const t = (raw ?? '').trim()
  if (t.includes('✅') || /done|completed|selesai/i.test(t)) return 'completed'
  if (/progress/i.test(t)) return 'in_progress'
  if (/cancel|batal/i.test(t)) return 'cancelled'
  if (/overdue|terlambat/i.test(t)) return 'overdue'
  return 'pending'
}

/** Heuristic: pick assignee from category first, then from title keywords. */
export function resolveAssigneeName(category: string, title: string): string {
  return categoryToAssignee(category) ?? titleContainsAssignee(title) ?? 'Pak Ardian'
}

function categoryToAssignee(category: string): string | null {
  const t = category.trim().toLowerCase()
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
  }
  return map[t] ?? null
}

function titleContainsAssignee(title: string): string | null {
  const t = title.toLowerCase()
  if (/(desain|banner|sticker|billboard|carousel|visual)/.test(t)) return 'Rifki'
  if (/(copywriting|bc harian|broadcast)/.test(t)) return 'Reta'
  if (/(ads|meta ads|tiktok ads|budgeting ads)/.test(t)) return 'Amir'
  if (/(kanvasing|telemarketing|komunitas|fb group)/.test(t)) return 'Reni'
  if (/(live tiktok|video|reels)/.test(t)) return 'Rifki'
  if (/(sosial media|handling|kolaborasi|collab)/.test(t)) return 'Rifki'
  if (/(evaluasi|strategy|laporan|reporting)/.test(t)) return 'Bu Nisya'
  if (/(landing page|katalog|pricelist|prospekt|brosur)/.test(t)) return 'Reta'
  if (/(promo|promotion|diskon)/.test(t)) return 'Bu Nisya'
  if (/(exhouse|open house|open table)/.test(t)) return 'Reta'
  return null
}

// ---------------------------------------------------------------------------
// CSV parser — minimal, no third-party dep. Sufficient for Google's CSV
// export which uses "" for escaped quotes inside quoted cells.
// ---------------------------------------------------------------------------

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cur = ''
  let inQuote = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuote) {
      if (c === '"' && text[i + 1] === '"') {
        cur += '"'
        i++
      } else if (c === '"') {
        inQuote = false
      } else {
        cur += c
      }
    } else {
      if (c === '"') inQuote = true
      else if (c === ',') {
        row.push(cur)
        cur = ''
      } else if (c === '\n') {
        row.push(cur)
        rows.push(row)
        row = []
        cur = ''
      } else if (c === '\r') {
        // skip CR (handle \r\n line endings)
      } else {
        cur += c
      }
    }
  }
  if (cur || row.length) {
    row.push(cur)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

// ---------------------------------------------------------------------------
// Supabase upsert — convert ParsedSheetRow → tasks row keyed by external_id.
// Format: `sheets:{SHEET_KEY}:R{rowIdx}` so re-syncing the same row overwrites
// cleanly without leaving stale rows on a row-insert.
// ---------------------------------------------------------------------------

export function makeExternalId(sheetKey: SheetKey, rowIdx: number): string {
  return `sheets:${sheetKey}:R${rowIdx}`
}

export interface UpsertResult {
  processed: number
  created: number
  updated: number
  errors: number
}

export async function upsertParsedRows(
  sb: SupabaseClient,
  sheet: SheetEntry,
  rows: ParsedSheetRow[],
): Promise<UpsertResult> {
  const { data: users } = await sb.from('users').select('id, full_name')
  const userByName = new Map<string, string>()
  for (const u of users ?? []) userByName.set(u.full_name as string, u.id as string)

  let created = 0
  let updated = 0
  let errors = 0
  const ts = new Date().toISOString()
  const fallbackUserId = userByName.get('Pak Ardian') ?? null

  for (const r of rows) {
    const assigneeName = sheet.defaultAssignee ?? resolveAssigneeName(r.category, r.title)
    const userId = userByName.get(assigneeName) ?? fallbackUserId
    if (!userId) {
      errors++
      continue
    }
    const { data, error } = await sb
      .from('tasks')
      .upsert(
        {
          external_id: makeExternalId(sheet.key, r.rowIdx),
          title: r.title,
          type: 'ad_hoc',
          status: r.status,
          priority: r.priority,
          user_id: userId,
          description: r.notes || null,
          scheduled_date: r.dueDate ?? ts.slice(0, 10),
          due_date: r.dueDate,
          completed_at: r.completedAt,
          last_synced_at: ts,
        },
        { onConflict: 'external_id', ignoreDuplicates: false },
      )
      .select('id')
    if (error) {
      errors++
      continue
    }
    // Heuristic: if upsert returned exactly 1 row, treat as updated; if 0
    // were returned (Supabase default is to return nothing on upsert when
    // the row is unchanged), assume updated. Real "created" detection would
    // need a pre-check, which we skip for throughput.
    if (data && Array.isArray(data) && data.length > 0) updated++
    else updated++
    void created
  }
  return { processed: rows.length, created, updated, errors }
}

// ---------------------------------------------------------------------------
// Helper: build a Supabase service-role client from env. Throws if missing.
// Used by both webhook + cron. Centralizing here means future env changes
// (e.g. switching to a per-user scoped service token) need only one edit.
// ---------------------------------------------------------------------------

export function getServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing')
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}
