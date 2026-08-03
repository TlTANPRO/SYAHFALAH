-- =============================================================
-- 009_create_missing_views.sql
-- =============================================================
-- Reconciles the dashboard code (which was written against an older
-- "single-table" schema where `kpis` and `sows` existed) with the
-- actual current database schema (which uses a normalized
-- 3-table KPI design + flat sow_tasks).
--
-- Without these views the dashboard's REST queries 404 because
-- PostgREST exposes only what's in public schema:
--
--   GET /rest/v1/kpis              → 404 (table missing)
--   GET /rest/v1/team_personal_kpis → 404 (view missing)
--   GET /rest/v1/sow_with_tasks    → 404 (view missing)
--
-- Run via Supabase SQL Editor or `psql -f` after connecting.
-- Safe to run multiple times: every CREATE uses OR REPLACE.
-- =============================================================

-- =============================================================
-- VIEW 1: kpis
-- Flatten the 3-table KPI design (definitions + targets + actuals)
-- into a single "kpis" virtual table the dashboard code already queries.
--
-- Joins:
--   kpi_definitions  → master KPI metadata (level, formula, weight)
--   kpi_targets      → per-period target (period, target_value)
--   kpi_actuals      → per-period actual (actual_value, recorded_at)
-- =============================================================
DROP VIEW IF EXISTS public.kpis CASCADE;
CREATE OR REPLACE VIEW public.kpis AS
SELECT
  d.id                AS id,
  d.code              AS code,
  d.name              AS name,
  d.description       AS description,
  d.level             AS level,
  d.division_id       AS division_id,
  d.unit              AS unit,
  d.target_value      AS baseline_target_value,
  d.target_period     AS target_period,
  d.formula           AS formula,
  d.direction         AS direction,
  d.weight            AS weight,
  d.threshold_green   AS threshold_green,
  d.threshold_yellow  AS threshold_yellow,
  d.is_active         AS is_active,
  d.sort_order        AS sort_order,
  d.created_by        AS created_by,
  d.created_at        AS created_at,
  d.updated_at        AS updated_at,

  t.id                AS target_id,
  t.period            AS period,
  t.target_value      AS target_value,
  t.status            AS target_status,
  t.user_id           AS user_id,
  t.approved_by       AS approved_by,
  t.approved_at       AS approved_at,

  a.id                AS actual_id,
  a.actual_value      AS actual_value,
  a.recorded_by       AS recorded_by,
  a.recorded_at       AS recorded_at,
  a.is_verified       AS is_verified,

  -- derived fields the dashboard reads
  CASE
    WHEN a.actual_value IS NULL THEN 0
    WHEN t.target_value IS NULL OR t.target_value = 0 THEN 0
    WHEN d.direction = 'higher_better' THEN
      LEAST(100, ROUND((a.actual_value::numeric / t.target_value::numeric) * 100, 1))
    ELSE
      GREATEST(0, LEAST(100, ROUND((t.target_value::numeric / NULLIF(a.actual_value, 0)::numeric) * 100, 1)))
  END AS progress,

  CASE
    WHEN a.actual_value IS NULL OR t.target_value IS NULL THEN 'pending'
    WHEN d.direction = 'higher_better' AND (a.actual_value::numeric / NULLIF(t.target_value, 0)) >= (d.threshold_green / 100.0) THEN 'achieved'
    WHEN d.direction = 'lower_better'  AND (t.target_value::numeric / NULLIF(a.actual_value, 0)) >= (d.threshold_green / 100.0) THEN 'achieved'
    WHEN d.direction = 'higher_better' AND (a.actual_value::numeric / NULLIF(t.target_value, 0)) >= (d.threshold_yellow / 100.0) THEN 'on_track'
    WHEN d.direction = 'lower_better'  AND (t.target_value::numeric / NULLIF(a.actual_value, 0)) >= (d.threshold_yellow / 100.0) THEN 'on_track'
    ELSE 'at_risk'
  END AS status

FROM public.kpi_definitions d
LEFT JOIN public.kpi_targets  t ON t.kpi_definition_id = d.id
LEFT JOIN public.kpi_actuals  a ON a.kpi_target_id     = t.id;

GRANT SELECT ON public.kpis TO authenticated, anon;

-- =============================================================
-- VIEW 2: team_personal_kpis
-- Aggregates individual KPIs by user for the team KPI table.
-- =============================================================
DROP VIEW IF EXISTS public.team_personal_kpis CASCADE;
CREATE OR REPLACE VIEW public.team_personal_kpis AS
SELECT
  u.id              AS user_id,
  u.full_name       AS name,
  u.position        AS position,
  u.division_id     AS division_id,
  d.name            AS division_name,
  COUNT(k.id)       AS kpi_count,
  COUNT(k.id) FILTER (WHERE k.status = 'achieved')  AS achieved_count,
  COUNT(k.id) FILTER (WHERE k.status = 'on_track')  AS on_track_count,
  COUNT(k.id) FILTER (WHERE k.status = 'at_risk')   AS at_risk_count,
  COUNT(k.id) FILTER (WHERE k.status = 'off_track') AS off_track_count,
  COALESCE(AVG(k.progress), 0) AS avg_progress
FROM public.users u
LEFT JOIN public.divisions d ON u.division_id = d.id
LEFT JOIN public.kpis     k ON k.user_id     = u.id
WHERE u.is_active = true
GROUP BY u.id, u.full_name, u.position, u.division_id, d.name;

GRANT SELECT ON public.team_personal_kpis TO authenticated, anon;

-- =============================================================
-- VIEW 3: sow_with_tasks
-- sow_tasks is already flat (no parent sow header table exists),
-- so this view is a 1:1 wrapper that lets the code query
-- sow_with_tasks as if there were a sow header.
-- =============================================================
DROP VIEW IF EXISTS public.sow_with_tasks CASCADE;
CREATE OR REPLACE VIEW public.sow_with_tasks AS
SELECT
  t.id,
  t.code,
  t.title,
  t.description,
  t.division_id,
  t.pic_user_id,
  t.priority,
  t.status,
  t.start_date,
  t.end_date,
  t.estimated_hours,
  t.actual_hours,
  t.progress,
  t.dependencies,
  t.tags,
  t.created_by,
  t.created_at,
  t.updated_at,
  -- pseudo "sow" fields the dashboard code may read
  t.division_id             AS sow_id,
  t.title                   AS sow_name,
  t.division_id             AS sow_division_id
FROM public.sow_tasks t;

GRANT SELECT ON public.sow_with_tasks TO authenticated, anon;

-- =============================================================
-- Force PostgREST to refresh its schema cache so the new views
-- appear immediately (otherwise there can be a 30-60s lag).
-- =============================================================
NOTIFY pgrst, 'reload schema';