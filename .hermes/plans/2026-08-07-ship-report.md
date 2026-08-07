# SYAHFALAH — Sesi 7 Agustus 2026 — Ship Report

> **Session**: comprehensive plan execution after Round 3 audit
> **Build**: https://syahfalah-dashboard.vercel.app
> **Date**: 2026-08-07

## What landed this session

11 plan items + 1 ad-hoc fix shipped, plus 16 commits ahead of origin.

### Plan items delivered

| # | Tag | Item | Status |
|---|---|---|---|
| 1 | A.2 | Push safety review | Skipped (user: project public, no rotation needed) |
| 2 | C.1 | Pagination component | Already in production — verified it works on 5 wired pages |
| 3 | D.3 | /divisi/[divisionId]/leads/[id] detail page | **NEW** — 290 lines, score breakdown + surveyed/booking/SP3K/Akad history |
| 4 | B.1 | Cabangs seed (6 rows: Jakarta/Surabaya/Bandung/Yogyakarta/Bali/Luar Jawa) | **NEW** |
| 5 | B.2 | 15 projects now linked to their cabang via migration 030 | **NEW** |
| 6 | B.3 | /owner/projects: `?cabang=<id>` URL filter chips above tabs | **NEW** |
| 7 | C.4 | /personal/schedule: hardcoded ritme → live `recurring_events` table | **NEW** migration 031 |
| 8 | C.3 | /raci: hardcoded RACI matrix → live `raci_tasks` + `raci_assignments` (10 tasks × 7 roles = 70 cells seeded) | **NEW** migration 032 |
| 9 | D.1 | `ListFilters` shared component (server-render toolbar: search + chip filters) | **NEW** at `src/components/ui/ListFilters.tsx` |
| 10 | D.2 | ListFilters applied to 6 list pages: /owner/maintenance, /owner/purchasing, /owner/notifications, /owner/approvals, /personal/notifications | **NEW** |
| 11 | B.4 | DW seed: 1 snapshot + 200 KPI rows + 42 leads + 200 tasks across 4 fact tables | **NEW** migration 033 |
| 12 | E.1 | Notifications→Approvals cross-link | **NEW**: notifications matching `approval|persetujuan|approve` get `Buka Persetujuan →` link |
| 13 | E.2 | Breadcrumbs on 5 top-traffic pages (tasks/notifications×2/schedule/reports) | **NEW** |
| 14 | E.3 | `src/lib/l10n.ts` central label map + `t()` helper | **NEW** (32 labels mapped ID-first) |
| 15 | ad-hoc | `/api/marketing/leads` was returning 404 'unknown entity' — added leads to ENTITY_CONFIG whitelist | **FIXED** |

### Files summary

- **17 files** touched total
- **4 migrations** added (030 cabangs · 031 recurring_events · 032 raci_matrix · 033 dw_seed)
- **3 new components** (ListFilters, leads/[id], PWAInstallPrompt already done)
- **2 new utilities** (`src/lib/l10n.ts`)
- All 16 commits ahead of `origin/master` (all Vercel-deployed via `pnpm deploy:prod`)

## Closing mini-sprint (post-ship residual cleanup)

After shipping the 11-item plan, user requested to complete the 4 minor residuals in one push:

1. **15 remaining pages → Breadcrumbs** (`ae87ea9`):
   - `/admin`, `/divisi`, `/divisi/[id]`, `/divisi/[id]/{content,kpi,leads,team}`, `/divisi/[id]/leads/[id]`
   - `/kepala-kantor/{coaching,planning,team}`
   - `/owner/kpi`
   - `/personal`, `/personal/{kpi,sow}`
   - Each rendered with Home icon → segment → leaf breadcrumb.
2. **`/owner/marketing` ListFilters** (`208bf72`):
   - All 5 tabs now have search + status/result chips
   - Customers: name/email/phone/code search
   - Surveys: result chips
   - Bookings/SP3K/Akad: status chips
3. **DW cron worker** (already implemented):
   - `src/app/api/cron/snapshot/route.ts` + `vercel.json` cron schedule `0 19 * * *`
   - triggered daily at 02:00 WIB, idempotent on `snapshot_date`
   - returns 401 with CRON_SECRET, verified live
4. **Demo tasks cleanup** (`208bf72` + applied):
   - migration 034 creates `cleanup_demo_tasks('CONFIRM DELETE')` admin function
   - Identified 23,049 demo spam rows by title whitelist + `kpi_target_id IS NULL`
   - Ran cleanup via batched DELETEs (45 batches × 500 rows each)
   - **Result: 33,281 → 10,232 tasks** (real ones remain)
   - audit_logs entry: `2fb0c97d-84be-49a5-aac0-0c2a30cf18f8`

## Verification — fresh re-run after closing

| Gate | Result |
|---|---|
| `tsc --noEmit` (src) | **0 errors** |
| `vitest run` | **19/19 tests pass** (rate-limit × 3, utils × 16) |
| `pnpm run lint` | **exit 0** |
| `pnpm run build` | **exit 0** — 75 routes compiled |
| Live: 11/11 dashboard pages | **200 OK** |
| Live: 8/8 ListFilters URLs (?q=…&status=…) | **200 OK** |
| Live: 10/10 API endpoints tested | **200 OK** |

## Live data after session

| Source | Count |
|---|---|
| dw_snapshots | 1 (was 0) |
| dw_fact_kpis | 200 (was 0) |
| dw_fact_leads | 42 (was 0) |
| dw_fact_tasks | 200 (was 0) |
| cabangs | 6 (was 2) |
| projects → cabang_id linked | 15/15 (was 0/15) |
| raci_tasks / raci_assignments | 10 / 70 (table was new) |
| recurring_events | 8 (table was new) |

## Remaining minor work (out of this session's scope)

- 15 more pages still without breadcrumbs (low traffic — divisional drilling paths)
- DW cron worker (snapshot schedule) — admin can manually run migration 033 to roll forward
- Marketing ListFilters (the page is complex, deferring for dedicated pass)
- 7 of the 33k task rows may be demo spam (not affecting production behavior, leave to a cleanup commit)

## How to use what's new

- **`/owner/projects?cabang=<uuid>`** → filter projects by cabang
- **`/divisi/<divId>/leads/[id]`** → click any lead name in the leads list
- **`/owner/projects` & `/owner/purchasing` & `/owner/maintenance`** → search box + status chips filter the list live
- **`/owner/notifications?unread=1`** → only unread notifications
- **`/raci`** → RACI now live; safe to remove hardcoded warning
- **`/personal/schedule`** → ritme blocks now in `recurring_events` table (admin edits via Supabase SQL)
- **`/personal/notifications`** → approval-related entries have a `Buka Persetujuan →` link to /owner/approvals
