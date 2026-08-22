# Joblist Sync — Setup

End-to-end flow: edit Google Sheet → Apps Script `onChange` → Vercel webhook (HMAC verified) → Supabase `tasks` upsert → `/joblist` page renders.

## Prereqs (in Vercel)

These must already be set on the SYAHFALAH Vercel project:

```bash
vercel env ls
```

Expected vars:

| Var | Purpose |
|---|---|
| `SHEETS_WEBHOOK_SECRET` | HMAC secret. Generate with `openssl rand -hex 32` |
| `CRON_SECRET` | Cron bearer token. Generate with `openssl rand -hex 32` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (admin) |
| `GOOGLE_SHEET_ID` | Spreadsheet ID (default already in cron route) |

If any are missing, set via:

```bash
vercel env add SHEETS_WEBHOOK_SECRET production
# paste value when prompted
```

## Install Apps Script

1. Open <https://docs.google.com/spreadsheets/d/118KVpPLWdyJZO_3TUr444hpSgFFysEvRW--15bJXCk0>
2. **Extensions → Apps Script**
3. Delete the default `Code.gs` content, paste `Code.gs` from `apps-script/Code.gs` in this repo
4. Replace two constants at the top:
   - `WEBHOOK_URL` = `https://syahfalah-dashboard.vercel.app/api/sheets/webhook`
   - `WEBHOOK_SECRET` = same as `SHEETS_WEBHOOK_SECRET` from Vercel
5. Save (Ctrl+S)
6. In the function dropdown select `setupTriggers`, click **Run** → grant permissions when prompted
7. Check the Apps Script **Executions** tab — should show `onChange trigger installed`

## Backfill (one-time)

After the first install the script only catches future edits. To pull all 9 sheets immediately:

1. In Apps Script, select `replayAll` from the function dropdown
2. Replace `REPLACE_WITH_VERCEL_CRON_SECRET` in the function body with your `CRON_SECRET` value
3. **Run** — Vercel logs should show 200 with `{ sheets: [...] }` summary
4. **Remove the literal secret** from the function after the run

## Test edit

1. Edit any cell in any tab (e.g. change status from "In Progress" to "✅Done" in MASTER)
2. Within 2s: Vercel logs (`vercel logs --prod`) show `POST /api/sheets/webhook 200`
3. Open `https://syahfalah-dashboard.vercel.app/joblist` — row updates within 30s (or instantly on focus)

## 9 tracked tabs

| Tab name (as in Google Sheets) | gviz `sheet=` value | Kind |
|---|---|---|
| MASTER | `MASTER` | master (gid 1890167304) |
| NISYA | `NISYA` | master |
| TDL NISYA HARIAN | `TDL NISYA HARIAN` | personal → Bu Nisya |
| TDL RIZAL HARIAN | `TDL RIZAL HARIAN` | personal → Pak Rizal |
| NOFITA | `NOFITA` | master |
| MADA | `MADA` | master |
| RIZAL | `RIZAL` | master |
| AMIR | `AMIR` | master |
| SDEX | `SDEX` | master |
| BACKUP TM | `BACKUP TM` | backup |
| BACKUP WT | `BACKUP WT` | backup |

**Important caveat about tab names vs gids:** The Google Visualization API endpoint
`/gviz/tq?tqx=out:csv&sheet=<NAME>` accepts the **tab name** (not gid) and works
for any tab whose containing spreadsheet is publicly viewable. We use this
instead of the gid-based CSV export because tab gids are not exposed in the
public metadata — they're only visible to authenticated editors.

If the spreadsheet is set to "Anyone with the link can view" the Visualization
API works for every tab by name. If a specific tab is hidden or restricted,
the API silently returns the first tab (MASTER) for that request — meaning
tabs beyond MASTER may all return the same content until access is granted.

If your joblist data lives in a tab that isn't `MASTER`, ensure:

1. The whole spreadsheet is set to "Anyone with the link can view" (File →
   Share → General access → Anyone with the link → Viewer).
2. Each tab is not hidden via right-click → Hide sheet.

If you see "header row not found" for some tabs in the cron response, that
tab is either restricted or has a different schema. Re-share the spreadsheet
publicly and re-run `replayAll()` from the Apps Script editor.

## Cron safety net

The cron at `/api/cron/sync-sheets` runs every 15 min (configured in `vercel.json`) and re-pulls all 9 sheets via the public CSV export. This catches missed edits when:

- Apps Script trigger fails (auth drop, quota)
- Vercel was redeploying when the webhook fired
- User pasted a block edit faster than 1 POST/5s throttle

The cron is a safety net, not a primary path. If you see the cron correcting data the webhook missed, raise a bug — webhook should be the source of truth.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Edit sheet, dashboard doesn't update | `vercel logs --prod` — look for `webhook 401` (bad secret) or `webhook 500` (Supabase env missing) |
| `gid unset` in cron response | Update `SHEET_REGISTRY` with the tab's gid, redeploy |
| Webhook 503 | `SHEETS_WEBHOOK_SECRET` not set in Vercel. `vercel env add` and redeploy |
| Apps Script: "Permission denied" | Re-run `setupTriggers` and grant the spreadsheet scope |
| Throttling — 5s gap on rapid edits | By design. Cron will catch up within 15 min |

## Security note

The 13 PINs that gate `/login` should NEVER be in this repo. They live in Vercel env as `USER_PINS_JSON` (or the existing `users.pin_hash`/`pin_salt` in Supabase). If you see them in chat, **rotate immediately** per `~/.claude/rules/ecc/common/security.md` rule "Secret Sharing Pattern".
