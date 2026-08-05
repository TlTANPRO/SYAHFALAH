# Syahfalah Operations Dashboard — Adversarial Audit & Execution Plan

> **Tanggal**: 2026-08-06
> **Source**: User request "audit adversarial + plan, semua data clickable"
> **Method**: Hybrid — Ollama `gemma4:31b-cloud` second opinion + manual verification
> **URL target**: https://syahfalah-dashboard.vercel.app
> **Source repo**: `C:\Users\Syahfalah\SYAHFALAH\`

---

## 1. INVENTORY (real state 6-Aug 2026)

### Routes
- **Total**: 41 routes (33 pages + 8 API endpoints)
- **Dynamic detail pages**: 6 (`divisi/[divisionId]/{content,kpi,leads,team,page}`, `kpi/[code]`)
- **Static list pages**: 21 (with table/grid data)
- **API endpoints**: 8 (auth × 3, avatar, health, notifications, tasks)

### Database (live)
| Table | Rows | Source |
|---|---|---|
| `clusters` | 6 | Migration 011 (user applied) |
| `leads` | 40 | Migration 011 |
| `projects` | 15 | Migration 011 |
| `consumer_cases` | 25 | Migration 011 |
| `kpi_definitions` | 29 | pre-existing |
| `kpi_targets` | 348 | seeded Jan-Dec 2026 |
| `kpi_actuals` | 348 | seeded Jan-Dec 2026 |
| `users` | 13 | pre-existing |
| `notifications` | 107 | pre-existing + 3 demo |
| `tasks` | 33,276 | pre-existing |

---

## 2. ADVERSARIAL AUDIT FINDINGS (28 findings, severity-ordered)

### P0 — CRITICAL (data inaccessible / broken)

**P0-1. 13 list pages have zero click-through to detail**
- `admin/divisions`, `admin/sow`, `admin/users`, `divisi/[divisionId]/leads`
- `kepala-kantor/coaching`, `kepala-kantor/planning`
- `owner/kpi`, `owner/reports`
- `personal/kpi`, `personal/schedule`, `personal/sow`
- `raci`, `rewards`, `sow`
- **Impact**: User can see data but cannot drill down — defeats the dashboard purpose.
- **Fix**: Wrap rows in `<Link href={...}>` or `onClick={navigate(...)}`. Add detail pages for entities without one.

**P0-2. 4 pages use hardcoded mock data, not Supabase**
- `raci/page.tsx` (153 lines, all hardcoded arrays)
- `rewards/page.tsx` (193 lines)
- `kepala-kantor/coaching/page.tsx` (183 lines)
- `kepala-kantor/planning/page.tsx` (154 lines)
- **Impact**: User sees fictional data; cannot edit/save; cannot reflect real org state.
- **Fix**: Either (a) create Supabase tables + populate seed, (b) clearly label as "Sample / Template" with disclaimer (current rewards already has this), (c) wire to live data sources (tasks, kpi_actuals, sow_tasks).

**P0-3. No pagination on any list page**
- `admin/users` (13 users now, will grow)
- `owner/reports`, `personal/schedule`, etc. — `.select('*')` no range
- **Impact**: Browser crash once data > 1000 rows.
- **Fix**: `.range(0, 49)` + `Load more` button or full pagination UI. Tasks table alone has 33,276 rows.

**P0-4. Tasks client query failed silently (return [])**
- `hooks/useDashboardData.ts useTasks()` previously used anon key, now uses fetch
- `personal/tasks/page.tsx` query: `?scheduled_date=${today}` — but most users have 0 tasks scheduled for today
- **Impact**: "My Tasks" appears empty even when user has tasks scheduled (just not today).
- **Fix**: Show "all pending tasks" by default, with today/week tabs as filter.

### P1 — HIGH (UX confusion / incomplete features)

**P1-1. Schedule page hardcodes "Ritme Harian/Mingguan" data**
- `personal/schedule/page.tsx` uses `FALLBACK_SECRET` (verified present) AND hardcoded `RitmeHarian[]` array
- Actually `FALLBACK_SECRET` is in `lib/auth/jwt.ts` — Ollama misattributed. The hardcoded ritme IS real.
- **Fix**: Either load from `tasks` table grouped by recurrence pattern, or clearly label as "Template".

**P1-2. `Test Seed` filter in production queries**
- `owner/reports/page.tsx` has `.neq('division_name', 'Test Seed')` — indicates dirty test data
- **Fix**: Clean DB (delete Test Seed rows), then remove filter. Document clean state.

**P1-3. KPI detail page accessible but not linked from any list**
- `kpi/[code]/page.tsx` exists with drill-down — but `KpiTable.tsx` link added only in this session
- `personal/kpi/page.tsx` still lists KPIs without click-through to detail
- **Fix**: Apply same `<Link>` pattern to all KPI list occurrences.

**P1-4. Notifications + Approvals duplicated UX**
- Owner dashboard has both bell icon (notifications) AND approvals page
- User asked: "approval dan notifikasi jadi 1 kah? soalnya isinya sama"
- **Design decision**: They're functionally different:
  - **Notifications** = personal messages (bell icon, all roles)
  - **Approvals** = owner-specific queue requiring decision
- **Fix**: Keep separate but cross-link: bell icon shows count of unapproved approvals + link to `/owner/approvals`. Add filter on notifications page "Tipe: Approval Request".

**P1-5. No search/filter on most list pages**
- `admin/users`, `admin/divisions`, `personal/schedule`, `sow`, `raci`, `rewards`
- **Fix**: Add a search input + filter chips per entity (status, division, date range).

**P1-6. `divisi/[divisionId]/leads` does not show detail**
- List of leads but no click to lead detail
- **Impact**: User can see lead count but cannot investigate
- **Fix**: Add `leads/[id]/page.tsx` with full lead info + timeline.

### P2 — MEDIUM (polish / consistency)

**P2-1. Indonesian/English label inconsistency**
- Some pages use "Pembukaan" (Indonesian) others "Opening" (English)
- "baseline_target_value" (English field) shown in some UIs
- **Fix**: Standardize to Indonesian for end-user labels; keep English only in code/technical fields.

**P2-2. Status labels inconsistent**
- `coaching/page.tsx` uses `'belum follow up'` (descriptive phrase, not enum)
- `tasks` use `'pending'`, `'in_progress'`, `'completed'`, `'overdue'`, `'cancelled'` (enum)
- **Fix**: Use standardized enums; translate at display layer.

**P2-3. Breadcrumbs missing on some personal routes**
- `personal/schedule`, `personal/sow` — no `<Breadcrumbs />` component
- **Fix**: Add to all 21 list pages.

**P2-4. Missing `updated_at` in admin/users interface**
- Role changes (planned) would not have audit trail
- **Fix**: Add `updated_at` to schema + show in user detail/edit form.

**P2-5. Notifications fetch race condition**
- `NotificationBell` + `useDashboardData useNotifications` both poll, double-fetch every 30s
- **Fix**: Single source via React Query cache dedup (already happens if queryKey same) — confirm `queryKey: ['notifications', user?.id]` matches between components.

**P2-6. Avatar placeholder missing**
- No `/api/avatar` fallback when `avatar_url` is null
- **Fix**: Generate initials avatar when `avatar_url` is null (most users).

### P3 — LOW (nice-to-have)

**P3-1. No offline fallback**
- After `noscript` added, still no offline-first behavior for read-only views
- **Fix**: Service worker + cache-first for `/owner` (read-mostly).

**P3-2. No data export (CSV/PDF) on any list**
- KPI Explorer has CSV export (bulk action) but others don't
- **Fix**: Add export button to `owner/reports`, `admin/users`, `personal/tasks`.

**P3-3. No chart drill-down**
- Trend charts in `owner/page.tsx` cannot be clicked
- **Fix**: Wrap chart points in clickable elements → filter the period.

---

## 3. EXECUTION PLAN (sequential, bite-sized)

### Phase A — Critical Clickability (P0-1) [4 batches]

**A1. Personal hub list pages clickable** (~30 min)
- `personal/kpi/page.tsx` — wrap KPI rows → `<Link href="/kpi/[code]">` (page already exists)
- `personal/schedule/page.tsx` — wrap task rows → `<Link href="/personal/schedule/[taskId]">` (need to create detail page)
- `personal/sow/page.tsx` — wrap SOW rows → `<Link href="/sow/[sowId]">` (need to create detail page)
- `personal/tasks/page.tsx` — already has toggle button; add expand-to-detail modal

**A2. Admin pages clickable** (~45 min)
- `admin/users/page.tsx` — wrap user rows → `<Link href="/admin/users/[id]">`
- `admin/divisions/page.tsx` — wrap division cards → `<Link href="/divisi/[id]">` (already exists)
- `admin/sow/page.tsx` — wrap SOW rows → `<Link href="/sow/[id]">` (need to create)

**A3. Owner pages clickable** (~30 min)
- `owner/kpi/page.tsx` — link to `/kpi/[code]`
- `owner/reports/page.tsx` — wrap summary cards → filter the report
- `divisi/[divisionId]/leads/page.tsx` — wrap lead rows → `/divisi/[id]/leads/[leadId]`

**A4. New detail pages for entities without** (~90 min)
- `/sow/[sowId]/page.tsx` — full SOW detail with tasks breakdown
- `/leads/[leadId]/page.tsx` — full lead timeline + activities
- `/admin/users/[id]/page.tsx` — user detail + edit role

### Phase B — Hardcoded Data Migration (P0-2) [3 options]

**Decision required from user**: which path forward for `raci`, `rewards`, `coaching`, `planning`?

- **Option A**: Wire to existing Supabase tables
  - `raci` → join table `sow_raci` (need to create) + `sow_tasks` data
  - `rewards` → existing `kpi_actuals` (high performers)
  - `coaching` → existing `tasks` (mentoring sessions)
  - `planning` → existing `monthly_plans` (when populated)
- **Option B**: Label as "Sample Template" + add edit-form to save back to new Supabase table
- **Option C**: Keep mock but add `<EmptyState>` for "real data belum di-load" message

**Recommended**: Option A with phased sub-deliveries. Effort: 6-8 hours.

### Phase C — Pagination + Performance (P0-3)

**C1. Universal pagination component** (~60 min)
- `components/ui/Pagination.tsx` (NEW, 80 lines)
- `lib/hooks/usePagination.ts` (NEW, 40 lines)
- Apply to: `admin/users`, `admin/divisions`, `admin/sow`, `owner/reports`, `personal/tasks`

**C2. Optimize queries** (~30 min)
- Replace `.select('*')` with explicit column lists on all `tasks`, `notifications`, `sow_tasks` queries

### Phase D — UX Polish (P1)

**D1. Add search/filter to all list pages** (~2 hours)
- Reusable `<ListFilters />` component
- Each page gets: search input + status filter + division filter (where applicable)

**D2. Clean `Test Seed` data + remove filter** (~15 min)
- DELETE FROM divisions WHERE name = 'Test Seed' (via psql/SQL Editor)
- Remove `.neq('division_name', 'Test Seed')` filter from `owner/reports`

**D3. Wire Notifications + Approvals cross-link** (~30 min)
- `NotificationBell` badge count = unread + unapproved count
- `personal/notifications/page.tsx` filter by `type='approval_request'`
- `/owner/approvals` link from notifications with type=approval

**D4. Add `updated_at` to users** (~30 min)
- ALTER TABLE users ADD COLUMN updated_at timestamptz (SQL)
- Update `AdminUser` interface + display in detail/edit form

**D5. Generate initials avatar fallback** (~45 min)
- `components/ui/Avatar.tsx` — accepts `src` or generates initials
- Apply in Topbar, NotificationBell, ApprovalList, Comments

### Phase E — Consistency (P2)

**E1. Indonesian/English label audit** (~45 min)
- Sweep all `.tsx` for English UI strings
- Standardize via `lib/copy.ts` translation map

**E2. Status enum standardization** (~30 min)
- Define enum types in `lib/enums.ts`
- Replace descriptive strings

**E3. Breadcrumbs on all 21 list pages** (~45 min)
- Already done for 11 routes. Need 10 more.

**E4. Data export (CSV) on remaining pages** (~60 min)
- Reusable `<ExportCsvButton />` component

### Phase F — Nice-to-have (P3)

**F1. Service worker offline-first** (~3 hours)
- `public/sw.js` + register hook
- Cache `/owner`, `/kpi` (read-mostly)

**F2. Chart drill-down** (~60 min)
- Wrap chart points → click to filter period

**F3. EmptyState refactor pass 2** (~45 min)
- Any remaining inline empty patterns

---

## 4. EFFORT ESTIMATE

| Phase | Effort | Impact |
|---|---|---|
| A (clickability) | 3.25 hours | Critical (user's main ask) |
| B (data migration) | 6-8 hours | High |
| C (pagination/perf) | 1.5 hours | Critical for scale |
| D (UX polish) | 4 hours | High |
| E (consistency) | 3 hours | Medium |
| F (nice-to-have) | 4.5 hours | Low |
| **Total** | **22-25 hours** | |

Recommended execution order: **A → C → D → B → E → F**

---

## 5. RISKS & TRADE-OFFS

**Risk 1**: Some P0-2 pages (`raci`, `rewards`) are core UX paths. Migrating to live data requires schema design + seed. If rushed, could lose info.
**Trade-off**: Use Option C (label as sample) for now; migrate in Phase B over multiple sessions.

**Risk 2**: Adding click-through to 13 pages requires new detail pages for entities without (`sow`, `leads`, `users`). Effort = 3.25 hours just for A.
**Trade-off**: Start with entities that already have detail pages (kpi, divisions); defer `sow`/`leads`/`users` detail page creation.

**Risk 3**: Pagination on `tasks` (33,276 rows) is critical but adds latency.
**Trade-off**: Server-side filter + cursor pagination; client-side infinite scroll only as last resort.

---

## 6. OUTSTANDING FROM EARLIER AUDIT (carry-over)

These were addressed in prior sessions but worth restating:

- ✅ Theme toggle (light/dark) — fixed in `115be48`
- ✅ API proxy for notifications — `d085b14`
- ✅ KPI drill-down detail page — `8f28d53`
- ⚠️ Test Seed data still in DB (P1-2)
- ⚠️ Notif + Approvals cross-link not wired (P1-4)
- ⚠️ `updated_at` on users not added (P1-6)

---

## 7. NEXT STEPS

**Awaiting user decision** on:
1. Phase B option (A / B / C) for hardcoded pages
2. Should I proceed with Phase A1 immediately? (~30 min, no DB changes)

**Auto-proceed** if user says "lanjut" or similar — start Phase A1 + C1 in parallel.
