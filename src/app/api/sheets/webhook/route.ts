// src/app/api/sheets/webhook/route.ts
// Phase Sheets — Apps Script webhook receiver (realtime primary path).
//
// Apps Script onChange(e) trigger POSTs {spreadsheetId, sheet, range, row, oldValues, newValues, changedAt}
// Headers: X-Sheets-Signature: HMAC_SHA256_HEX(secret, rawBody).
// Auth: verify HMAC if SHEETS_WEBHOOK_SECRET set; otherwise reject.

import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

interface SheetsWebhookPayload {
  spreadsheetId: string
  sheet: string
  range: string
  row: number
  oldValues: string[]
  newValues: string[]
  changedAt: string
  triggerUid?: string
}

export async function POST(req: NextRequest) {
  const secret = process.env.SHEETS_WEBHOOK_SECRET
  const rawBody = await req.text()
  if (secret) {
    const sig = req.headers.get('x-sheets-signature') ?? ''
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
    if (!safeEqual(sig, expected)) {
      return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
    }
  } else {
    return NextResponse.json({ error: 'SHEETS_WEBHOOK_SECRET not configured' }, { status: 503 })
  }

  let payload: SheetsWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  // Only MARKETING sheet is wired for now (other tabs read on demand).
  if (payload.sheet.toUpperCase() !== 'MARKETING') {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'env missing' }, { status: 500 })

  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  // Row format from Apps Script: idx0=seq_num, idx1='FALSE', idx2=title, idx7=due,
  // idx9=priority, idx11=status, idx13=category, idx17=notes, idx19=completed.
  // We only need title + status for incremental updates. Re-fetch full row would
  // re-introduce race conditions with cron — webhook updates deltas, cron keeps it fresh.
  const newVals = payload.newValues ?? []
  const title = (newVals[2] || '').trim()
  if (!title) {
    return NextResponse.json({ ok: true, ignored: 'empty title' })
  }
  const status = mapStatus(newVals[11] || '')
  const priority = mapPriority(newVals[9] || '')
  const category = (newVals[13] || '').trim() || 'Uncategorized'
  const dueDate = parseDdMmYyyy(newVals[7] || '')
  const externalId = `sheets:MARKETING:R${payload.row}`

  // Resolve assignee from category + title
  const { data: users } = await sb.from('users').select('id, full_name')
  const userByName = new Map<string, string>()
  for (const u of users ?? []) userByName.set(u.full_name, u.id)
  const assigneeName = categoryToAssignee(category) ?? titleContainsAssignee(title)
  const userId = assigneeName
    ? userByName.get(assigneeName) ?? userByName.get('Pak Ardian')
    : userByName.get('Pak Ardian')

  const { error } = await sb.from('tasks').upsert(
    {
      external_id: externalId,
      title,
      type: 'ad_hoc',
      status,
      priority,
      user_id: userId,
      scheduled_date: dueDate ?? new Date().toISOString().slice(0, 10),
      due_date: dueDate,
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: 'external_id', ignoreDuplicates: false }
  )
  if (error) {
    return NextResponse.json({ error: `upsert: ${error.message}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true, externalId, at: new Date().toISOString() })
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
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