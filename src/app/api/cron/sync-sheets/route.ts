// src/app/api/cron/sync-sheets/route.ts
// Phase Sheets — cron safety net. Iterates all 9 sheets in SHEET_REGISTRY,
// pulls CSV export, upserts into public.tasks. Webhook is the realtime
// primary path; this catches missed edits when Apps Script triggers fail
// (rate limits, timeouts, auth drops).
//
// Auth: Bearer $CRON_SECRET. Vercel Cron scheduled every 15 minutes.

import { NextRequest, NextResponse } from 'next/server'
import {
  SHEET_REGISTRY,
  buildColumnResolver,
  findHeaderRow,
  getServiceClient,
  parseCsv,
  parseSheetRow,
  upsertParsedRows,
  type SheetKey,
} from '@/lib/sheets/sync'

const SHEET_ID = process.env.GOOGLE_SHEET_ID ?? '118KVpPLWdyJZO_3TUr444hpSgFFysEvRW--15bJXCk0'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const sb = getServiceClient()
  const summary: Array<{ sheet: SheetKey; ok: boolean; processed: number; updated: number; errors: number; note?: string }> = []

  for (const sheet of Object.values(SHEET_REGISTRY)) {
    try {
      // Use Visualization API (sheet name, not gid) — gids are not exposed
      // in public Sheets metadata. tabName must match Google Sheets exactly.
      const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet.tabName)}`
      const r = await fetch(csvUrl, { cache: 'no-store' })
      if (!r.ok) {
        summary.push({ sheet: sheet.key, ok: false, processed: 0, updated: 0, errors: 1, note: `csv ${r.status}` })
        continue
      }
      const csv = await r.text()
      const rows = parseCsv(csv)
      const headerRowIdx = findHeaderRow(rows)
      if (headerRowIdx < 0) {
        summary.push({ sheet: sheet.key, ok: false, processed: 0, updated: 0, errors: 1, note: 'header row not found' })
        continue
      }
      const header = rows[headerRowIdx]
      const cols = buildColumnResolver(header)
      if (cols.title < 0) {
        summary.push({ sheet: sheet.key, ok: false, processed: 0, updated: 0, errors: 1, note: 'no "Daftar Pekerjaan" column' })
        continue
      }
      const parsed = []
      for (let i = headerRowIdx + 1; i < rows.length; i++) {
        const p = parseSheetRow(rows[i], cols, i + 1)
        if (p) parsed.push(p)
      }
      const result = await upsertParsedRows(sb, sheet, parsed)
      summary.push({ sheet: sheet.key, ok: true, ...result })
    } catch (e) {
      summary.push({ sheet: sheet.key, ok: false, processed: 0, updated: 0, errors: 1, note: (e as Error).message })
    }
  }

  return NextResponse.json({ ok: true, sheets: summary, ts: new Date().toISOString() })
}
