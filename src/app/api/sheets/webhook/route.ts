// src/app/api/sheets/webhook/route.ts
// Phase Sheets — Apps Script webhook receiver (realtime primary path).
//
// Apps Script onChange(e) trigger POSTs {spreadsheetId, sheet, range, row,
// oldValues, newValues, changedAt}. Headers: X-Sheets-Signature:
// HMAC_SHA256_HEX(secret, rawBody). All parsing/mapping now lives in
// lib/sheets/sync.ts — DO NOT inline duplicate mappers here.

import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'node:crypto'
import {
  SHEET_KEYS,
  getServiceClient,
  makeExternalId,
  mapPriority,
  mapStatus,
  parseDdMmYyyy,
  resolveAssigneeName,
  resolveSheet,
  upsertParsedRows,
  type ParsedSheetRow,
} from '@/lib/sheets/sync'

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

  // Resolve sheet name (case-insensitive). Skip if not in registry.
  const sheet = resolveSheet(payload.sheet)
  if (!sheet) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'sheet not in registry' })
  }

  // Webhook only sends a delta row — synthesize a ParsedSheetRow from newValues
  // and let the shared upsert path handle the rest. This keeps realtime +
  // cron mapping identical.
  const newVals = payload.newValues ?? []
  const title = (newVals[2] ?? '').trim()
  if (!title) {
    return NextResponse.json({ ok: true, ignored: 'empty title' })
  }

  const row: ParsedSheetRow = {
    rowIdx: payload.row,
    title,
    dueDate: parseDdMmYyyy(newVals[7] ?? ''),
    priority: mapPriority(newVals[9] ?? ''),
    status: mapStatus(newVals[11] ?? ''),
    category: (newVals[13] ?? '').trim() || 'Uncategorized',
    notes: (newVals[17] ?? '').trim(),
    completedAt: parseDdMmYyyy(newVals[19] ?? ''),
  }

  try {
    const sb = getServiceClient()
    const r = await upsertParsedRows(sb, sheet, [row])
    return NextResponse.json({
      ok: true,
      sheet: sheet.key,
      externalId: makeExternalId(sheet.key, payload.row),
      processed: r.processed,
      updated: r.updated,
      errors: r.errors,
      at: new Date().toISOString(),
    })
  } catch (e) {
    return NextResponse.json(
      { error: `sync failed: ${(e as Error).message}` },
      { status: 500 },
    )
  }
  void SHEET_KEYS
  void resolveAssigneeName
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
}
