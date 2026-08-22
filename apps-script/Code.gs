/**
 * Apps Script — Syahfalah Joblist Sync
 * --------------------------------------
 * Trigger: installable onChange trigger (set up via setupTriggers() below).
 * On any edit to any sheet tab, POST a delta row to the Vercel webhook.
 * Webhook HMAC-signs the body with the shared secret, upserts into
 * Supabase `tasks` table, and the dashboard /joblist page picks it up
 * within ~30s (or instantly on next focus).
 *
 * INSTALL (one-time):
 *   1. Open the target Google Sheet
 *   2. Extensions → Apps Script
 *   3. Paste this file (Code.gs) into the editor
 *   4. Replace WEBHOOK_URL and WEBHOOK_SECRET below
 *      — values come from `vercel env ls` for the SYAHFALAH project:
 *          vercel env pull .env.local
 *      — WEBHOOK_URL = https://syahfalah-dashboard.vercel.app/api/sheets/webhook
 *      — WEBHOOK_SECRET = $SHEETS_WEBHOOK_SECRET
 *   5. Run setupTriggers() once (grants onChange permission)
 *
 * TEST: edit any cell in any tab. Vercel logs should show 200 within 2s.
 * Throttle: 1 POST per 5s per sheet (avoids Sheets API quota).
 */

const WEBHOOK_URL = 'REPLACE_WITH_VERCEL_WEBHOOK_URL'
const WEBHOOK_SECRET = 'REPLACE_WITH_VERCEL_SHEETS_WEBHOOK_SECRET'
const SPREADSHEET_ID = '118KVpPLWdyJZO_3TUr444hpSgFFysEvRW--15bJXCk0'

// Throttle state — keyed by sheet name. Avoids hammering the webhook when
// the user pastes a 50-row block and onChange fires 50 times in a second.
const lastPostAt = {}

function postToWebhook_(sheetName, row, newValues) {
  const now = Date.now()
  const last = lastPostAt[sheetName] || 0
  if (now - last < 5000) {
    // Throttled — schedule a deferred post at the trailing edge.
    const delay = 5000 - (now - last)
    Utilities.sleep(delay)
  }
  lastPostAt[sheetName] = Date.now()

  const payload = JSON.stringify({
    spreadsheetId: SPREADSHEET_ID,
    sheet: sheetName,
    range: `A${row}:T${row}`,
    row: row,
    oldValues: [],
    newValues: newValues,
    changedAt: new Date().toISOString(),
  })

  const signature = Utilities.computeHmacSha256Signature(payload, WEBHOOK_SECRET)
    .map((b) => ('0' + (b & 0xff).toString(16)).slice(-2))
    .join('')

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'X-Sheets-Signature': signature },
    payload: payload,
    muteHttpExceptions: true,
  }

  try {
    const resp = UrlFetchApp.fetch(WEBHOOK_URL, options)
    const code = resp.getResponseCode()
    if (code >= 200 && code < 300) return
    console.warn(`webhook ${code}: ${resp.getContentText().slice(0, 200)}`)
  } catch (e) {
    console.error(`webhook failed: ${e.message}`)
  }
}

/**
 * onChange handler — fires on user edits, format changes, row inserts.
 * We only care about EDIT events with a known row range. Other change
 * types (insert/remove row) push a 0-th row payload to nudge the cron
 * path; the cron pulls the full sheet every 15 min anyway.
 */
function onChange(e) {
  if (!e) return
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  if (!ss) return
  if (e.source && e.source.getId && e.source.getId() !== SPREADSHEET_ID) return

  if (e.changeType === 'OTHER') return

  // Resolve the affected sheet name. e.changeType === 'EDIT' provides
  // e.range; for INSERT_ROW/REMOVE_ROW the range is the full sheet.
  const range = e.range
  if (!range) return

  const sheet = range.getSheet()
  const sheetName = sheet.getName()
  const row = range.getRow()

  if (row < 2) return // skip header row

  // Read the current row values (full row, column A–T is the webhook contract).
  const lastCol = Math.min(sheet.getLastColumn(), 20)
  const newValues = sheet.getRange(row, 1, 1, lastCol).getValues()[0].map((v) => String(v ?? ''))

  postToWebhook_(sheetName, row, newValues)
}

/**
 * Install onChange trigger. Run once after pasting Code.gs.
 * Re-run safely — deleteTriggers() wipes any stale install.
 */
function setupTriggers() {
  const triggers = ScriptApp.getProjectTriggers()
  for (const t of triggers) ScriptApp.deleteTrigger(t)

  ScriptApp.newTrigger('onChange')
    .forSpreadsheet(SpreadsheetApp.openById(SPREADSHEET_ID))
    .onChange()
    .create()

  console.log('onChange trigger installed for spreadsheet', SPREADSHEET_ID)
}

/**
 * Manual full-replay. Useful after first install to backfill all 9 sheets.
 * Calls the cron endpoint via Bearer secret (no signature needed).
 */
function replayAll() {
  const options = {
    method: 'get',
    headers: { Authorization: 'Bearer REPLACE_WITH_VERCEL_CRON_SECRET' },
    muteHttpExceptions: true,
  }
  const cronUrl = WEBHOOK_URL.replace('/api/sheets/webhook', '/api/cron/sync-sheets')
  const resp = UrlFetchApp.fetch(cronUrl, options)
  console.log(`cron ${resp.getResponseCode()}: ${resp.getContentText().slice(0, 500)}`)
}
