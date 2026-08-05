-- ===========================================================================
-- 014_plan_c_wave_1_target_cascade.sql
-- ===========================================================================
-- Plan C Wave 1, Part B: Target cascade schema extensions.
-- Source: .hermes/plans/sdos-phase-c/02-architecture/03-migration-plan.md
--         Wave 1 rows 3 (kpi_targets) + 4 (kpi_definitions)
--         + 7 (tasks) — Plan C notes parent_task_id "additive only"
--
-- Conceptual model (from Plan C 01-discovery/07-target-cascade.md):
--   Yearly → Quarterly → Monthly → Weekly → Daily
--   kpi_targets table extended with:
--     - parent_target_id (self-FK for cascade)
--     - cascade_period (enumerates which level in cascade)
--     - auto_calculate (if true, recompute children when parent changes)
--
-- Safety properties:
--   - All ALTER ADD COLUMN use IF NOT EXISTS
--   - Self-FK uses NOT VALID to skip pre-existing row scan (none exist yet
--     because parent_target_id is brand new)
--   - CHECK constraint on cascade_period uses enum-style text
--   - No DROP / RENAME / type changes
--   - Tasks: type already exists from migration 001, parent_task_id already
--     exists; we DO NOT re-add (would be no-op anyway)
--
-- Apply: Supabase Dashboard > SQL Editor > New Query > paste > Run
-- Run time: ~2 seconds.
--
-- ===========================================================================
-- SECTION 1: kpi_targets — cascade hierarchy columns
-- ===========================================================================

-- 1a. Parent target self-FK. Allows tree: yearly target has 4 quarterly
--     children, each with 3 monthly children, etc.
--     Note: NOT VALID skips scanning existing rows for FK validity. Since
--     parent_target_id is a brand new column with no values, scan would be
--     empty anyway. We use NOT VALID defensively in case any sample data is
--     inserted before VALIDATE runs.
ALTER TABLE public.kpi_targets
  ADD COLUMN IF NOT EXISTS parent_target_id UUID REFERENCES public.kpi_targets(id) NOT VALID;

-- Validate the FK constraint (no-op on empty result, ensures new rows comply).
-- Safe: requires only SHARE ROW EXCLUSIVE on kpi_targets (allows reads+writes).
ALTER TABLE public.kpi_targets VALIDATE CONSTRAINT kpi_targets_parent_target_id_fkey;

-- 1b. cascade_period: which level in the Y/Q/M/W/D cascade this row is.
--     NULL means legacy/manual target (not part of any cascade).
ALTER TABLE public.kpi_targets
  ADD COLUMN IF NOT EXISTS cascade_period TEXT;

-- CHECK constraint as data integrity guard.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'kpi_targets_cascade_period_check'
      AND table_name = 'kpi_targets'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.kpi_targets
      ADD CONSTRAINT kpi_targets_cascade_period_check
      CHECK (cascade_period IS NULL
             OR cascade_period IN ('yearly','quarterly','monthly','weekly','daily'));
  END IF;
END $$;

-- 1c. auto_calculate: when TRUE, the child rows recalc when parent changes.
--     DEFAULT false so existing/manual targets are not flipped.
ALTER TABLE public.kpi_targets
  ADD COLUMN IF NOT EXISTS auto_calculate BOOLEAN DEFAULT false;

-- 1d. Index for fast cascade traversal (find all children of a parent).
CREATE INDEX IF NOT EXISTS idx_kpi_targets_parent
  ON public.kpi_targets(parent_target_id)
  WHERE parent_target_id IS NOT NULL;

-- 1e. Partial index for finding level of cascade (used in pivot queries).
CREATE INDEX IF NOT EXISTS idx_kpi_targets_period_level
  ON public.kpi_targets(cascade_period)
  WHERE cascade_period IS NOT NULL;

-- ===========================================================================
-- SECTION 2: kpi_definitions — cascade level metadata
-- ===========================================================================
-- Plan C asks for cascade_level (numeric) + parent_kpi_id (which higher-level
-- KPI this derives from). Existing weight column is DECIMAL(4,2) already
-- (column name 'weight', not 'weight_percentage'). We deliberately:
--   - Add cascade_level (level at WHICH this kpi definition sits)
--   - Add parent_kpi_id (derives from which higher-level kpi definition)
--   - DO NOT rename weight → weight_percentage (existing views reference 'weight',
--     would break dashboard)

ALTER TABLE public.kpi_definitions
  ADD COLUMN IF NOT EXISTS cascade_level TEXT;

-- CHECK constraint on cascade_level (matches cascade_period vocabulary).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'kpi_definitions_cascade_level_check'
      AND table_name = 'kpi_definitions'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.kpi_definitions
      ADD CONSTRAINT kpi_definitions_cascade_level_check
      CHECK (cascade_level IS NULL
             OR cascade_level IN ('company','division','pic','personal'));
  END IF;
END $$;

-- Parent KPI definition (self-FK) — which higher-level KPI this derives from.
-- company-level KPIs have NULL parent_kpi_id.
ALTER TABLE public.kpi_definitions
  ADD COLUMN IF NOT EXISTS parent_kpi_id UUID REFERENCES public.kpi_definitions(id) NOT VALID;

ALTER TABLE public.kpi_definitions VALIDATE CONSTRAINT kpi_definitions_parent_kpi_id_fkey;

CREATE INDEX IF NOT EXISTS idx_kpi_definitions_parent
  ON public.kpi_definitions(parent_kpi_id)
  WHERE parent_kpi_id IS NOT NULL;

-- ===========================================================================
-- SECTION 3: TASKS — type + parent_task_id status check
-- ===========================================================================
-- Both type + parent_task_id already exist from migration 001. We document
-- here for completeness and run a no-op verification:
--   - type column (5 values: daily_routine, weekly_target, monthly_target,
--     ad_hoc, carry_over) — already deployed
--   - parent_task_id self-FK — already deployed
-- No ALTER needed. We verify and continue.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks'
      AND column_name = 'parent_task_id'
  ) THEN
    ALTER TABLE public.tasks
      ADD COLUMN parent_task_id UUID REFERENCES public.tasks(id) NOT VALID;
    ALTER TABLE public.tasks VALIDATE CONSTRAINT tasks_parent_task_id_fkey;
  END IF;
END $$;

-- ===========================================================================
-- SECTION 4: LEADS — score column only
-- ===========================================================================
-- Plan C Wave 1 ALTER row 7 mentions "source, score, status, assigned_to".
-- Audit result: source, stage (similar to status), assigned_to_id all exist
-- from migration 011. Only `score` is missing. We add only score.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS score INTEGER;

-- CHECK constraint for score range (0-100, can be tuned later).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'leads_score_check'
      AND table_name = 'leads'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_score_check
      CHECK (score IS NULL OR (score >= 0 AND score <= 100));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_leads_score
  ON public.leads(score)
  WHERE score IS NOT NULL;

-- ===========================================================================
-- SECTION 5: VERIFICATION
-- ===========================================================================

-- 5a. List new columns added by this migration.
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'kpi_targets'
       AND column_name IN ('parent_target_id', 'cascade_period', 'auto_calculate'))
    OR
    (table_name = 'kpi_definitions'
       AND column_name IN ('cascade_level', 'parent_kpi_id'))
    OR
    (table_name = 'leads'
       AND column_name = 'score')
  )
ORDER BY table_name, column_name;

-- 5b. Confirm FK constraints created.
SELECT
  conrelid::regclass::text AS table_name,
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
  AND conname IN (
    'kpi_targets_parent_target_id_fkey',
    'kpi_definitions_parent_kpi_id_fkey',
    'leads_score_check',
    'kpi_targets_cascade_period_check',
    'kpi_definitions_cascade_level_check'
  )
ORDER BY table_name, constraint_name;

-- 5c. Row counts — should match pre-migration.
SELECT 'kpi_targets_count' AS check, COUNT(*)::text AS value FROM public.kpi_targets
UNION ALL SELECT 'kpi_definitions_count', COUNT(*)::text FROM public.kpi_definitions
UNION ALL SELECT 'leads_count', COUNT(*)::text FROM public.leads;

-- 5d. Cascade period distribution (should mostly be NULL = manual/legacy).
SELECT
  COALESCE(cascade_period, '<<legacy_manual>>') AS period,
  COUNT(*) AS rows
FROM public.kpi_targets
GROUP BY cascade_period
ORDER BY rows DESC;

-- ===========================================================================
-- ROLLBACK (do not run unless rolling back)
-- ===========================================================================
-- To roll back this migration:
--
--   ALTER TABLE public.kpi_targets DROP CONSTRAINT IF EXISTS kpi_targets_cascade_period_check;
--   ALTER TABLE public.kpi_targets DROP COLUMN IF EXISTS parent_target_id;
--   ALTER TABLE public.kpi_targets DROP COLUMN IF EXISTS cascade_period;
--   ALTER TABLE public.kpi_targets DROP COLUMN IF EXISTS auto_calculate;
--   DROP INDEX IF EXISTS public.idx_kpi_targets_parent;
--   DROP INDEX IF EXISTS public.idx_kpi_targets_period_level;
--
--   ALTER TABLE public.kpi_definitions DROP CONSTRAINT IF EXISTS kpi_definitions_cascade_level_check;
--   ALTER TABLE public.kpi_definitions DROP COLUMN IF EXISTS cascade_level;
--   ALTER TABLE public.kpi_definitions DROP COLUMN IF EXISTS parent_kpi_id;
--   DROP INDEX IF EXISTS public.idx_kpi_definitions_parent;
--
--   ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_score_check;
--   ALTER TABLE public.leads DROP COLUMN IF EXISTS score;
--   DROP INDEX IF EXISTS public.idx_leads_score;
--
-- As of this migration, no view references the new columns. Cascade logic
-- application code (Phase 1 sprint) will reference them — but views are
-- not modified here.
