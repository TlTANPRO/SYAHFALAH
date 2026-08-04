-- 010_security_lockdown.sql
-- Lock down RLS so anon key can no longer read or write sensitive data.
--
-- Background: migration 001 issued `GRANT ALL ON ALL TABLES IN SCHEMA public TO anon,
-- authenticated;` which gave anon a GRANT to every table. RLS policies then
-- intended to filter, but policies using `auth.uid()`, `id = auth.uid()`, etc.
-- evaluate to `id = NULL` for anon — which is filtered out by Postgres by
-- default. However, the GRANT was permissive enough that an anon POST/PATCH
-- can still pass the policy check for some tables (e.g. users) because the
-- USING clause `<column> = auth.uid()` returned NULL but the inner EXISTS or
-- arithmetic allowed the row through. The combined effect was: anon can read
-- `users.email`, `users.phone`, `users.pin_hash`, `users.pin_salt` and PATCH
-- `users.position` via the public REST API.
--
-- Strategy:
-- 1. REVOKE ALL on every table from anon (and re-grant SELECT only on the
--    specific tables/views that anon genuinely needs read access to).
-- 2. Add explicit INSERT/UPDATE/DELETE blocking policies on sensitive tables.
-- 3. Keep authenticated users as-is (they go through Supabase JWT and the
--    existing RLS policies).
--
-- Safe to run multiple times (idempotent).

-- ============================================================
-- STEP 1: REVOKE ALL from anon, then re-grant SELECT only on
-- the public-facing views/tables.
-- ============================================================
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- Public read access (these are the dashboard views everyone can see)
GRANT SELECT ON public.team_personal_kpis TO anon;
GRANT SELECT ON public.division_kpi_summary TO anon;
GRANT SELECT ON public.division_task_summary TO anon;
GRANT SELECT ON public.sow_with_tasks TO anon;
GRANT SELECT ON public.kpis TO anon;
GRANT SELECT ON public.notifications_with_user TO anon;
-- divisions is referenced by views; allow read so joins work
GRANT SELECT ON public.divisions TO anon;

-- Explicit DENY for anon on sensitive tables. Without RLS changes here,
-- anon now has no GRANT and any attempt to scan (no-role) returns 401.
-- Adding an explicit policy keeps the intent clear and survives future
-- GRANT changes.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon cannot read users" ON users;
CREATE POLICY "anon cannot read users" ON users
  FOR ALL TO anon
  USING (false)
  WITH CHECK (false);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon cannot read tasks" ON tasks;
CREATE POLICY "anon cannot read tasks" ON tasks
  FOR ALL TO anon
  USING (false)
  WITH CHECK (false);

ALTER TABLE kpi_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon cannot read kpi_definitions" ON kpi_definitions;
CREATE POLICY "anon cannot read kpi_definitions" ON kpi_definitions
  FOR ALL TO anon
  USIN