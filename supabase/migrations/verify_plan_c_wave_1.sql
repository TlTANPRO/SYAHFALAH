-- ===========================================================================
-- verify_plan_c_wave_1.sql
-- ===========================================================================
-- READ-ONLY schema verification. Run before AND after applying 013 + 014
-- to confirm the migrations did only what they intended and dashboard
-- functionality is intact.
--
-- Safe to run at any time. No writes. Copy-paste into SQL Editor and
-- inspect the result grid.
--
-- Expected pre-state (before 013+014 applied):
--   - users columns added by 013: ABSENT (5 columns missing)
--   - divisions columns added by 013: only `level` ABSENT (others exist)
--   - kpi_targets columns added by 014: 3 columns ABSENT
--   - kpi_definitions columns added by 014: 2 columns ABSENT
--   - leads.score: ABSENT
--
-- Expected post-state (after 013+014 applied):
--   - All columns above PRESENT
--   - 2 new FKs (kpi_targets.parent_target_id, kpi_definitions.parent_kpi_id)
--   - 4 CHECK constraints (kpi_targets.cascade_period, kpi_definitions.cascade_level,
--     leads.score, plus kpi_targets.parent FK which is implicit)
--   - 6 new indexes (idx_users_reporting_to, idx_divisions_parent, idx_divisions_head,
--     idx_kpi_targets_parent, idx_kpi_targets_period_level, idx_kpi_definitions_parent,
--     idx_leads_score = 7)
--   - All existing view counts UNCHANGED
--   - All existing dashboard data UNCHANGED
-- ===========================================================================

-- =============================================================
-- SECTION A: Plan C Wave 1 columns — present-or-missing
-- =============================================================
SELECT
  'users' AS table_name,
  column_name,
  CASE WHEN data_type IS NULL THEN 'MISSING' ELSE 'PRESENT' END AS status,
  COALESCE(data_type, '—') AS data_type,
  COALESCE(is_nullable::text, '—') AS is_nullable,
  COALESCE(column_default::text, '—') AS default_value
FROM (
  VALUES
    ('reporting_to_user_id'),
    ('hire_date'),
    ('skills'),
    ('photo_url'),
    ('date_of_birth'),
    ('level')  -- divisions
) AS expected(col_name)
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public'
  AND c.table_name IN ('users', 'divisions')
  AND c.column_name = expected.col_name
UNION ALL
SELECT
  'kpi_targets' AS table_name,
  column_name,
  CASE WHEN data_type IS NULL THEN 'MISSING' ELSE 'PRESENT' END,
  COALESCE(data_type, '—'),
  COALESCE(is_nullable::text, '—'),
  COALESCE(column_default::text, '—')
FROM (VALUES
  ('parent_target_id'),
  ('cascade_period'),
  ('auto_calculate')
) AS expected(col_name)
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public' AND c.table_name = 'kpi_targets'
  AND c.column_name = expected.col_name
UNION ALL
SELECT
  'kpi_definitions',
  column_name,
  CASE WHEN data_type IS NULL THEN 'MISSING' ELSE 'PRESENT' END,
  COALESCE(data_type, '—'),
  COALESCE(is_nullable::text, '—'),
  COALESCE(column_default::text, '—')
FROM (VALUES ('cascade_level'), ('parent_kpi_id')) AS expected(col_name)
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public' AND c.table_name = 'kpi_definitions'
  AND c.column_name = expected.col_name
UNION ALL
SELECT
  'leads',
  column_name,
  CASE WHEN data_type IS NULL THEN 'MISSING' ELSE 'PRESENT' END,
  COALESCE(data_type, '—'),
  COALESCE(is_nullable::text, '—'),
  COALESCE(column_default::text, '—')
FROM (VALUES ('score')) AS expected(col_name)
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public' AND c.table_name = 'leads'
  AND c.column_name = expected.col_name
ORDER BY table_name, column_name;

-- =============================================================
-- SECTION B: Row counts — pre/post should match exactly
-- =============================================================
SELECT 'users' AS table_name, COUNT(*) AS row_count FROM public.users
UNION ALL SELECT 'divisions', COUNT(*) FROM public.divisions
UNION ALL SELECT 'kpi_definitions', COUNT(*) FROM public.kpi_definitions
UNION ALL SELECT 'kpi_targets', COUNT(*) FROM public.kpi_targets
UNION ALL SELECT 'kpi_actuals', COUNT(*) FROM public.kpi_actuals
UNION ALL SELECT 'tasks', COUNT(*) FROM public.tasks
UNION ALL SELECT 'sow_tasks', COUNT(*) FROM public.sow_tasks
UNION ALL SELECT 'leads', COUNT(*) FROM public.leads
UNION ALL SELECT 'projects', COUNT(*) FROM public.projects
UNION ALL SELECT 'clusters', COUNT(*) FROM public.clusters
UNION ALL SELECT 'consumer_cases', COUNT(*) FROM public.consumer_cases
UNION ALL SELECT 'notifications', COUNT(*) FROM public.notifications
UNION ALL SELECT 'rewards', COUNT(*) FROM public.rewards
ORDER BY table_name;

-- =============================================================
-- SECTION C: Critical dashboard views still resolve
-- =============================================================
SELECT
  table_name AS view_name,
  CASE WHEN is_updatable = 'YES' THEN 'updatable' ELSE 'read-only' END AS mode,
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = v.table_name) AS column_count
FROM information_schema.views v
WHERE table_schema = 'public'
  AND table_name IN (
    'kpis', 'team_personal_kpis', 'sow_with_tasks',
    'division_kpi_summary', 'division_task_summary',
    'notifications_with_user'
  )
ORDER BY view_name;

-- =============================================================
-- SECTION D: FK constraints added by 014
-- =============================================================
SELECT
  conrelid::regclass::text AS table_name,
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
  AND conname IN (
    'kpi_targets_parent_target_id_fkey',
    'kpi_definitions_parent_kpi_id_fkey'
  )
ORDER BY table_name;

-- =============================================================
-- SECTION E: CHECK constraints added by 014
-- =============================================================
SELECT
  conrelid::regclass::text AS table_name,
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
  AND conname IN (
    'kpi_targets_cascade_period_check',
    'kpi_definitions_cascade_level_check',
    'leads_score_check'
  )
ORDER BY table_name;

-- =============================================================
-- SECTION F: Indexes added by 013 + 014
-- =============================================================
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_users_reporting_to',
    'idx_divisions_parent',
    'idx_divisions_head',
    'idx_kpi_targets_parent',
    'idx_kpi_targets_period_level',
    'idx_kpi_definitions_parent',
    'idx_leads_score'
  )
ORDER BY tablename, indexname;

-- =============================================================
-- SECTION G: Smoke test — critical dashboard read queries
-- =============================================================
-- Each query must return >0 rows (or be 0 for empty legitimate states).
-- If any returns an error, the migration broke something.

-- G1. KPIs view (Owner KPI page)
SELECT COUNT(*) AS kpi_rows FROM public.kpis;

-- G2. Team personal KPIs (Team page)
SELECT COUNT(*) AS team_kpi_rows FROM public.team_personal_kpis;

-- G3. Notifications with user (NotificationBell)
SELECT COUNT(*) AS notif_rows FROM public.notifications_with_user;

-- G4. Division KPI summary (Owner dashboard)
SELECT COUNT(*) AS div_kpi_rows FROM public.division_kpi_summary;

-- G5. Active users (auth gate)
SELECT COUNT(*) AS active_users FROM public.users WHERE is_active = true;

-- G6. Existing divisions hierarchy (parent_id already migrated)
SELECT
  COUNT(*) FILTER (WHERE parent_id IS NOT NULL) AS div_with_parent,
  COUNT(*) FILTER (WHERE parent_id IS NULL) AS div_without_parent,
  COUNT(*) FILTER (WHERE head_user_id IS NOT NULL) AS div_with_head,
  COUNT(*) AS total
FROM public.divisions;

-- =============================================================
-- SECTION H: Plan C Wave 1 column-level summary
-- =============================================================
-- Human-readable verdict for paste-back-to-chat.
SELECT
  'Plan C Wave 1 verification' AS report,
  NOW() AS checked_at,
  (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (
        (table_name = 'users' AND column_name IN
          ('reporting_to_user_id','hire_date','skills','photo_url','date_of_birth'))
        OR (table_name = 'divisions' AND column_name = 'level')
        OR (table_name = 'kpi_targets' AND column_name IN
          ('parent_target_id','cascade_period','auto_calculate'))
        OR (table_name = 'kpi_definitions' AND column_name IN
          ('cascade_level','parent_kpi_id'))
        OR (table_name = 'leads' AND column_name = 'score')
      )
  ) AS new_columns_present
  || '/' || 12 AS status;  -- total expected new columns = 12

-- ===========================================================================
-- Post-run action: paste result grid back to user for review.
-- If SECTION H shows 12/12, Wave 1 schema parts A+B are confirmed applied.
-- If any row in SECTION A is MISSING, the corresponding ALTER failed.
-- If any view in SECTION C is absent, dashboard 404 will appear.
-- If SECTION G returns errors, smoke test fails — investigate before shipping.
-- ===========================================================================
