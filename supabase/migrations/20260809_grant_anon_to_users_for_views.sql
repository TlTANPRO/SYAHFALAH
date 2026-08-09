-- supabase/migrations/20260809_grant_anon_to_users_for_views.sql
-- Grant SELECT on users to anon role.
-- REQUIRED for views that join users table (team_personal_kpis, division_kpi_summary,
-- division_task_summary, notifications_with_user) to be readable by anon role.
-- Without this, the view runs as postgres with BYPASSRLS, but PostgREST checks
-- the requesting role's grants on the underlying tables — anon has no SELECT
-- on users, so the view returns 401 (permission denied).
--
-- RLS still applies: anon gets no auth.uid(), so the users.authenticated_read
-- policy doesn't match and anon sees 0 rows. This is the correct behavior:
-- anon can make the query but doesn't see any data.
-- Authenticated users (after login) get their full row set per RLS.

GRANT SELECT ON public.users TO anon;
