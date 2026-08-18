#!/usr/bin/env bun
/**
 * gen-webhook-test.ts — generate signed webhook payload for manual testing
 * Usage: bun run scripts/gen-webhook-test.ts <row> <title>
 */
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';

const envText = readFileSync('C:/Users/Syahfalah/.env', 'utf8');
const secret = envText.match(/SHEETS_WEBHOOK_SECRET=(.+)/)![1].trim();

const row = Number(process.argv[2] ?? 5);
const title = process.argv[3] ?? 'Test dari webhook';

const body = JSON.stringify({
  spreadsheetId: '118KVpPLWdyJZO_3TUr444hpSgFFysEvRW--15bJXCk0',
  sheet: 'MARKETING',
  range: `A${row}:T${row}`,
  row,
  oldValues: [],
  newValues: [
    String(row - 1), 'FALSE', title, '', '', '', '', '23.8.2026', '',
    '🔴', '', 'Planned', '', 'Marketing Planning', '', '', '', '', '', '',
  ],
  changedAt: new Date().toISOString(),
});

const sig = createHmac('sha256', secret).update(body).digest('hex');

console.log('---BODY---');
console.log(body);
console.log('---SIGNATURE---');
console.log(sig);
console.log('---CURL---');
console.log(`curl -X POST https://syahfalah-dashboard.vercel.app/api/sheets/webhook \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -H "X-Sheets-Signature: ${sig}" \\`);
console.log(`  -d '${body}'`);