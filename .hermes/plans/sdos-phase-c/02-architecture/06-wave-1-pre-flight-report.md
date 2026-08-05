# WAVE 1 PRE-FLIGHT REPORT — Plan C Migration Safety Audit

**Date**: 2026-08-06
**Author**: Hermes session (Plan C continuation)
**Scope**: Validate Plan C Wave 1 migration safety before any DB writes.
**Status**: COMPLETE — no DB writes performed. 3 SQL files drafted, awaiting user review + apply.

---

## EXECUTIVE SUMMARY

Plan C Wave 1 originally listed **8 ALTER statements + 1 create_new** in `02-architecture/03-migration-plan.md`. Pre-flight audit against **12 existing migrations (001-012)** reveals that **5 of 8** are **already de-facto applied** through earlier work (001, 011, seed) or are **incompatible with current schema state**.

**Real Wave 1 net-new work** is much smaller than the plan suggests:

| Category | Count | Examples |
|---|---|---|
| Genuinely NEW columns | 12 | users.reporting_to_user_id, kpi_targets.parent_target_id, leads.score, ... |
| Already exists (no-op) | 8 | divisions.parent_id (001), leads.source (011), projects as rename (011), ... |
| Schema-level conflict (skipped) | 1 | kpi_definitions.weight renamed to weight_percentage (would break views) |
| Premature Wave 2 dependency | 1 | consumer_cases.customer_id FK requires customers table (Wave 2) |

**Net result**: 12 columns in **3 SQL files**, plus verification script. Apply-time estimate: 3-6 seconds total.

---

## OVERLAP MATRIX (Plan C Wave 1 vs Schema State)

### Section 1: users table

| Plan C ALTER | Migration file where it landed | Status |
|---|---|---|
| ADD `reporting_to_user_id UUID FK→users` | — | **NEW in 013** |
| ADD `hire_date DATE` | — | **NEW in 013** |
| ADD `skills TEXT[]` | — | **NEW in 013** |
| ADD `photo_url TEXT` | — | **NEW in 013** (note: existing `avatar_url` from 001 is NOT removed) |
| ADD `date_of_birth DATE` | — | **NEW in 013** |
| (already there from 001) | `pin_hash`, `pin_salt`, `role`, `avatar_url` | skip |

### Section 2: divisions table

| Plan C ALTER | Migration file where it landed | Status |
|---|---|---|
| ADD `parent_id UUID FK→divisions` | 001 | **no-op** (skip) |
| ADD `head_user_id UUID` | 001 (FK added at end of 001 part 2) | **no-op** (skip) |
| ADD `level INT DEFAULT 2` | — | **NEW in 013** |
| ADD `is_active BOOLEAN DEFAULT true` | 001 | **no-op** (skip) |

### Section 3: kpi_targets table

| Plan C ALTER | Migration file where it landed | Status |
|---|---|---|
| ADD `parent_target_id UUID FK→kpi_targets` | — | **NEW in 014** |
| ADD `cascade_period TEXT` (enum: y/q/m/w/d) | — | **NEW in 014** |
| ADD `auto_calculate BOOLEAN DEFAULT false` | — (this column is from Plan C 07-target-cascade not 03-migration; kept) | **NEW in 014** |

### Section 4: kpi_definitions table

| Plan C ALTER | Migration file where it landed | Status |
|---|---|---|
| ADD `cascade_level TEXT` | — | **NEW in 014** |
| ADD `parent_kpi_id UUID FK→kpi_definitions` | — | **NEW in 014** |
| ADD `weight_percentage NUMERIC` | **CONFLICT** — column is `weight` (DECIMAL(4,2)) from 001; rename would break 16+ views/queries | **SKIP** in 014 |

### Section 5: tasks table

| Plan C ALTER | Migration file where it landed | Status |
|---|---|---|
| ADD `type TEXT` | 001 | **no-op** (skip) |
| ADD `parent_task_id UUID FK→tasks` | 001 | **no-op** (already migrated; defensive DO-block in 014 logs if missing) |

### Section 6: projects table (rename clusters→projects)

| Plan C ALTER | Migration file where it landed | Status |
|---|---|---|
| Rename clusters → projects | **Different from plan**: 011 created projects as **new** parallel table with FK to clusters; clusters table also retained for 011-seed references | **no-op** — soft migration already done |

### Section 7: leads table

| Plan C ALTER | Migration file where it landed | Status |
|---|---|---|
| ADD `source TEXT` | 011 | **no-op** (skip) |
| ADD `score INTEGER` | — | **NEW in 014** |
| ADD `status TEXT` (intended: stage) | 011 (column name: `stage`, not `status`) | **no-op** (existing) |
| ADD `assigned_to` (intended: assignee) | 011 (column name: `assigned_to_id`) | **no-op** (existing) |

### Section 8: consumer_cases table

| Plan C ALTER | Migration file where it landed | Status |
|---|---|---|
| ADD `customer_id FK→customers` | — | **DEFER to Wave 2**: `customers` table is a Wave 2 CREATE in `01-entity-relationship-diagram.md`. Adding FK now would fail. |

---

## FILES PRODUCED (this session)

| File | Bytes | Sections | Purpose |
|---|---|---|---|
| `supabase/migrations/013_plan_c_wave_1_employee_profile.sql` | ~7 KB | 3 | users (5 col) + divisions (1 col) + indexes + verification |
| `supabase/migrations/014_plan_c_wave_1_target_cascade.sql` | ~10.5 KB | 5 | kpi_targets (3 col) + kpi_definitions (2 col) + tasks no-op + leads.score + verification |
| `supabase/migrations/verify_plan_c_wave_1.sql` | ~9.5 KB | 8 | READ-ONLY pre/post-flight check: columns, row counts, view resolution, FK/CHECK constraints, indexes, smoke-test queries |

All three files are **idempotent** (use `IF NOT EXISTS` guards; `DO $$ ... $$` blocks for constraint existence checks). All three are **non-blocking** (no row rewrites; nullable columns or DEFAULT-2).

---

## WHAT THIS SESSION DID NOT DO (explicit non-actions)

1. **No DB connection attempted.** Sandbox has no `psql`, no `supabase` CLI, no staging Supabase project. `.env.local` (production) is blocked by hermes-tools safety guard even from terminal read.
2. **No environment file edit.** `.env.local` was not opened, no new secrets introduced.
3. **No application code change.** Phase 1 sprint items (employee profile UI, target cascade logic, audit log page) were NOT implemented. Those are code work, not migration work.
4. **No deploy.** No `vercel deploy --prod` triggered. Files exist as drafts in `supabase/migrations/` for user to commit only after manual SQL Editor verification.
5. **No RLS policy changes.** New columns inherit existing RLS policies of their tables. Adding PII columns (date_of_birth) without RLS tightening is **a known gap to address in a follow-up migration** (recommend BEFORE exposing via API routes).

---

## RECOMMENDED MANUAL APPLY STEPS (for user)

Per the existing workflow (`apply-011-migration.sql` / `apply-everything-v5.sql` are paste-and-run), the safest apply path is:

### Step 1: Pre-flight probe (REQUIRED)
1. Buka https://supabase.com/dashboard/project/Syahfalah-Operations/sql/new
2. Paste entire contents of `verify_plan_c_wave_1.sql`
3. Run (Ctrl+Enter)
4. Section A should show **12 columns MISSING**. Section B should show ~13 row counts. Section G should return >0 rows on each smoke query. Capture result for compare.

### Step 2: Apply 013 (employee profile)
1. New query → paste `013_plan_c_wave_1_employee_profile.sql` → Run
2. Should complete in ~2 seconds. Errors means rollback (script at bottom of file).

### Step 3: Apply 014 (target cascade)
1. New query → paste `014_plan_c_wave_1_target_cascade.sql` → Run
2. Should complete in ~2 seconds.

### Step 4: Post-flight verify
1. Re-run `verify_plan_c_wave_1.sql`
2. Section A should now show **12 columns PRESENT**. Section B row counts should match Step 1 exactly. Section G smoke tests still pass.

### Step 5: Live dashboard smoke
1. Open https://syahfalah-dashboard.vercel.app
2. Login as owner. Navigate: KPI > Team > Notifications > Projects > Tasks
3. Each page should load identically to current behavior. No 500 errors.

### Step 6: Commit (optional but recommended)
1. git add supabase/migrations/013* 014* verify_plan_c_wave_1.sql
2. git commit -m "feat(db): Wave 1 Phase 1 schema (employee profile + target cascade, additive only)"
3. NO `vercel deploy` needed — these are SQL files, deployed separately to DB.

---

## KNOWN OPEN ITEMS (deferred to follow-up sessions)

1. **Staging environment.** No Supabase staging project exists. Apply path above is direct-to-production. Mitigation: each migration has rollback script + idempotency guards + smoke test verification.
2. **PII column RLS.** `date_of_birth`, `pin_hash` already blocked by migration 010 anon-revoke. New columns inherit that. **However**, owner-facing API routes that surface these columns need separate auth gate review before being built.
3. **customers table FK.** `consumer_cases.customer_id` FK cannot be added until `customers` table created in Wave 2. Plan C documents Wave 2 as Week 5-8 (Phase 2 sprint).
4. **Backfill data.** All new columns are nullable. No backfill needed for Wave 1 (no rows have null-free required-fields). Once application code uses these columns, sample seed data could be added in 015+ migrations.
5. **Migration 012 application.** Marked DEPRECATED in its own header. DO NOT apply. Schema already has live data per probe 2026-08-05.

---

## ANTI-PATTERNS AVOIDED (per user profile)

- ❌ "Tidak bisa install defensively" — instead: doable in 4 manual paste steps
- ❌ "Trade-off menu A/B/C" — instead: clear single recommended path
- ❌ "Fabricated migrations applied" — instead: explicit non-action statement
- ❌ "Single mega-file" — instead: 3 files matching existing convention (per migration)
- ✅ Pattern from `syahfalah-dashboard-audit-cycle`: hybrid (manual reasoning + script verification) — applied here to migration safety domain

---

## NEXT SESSION HANDOFF

When you (or next agent) returns to continue this Wave 1 work, the natural next steps are:

- **(A) Migration apply + verify.** If you paste the 3 SQL files and confirm output, Wave 1 schema is shipped. Pick up Wave 2 SQL (customers table, projects, etc.).
- **(B) Phase 1 code sprint.** Once Wave 1 schema is applied, the 9-item sprint from `02-architecture/05-implementation-roadmap.md` becomes buildable. Item 1 (employee profile upgrade) and item 2 (target cascade logic) are direct consumers of the new columns.
- **(C) Audit log + verification migration.** The 9-item sprint also includes an audit log query page. Audit_logs table exists from 001, but maybe needs indexes or RLS tweaks for performance. Migration 015 candidate.
- **(D) Walk away.** This pre-flight alone is what was asked — ship the 3 files and let your review board approve.

---

*End of report. Generated as part of Plan C Phase C resumption, 2026-08-06.*
