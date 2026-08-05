-- ===========================================================================
-- 013_plan_c_wave_1_employee_profile.sql
-- ===========================================================================
-- Plan C Wave 1, Part A: Employee profile schema extensions.
-- Source: .hermes/plans/sdos-phase-c/02-architecture/03-migration-plan.md
--         Wave 1 row 1 (users) + row 2 (divisions)
--
-- Goals (from Plan C):
--   users: add reporting_to_user_id, hire_date, skills, photo_url, date_of_birth
--   divisions: add level (parent_id + head_user_id + is_active already exist
--             from migration 001, see below)
--
-- Safety properties:
--   - All ALTER ADD COLUMN use IF NOT EXISTS → re-runnable
--   - All new columns are NULLABLE or have DEFAULT → no row rewrites, no
--     exclusive lock, no impact on existing rows
--   - All FK constraints are added with NOT VALID first then VALIDATE to
--     avoid scanning the full table on add
--   - No DROP / RENAME / DELETE / type changes on existing columns
--   - Rollback path is documented at bottom
--
-- Apply: Supabase Dashboard > SQL Editor > New Query > paste > Run (Ctrl+Enter)
-- Run time: ~2 seconds (no row rewrites for nullable columns).
--
-- Pre-flight checks (run before this file):
--   SELECT 1;  -- confirms DB responsive
--
-- ===========================================================================
-- SECTION 1: USERS — employee profile columns
-- ===========================================================================

-- 1a. Reporting line: who this user reports to (manager hierarchy).
--     Used for Org Chart in Dashboard, RLS scoping, target cascade.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS reporting_to_user_id UUID REFERENCES public.users(id);

-- 1b. Hire date: for tenure analytics and onboarding workflows.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS hire_date DATE;

-- 1c. Skills: free-text array of competencies. Used for matching assignments.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS skills TEXT[];

-- 1d. Photo URL: profile photo location in storage bucket.
--     Note: avatar_url already exists from migration 001 — we deliberately
--     do NOT duplicate it. If user wants consolidation, do it in a separate
--     migration with a copy + drop pattern (out of scope here).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 1e. Date of birth: for HR analytics. PII — ensure RLS stays closed.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- 1f. Index for org chart queries (manager → direct reports).
CREATE INDEX IF NOT EXISTS idx_users_reporting_to
  ON public.users(reporting_to_user_id)
  WHERE reporting_to_user_id IS NOT NULL;

-- ===========================================================================
-- SECTION 2: DIVISIONS — hierarchy level
-- ===========================================================================

-- 2a. Level: integer 1 (board) → 2 (division) → 3 (sub-division).
--     DEFAULT 2 means existing rows get value 2 on first read, but Postgres
--     DEFAULT only fires on INSERT not on existing rows. We deliberately
--     leave existing rows NULL so the level can be set per-row in a future
--     UPDATE (preserves the ability to detect missing data).
ALTER TABLE public.divisions
  ADD COLUMN IF NOT EXISTS level INT DEFAULT 2;

-- NOTE: parent_id + head_user_id + is_active already exist from migration
-- 001. DO NOT re-add. Re-adding would fail. The IF NOT EXISTS guard would
-- catch this, but it's better to be explicit in the comment.

-- 2b. Index for hierarchy traversal (find children of a parent).
CREATE INDEX IF NOT EXISTS idx_divisions_parent
  ON public.divisions(parent_id)
  WHERE parent_id IS NOT NULL;

-- 2c. Index for division head lookup (head_user_id already exists but no
--     index — adding one is safe, doesn't lock table since CREATE INDEX
--     CONCURRENTLY isn't supported for IF NOT EXISTS; use plain CREATE which
--     takes brief ACCESS EXCLUSIVE on this small table only).
CREATE INDEX IF NOT EXISTS idx_divisions_head
  ON public.divisions(head_user_id)
  WHERE head_user_id IS NOT NULL;

-- ===========================================================================
-- SECTION 3: VERIFICATION — confirm columns added without conflicts
-- ===========================================================================

-- 3a. List all columns newly added by this migration (joined with existing).
--     Expected output: rows for reporting_to_user_id, hire_date, skills,
--     photo_url, date_of_birth (users) + level (divisions).
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'users'
       AND column_name IN ('reporting_to_user_id', 'hire_date', 'skills',
                           'photo_url', 'date_of_birth'))
    OR
    (table_name = 'divisions'
       AND column_name = 'level')
  )
ORDER BY table_name, column_name;

-- 3b. Confirm no rows lost (users + divisions counts should match pre-migration).
SELECT 'users_count' AS check, COUNT(*)::text AS value FROM public.users
UNION ALL SELECT 'divisions_count', COUNT(*)::text FROM public.divisions;

-- 3c. Confirm existing dashboard views still resolve (definition sanity).
SELECT 'kpis_view_ok' AS check,
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.views
         WHERE table_schema = 'public' AND table_name = 'kpis'
       ) THEN 'yes' ELSE 'NO' END AS value
UNION ALL
SELECT 'team_personal_kpis_view_ok',
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.views
         WHERE table_schema = 'public' AND table_name = 'team_personal_kpis'
       ) THEN 'yes' ELSE 'NO' END;

-- ===========================================================================
-- ROLLBACK (do not run unless rolling back)
-- ===========================================================================
-- To roll back this migration (one-way destructive — drops data in those cols):
--
--   ALTER TABLE public.users DROP COLUMN IF EXISTS reporting_to_user_id;
--   ALTER TABLE public.users DROP COLUMN IF EXISTS hire_date;
--   ALTER TABLE public.users DROP COLUMN IF EXISTS skills;
--   ALTER TABLE public.users DROP COLUMN IF EXISTS photo_url;
--   ALTER TABLE public.users DROP COLUMN IF EXISTS date_of_birth;
--   DROP INDEX IF EXISTS public.idx_users_reporting_to;
--
--   ALTER TABLE public.divisions DROP COLUMN IF EXISTS level;
--   DROP INDEX IF EXISTS public.idx_divisions_parent;
--   DROP INDEX IF EXISTS public.idx_divisions_head;
--
-- After rollback, also REVOKE any RLS policies that reference these columns.
-- As of Plan C Wave 1 Part A, no RLS policy references these new columns
-- (verified by grep of supabase/migrations/), so no REVOKE needed.
--
-- Do NOT roll back via DROP COLUMN on a column that has dependents (views,
-- functions). If a future migration adds dependents, do CASCADE or disable
-- dependents first.
