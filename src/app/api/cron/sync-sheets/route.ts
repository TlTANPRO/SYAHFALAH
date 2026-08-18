// src/app/api/cron/sync-sheets/route.ts
// Phase Sheets — pull MARKETING tab from Google Sheets CSV, upsert into public.tasks.
// Safety net for Apps Script webhook (which is the primary realtime path).
// Vercel Cron every 15 minutes.
//
// Auth: Bearer $CRON_SECRET.
// Reads SHEET_ID from env. No Google API key required — uses public CSV export.

import { NextRequest, NextResponse } from 'next/server'

const SHEET_ID = process.env.GOOGLE_SHEET_ID ?? '118KVpPLWdyJZO_3TUr444hpSgFFysEvRW--15bJXCk0'
const MARKETING_GID = 1890167304

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'env missing' }, { status: 500 })

  const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${MARKETING_GID}`
  let csv: string
  try {
    const r = await fetch(csvUrl, { cache: 'no-store' })
    if (!r.ok) throw new Error(`sheet fetch ${r.status}`)
    csv = await r.text()
  } catch (e) {
    return NextResponse.json({ error: `fetch failed: ${(e as Error).message}` }, { status: 502 })
  }

  const rows = parseCsv(csv)
  const headerRowIdx = rows.findIndex((r) => r.some((c) => c.trim() === 'Daftar Pekerjaan'))
  if (headerRowIdx < 0) {
    return NextResponse.json({ error: 'MARKETING header not found' }, { status: 422 })
  }
  const header = rows[headerRowIdx]
  const colIdx = (name: string) => header.findIndex((c) => c.trim() === name)
  const IDX_TITLE = colIdx('Daftar Pekerjaan') + 1
  const IDX_DUE = colIdx('Batas Waktu')
  const IDX_PRIORITY = colIdx('Prioritas')
  const IDX_STATUS = colIdx('Status')
  const IDX_CATEGORY = colIdx('Kategori')
  const IDX_NOTES = colIdx('Catatan')
  const IDX_COMPLETED = colIdx('Tanggal Selesai')

  // Build user map + division map for assignee resolution
  const sb = createServiceClient(url, key)
  const { data: users, error: uErr } = await sb.from('users').select('id, full_name')
  if (uErr) return NextResponse.json({ error: `users: ${uErr.message}` }, { status: 500 })
  const userByName = new Map<string, string>()
  for (const u of users ?? []) userByName.set(u.full_name, u.id)

  let processed = 0
  let updated = 0
  let created = 0
  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const r = rows[i]
    const title = (r[IDX_TITLE] || '').trim()
    if (!title) continue
    processed++

    const externalId = `sheets:MARKETING:R${i + 1}`
    const dueDate = parseDdMmYyyy(r[IDX_DUE] || '')
    const priority = mapPriority(r[IDX_PRIORITY] || '')
    const status = mapStatus(r[IDX_STATUS] || '')
    const category = (r[IDX_CATEGORY] || '').trim() || 'Uncategorized'
    const notes = (r[IDX_NOTES] || '').trim()
    const completedAt = parseDdMmYyyy(r[IDX_COMPLETED] || '')
    const assigneeName = categoryToAssignee(category) ?? titleContainsAssignee(title)
    const userId = assigneeName ? userByName.get(assigneeName) ?? userByName.get('Pak Ardian') : userByName.get('Pak Ardian')

    // Idempotent upsert keyed by external_id. Same pattern as seed-from-sheets.ts.
    const { error: upErr, data: upData } = await sb
      .from('tasks')
      .upsert(
        {
          external_id: externalId,
          title,
          type: 'ad_hoc',
          status,
          priority,
          user_id: userId,
          scheduled_date: dueDate ?? new Date().toISOString().slice(0, 10),
          due_date: dueDate,
          completed_at: completedAt,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: 'external_id', ignoreDuplicates: false }
      )
      .select('id')
    if (upErr) {
      return NextResponse.json({ error: `upsert ${externalId}: ${upErr.message}` }, { status: 500 })
    }
    if (upData && upData.length > 0) updated++
    else created++
  }

  return NextResponse.json({ ok: true, processed, updated, created, ts: new Date().toISOString() })
}

function createServiceClient(url: string, key: string) {
  const { createClient } = require('@supabase/supabase-js')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++ }
      else if (c === '"') inQ = false
      else cur += c
    } else {
      if (c === '"') inQ = true
      else if (c === ',') { row.push(cur); cur = '' }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = '' }
      else if (c === '\r') { /* skip */ }
      else cur += c
    }
  }
  if (cur || row.length) { row.push(cur); rows.push(row) }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

function parseDdMmYyyy(s: string): string | null {
  const m = s.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (!m) return null
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

function mapPriority(raw: string): string {
  const t = raw.trim()
  if (t.includes('🔴') || /high/i.test(t)) return 'high'
  if (t.includes('🟡') || /medium/i.test(t)) return 'medium'
  if (t.includes('🔵') || /low/i.test(t)) return 'low'
  return 'medium'
}

function mapStatus(raw: string): string {
  const t = raw.trim()
  if (t.includes('✅') || /done|completed/i.test(t)) return 'completed'
  if (/progress/i.test(t)) return 'in_progress'
  if (/cancel/i.test(t)) return 'cancelled'
  return 'pending'
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