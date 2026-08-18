/**
 * Apps Script — Sheets → Dashboard webhook (realtime sync primary path).
 *
 * Setup:
 *   1. Open Google Sheet 118KVpPLWdyJZO_3TUr444hpSgFFysEvRW--15bJXCk0
 *   2. Extensions → Apps Script → paste this file (Code.gs)
 *   3. Project Settings → Script Properties:
 *        WEBHOOK_URL = https://syahfalah-dashboard.vercel.app/api/sheets/webhook
 *        WEBHOOK_SECRET = <32-byte hex; matches Vercel env SHEETS_WEBHOOK_SECRET>
 *   4. Triggers (clock icon) → Add:
 *        Function: onChange
 *        Event source: From spreadsheet
 *        Event type: On change
 *   5. Save + authorize when prompted.
 *
 * NOTE: Apps Script onChange trigger fires for any edit across the whole spreadsheet.
 * For finer-grained "single row edit" tracking use onEdit(e) instead — but onEdit does
 * not fire when another collaborator edits via mobile/Forms. onChange is more reliable.
 */

const SPREADSHEET_ID = '118KVpPLWdyJZO_3TUr444hpSgFFysEvRW--15bJXCk0';
const TAB_MARKETING = 'MARKETING';

function onChange(e) {
  const props = PropertiesService.getScriptProperties();
  const url = props.getProperty('WEBHOOK_URL');
  const secret = props.getProperty('WEBHOOK_SECRET');
  if (!url || !secret) {
    Logger.log('WEBHOOK_URL or WEBHOOK_SECRET missing in Script Properties');
    return;
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getActiveSheet();
  const sheetName = sheet.getName();

  // Only sync MARKETING for now. Other tabs read on demand by cron.
  if (sheetName.toUpperCase() !== TAB_MARKETING) return;

  // Read the row that just changed. Apps Script onChange does not give us row directly,
  // so we read the active range or fall back to a full scan of changed rows.
  const activeRange = sheet.getActiveRange();
  const startRow = activeRange ? activeRange.getRow() : 0;
  if (startRow < 2) return; // header row or invalid

  const lastCol = sheet.getLastColumn();
  const newValues = sheet.getRange(startRow, 1, 1, lastCol).getValues()[0].map(v => String(v ?? ''));

  const payload = {
    spreadsheetId: SPREADSHEET_ID,
    sheet: sheetName,
    range: `A${startRow}:${lastCol}`,
    row: startRow,
    oldValues: [],
    newValues,
    changedAt: new Date().toISOString(),
    triggerUid: Session.getTemporaryServiceKey(),
  };

  const body = JSON.stringify(payload);
  const signature = computeHmacSha256Hex(body, secret);

  try {
    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: body,
      headers: { 'X-Sheets-Signature': signature },
      muteHttpExceptions: true,
      timeout: 10,
    });
    const code = res.getResponseCode();
    if (code >= 200 && code < 300) {
      Logger.log(`webhook ok row=${startRow} status=${code}`);
    } else {
      Logger.log(`webhook fail row=${startRow} status=${code} body=${res.getContentText().slice(0, 200)}`);
    }
  } catch (err) {
    Logger.log(`webhook error: ${err.message}`);
  }
}

function computeHmacSha256Hex(message, secret) {
  const signature = Utilities.computeHmacSha256Signature(message, secret);
  return signature.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

// Optional: manual resync — call this from the Apps Script editor to push a full dump.
function resyncAllMarketingRows() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TAB_MARKETING);
  if (!sheet) throw new Error('MARKETING sheet not found');
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  for (let r = 2; r <= lastRow; r++) {
    const newValues = sheet.getRange(r, 1, 1, lastCol).getValues()[0].map(v => String(v ?? ''));
    if (!newValues[2] || !newValues[2].trim()) continue;
    pushRow(sheet.getName(), r, newValues);
  }
}

function pushRow(sheetName, row, newValues) {
  const props = PropertiesService.getScriptProperties();
  const url = props.getProperty('WEBHOOK_URL');
  const secret = props.getProperty('WEBHOOK_SECRET');
  const body = JSON.stringify({
    spreadsheetId: SPREADSHEET_ID,
    sheet: sheetName,
    range: `A${row}`,
    row,
    newValues,
    changedAt: new Date().toISOString(),
  });
  const signature = computeHmacSha256Hex(body, secret);
  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: body,
    headers: { 'X-Sheets-Signature': signature },
    muteHttpExceptions: true,
  });
}