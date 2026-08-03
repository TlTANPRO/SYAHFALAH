-- 008_fix_view_rls.sql
-- Fix: anon/authenticated users getting 404 on dashboard views
-- because the views (team_personal_kpis, division_kpi_summary,
-- division_task_summary) don't have explicit RLS policies, and
-- Postgres 15+ requires security_invoker to respect underlying RLS.
--
-- Two changes:
-- 1. Drop + recreate the 3 dashboard views with security_invoker = true
--    so they evaluate RLS using the *querying* user's identity, not the
--    view owner's.
-- 2. Grant SELECT on those views to authenticated and anon roles.
--
-- Safe to run multiple times (idempotent).

-- ============================================================
-- DROP OLD VIEW DEFINITIONS
-- ============================================================
DROP VIEW IF EXISTS public.team_personal_kpis CASCADE;
DROP VIEW IF EXISTS public.division_kpi_summary CASCADE;
DROP VIEW IF EXISTS public.division_task_summary CASCADE;

-- ============================================================
-- team_personal_kpis (recreated)
-- ============================================================
CREATE VIEW public.team_personal_kpis
WITH (security_invoker = true) AS
SELECT
  u.id as user_id,
  u.name,
  u.position,
  u.division_id,
  d.name as division_name,
  COUNT(k.id) as kpi_count,
  COUNT(k.id) FILTER (WHERE k.status = 'achieved') as achieved_count,
  COUNT(k.id) FILTER (WHERE k.status = 'on_track') as on_track_count,
  COUNT(k.id) FILTER (WHERE k.status = 'at_risk') as at_risk_count,
  COUNT(k.id) FILTER (WHERE k.status = 'off_track') as off_track_count,
  COALESCE(AVG(k.progress), 0) as avg_progress
FROM public.users u
LEFT JOIN public.divisions d ON u.division_id = d.id
LEFT JOIN public.kpis k ON k.user_id = u.id
WHERE u.is_active = true
GROUP BY u.id, u.name, u.position, u.division_id, d.name;

-- ============================================================
-- division_kpi_summary (recreated)
-- ============================================================
CREATE VIEW public.division_kpi_summary
WITH (security_invoker = true) AS
SELECT
  d.id as division_id,
  d.name as division_name,
  d.code as division_code,
  COUNT(k.id) as kpi_count,
  COUNT(k.id) FILTER (WHERE k.status = 'achieved') as achieved_count,
  COUNT(k.id) FILTER (WHERE k.status = 'on_track') as on_track_count,
  COUNT(k.id) FILTER (WHERE k.status = 'at_risk') as at_risk_count,
  COUNT(k.id) FILTER (WHERE k.status = 'off_track') as off_track_count,
  COALESCE(AVG(k.progress), 0) as avg_progress
FROM public.divisions d
LEFT JOIN public.kpis k ON k.division_id = d.id
GROUP BY d.id, d.name, d.code;

-- ============================================================
-- division_task_summary (recreated)
-- ============================================================
CREATE VIEW public.division_task_summary
WITH (security_invoker = true) AS
SELECT
  d.id as division_id,
  d.name as division_name,
  COUNT(t.id) as total_tasks,
  COUNT(t.id) FILTER (WHERE t.status = 'pending') as pending_count,
  COUNT(t.id) FILTER (WHERE t.status = 'in_progress') as in_progress_count,
  COUNT(t.id) FILTER (WHERE t.status = 'completed') as completed_count,
  COUNT(t.id) FILTER (WHERE t.status = 'overdue') as overdue_count,
  COUNT(t.id) FILTER (WHERE t.is_carry_over = true) as carry_over_count,
  CASE
    WHEN COUNT(t.id) = 0 THEN 0
    ELSE ROUND((COUNT(t.id) FILTER (WHERE t.status = 'completed')::numeric / COUNT(t.id)::numeric) * 100, 1)
  END as completion_rate
FROM public.divisions d
LEFT JOIN public.tasks t ON t.division_id = d.id
GROUP BY d.id, d.name;

-- ============================================================
-- GRANTS
-- ============================================================
GRANT SELECT ON public.team_personal_kpis TO authenticated, anon;
GRANT SELECT ON public.division_kpi_summary TO authenticated, anon;
GRANT SELECT ON public.division_task_summary TO authenticated, anon;

-- ============================================================
-- Note on kpis table 404: that one already has RLS policies, but
-- the page query (level=eq.company, period_start=..., period_end=...)
-- relies on those policies allowing the read. If you still get 404
-- on the kpis table after this migration runs, double-check the
-- "Users can read relevant KPIs" policy in 002_rls_policies.sql
-- includes the relevant USING clause for company-level KPIs.
-- ============================================================