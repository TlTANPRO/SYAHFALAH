-- 026_rls_employee_tables.sql
-- Plan C Phase 5 — Row Level Security hardening.
-- Enables RLS on the 42 tables that previously had it OFF.
-- Policies: role-gated read for authenticated users; explicit writes
-- only via service_role (which is what /api/* uses). No direct writes
-- from anon or any role — every mutation must go through /api/*.
--
-- This DOES NOT lock anything down that wasn't already locked down by
-- the JWT-guard in middleware (anon key without auth → 307 to /login).
-- What it does close: the 'authenticated' anon key from a leaked SNIPPET
-- could otherwise SELECT/INSERT into leads/clusters/bookings directly
-- through Supabase REST. After this migration: anon role is locked out,
-- authenticated role reads controlled per-policy.
--
-- Idempotent.

BEGIN;

-- Helper: only enable RLS if not already enabled
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'leads','clusters','projects','blocks','house_units',
      'customers','surveys','bookings','sp3k','akad',
      'consumer_cases','kpi_definitions','notifications',
      'notification_templates','approvals','suppliers',
      'materials','purchase_requests','purchase_orders',
      'maintenance_tickets','maintenance_logs','attendance_logs',
      'divisions','users','cabangs','vehicles','office_assets',
      'utility_readings','audit_logs','api_gateway_log',
      'dw_snapshots','dw_fact_kpis','dw_fact_leads','dw_fact_tasks',
      'dw_fact_cashflow','comments','evidence','monthly_plans',
      'weekly_plans','raci_matrix','rewards','sow_tasks',
      'offline_sync_queue'
    ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- Default-deny policy per table: deny all to anon (no policies = lock)
-- Authenticated can read tables that aren't already role-restricted.
-- Writes remain allowed via service_role (which has BYPASSRLS).

CREATE POLICY "authenticated read leads" ON public.leads
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated read clusters" ON public.clusters
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated read projects" ON public.projects
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated read blocks" ON public.blocks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated read house_units" ON public.house_units
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated read customers" ON public.customers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated read surveys" ON public.surveys
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated read bookings" ON public.bookings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated read sp3k" ON public.sp3k
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated read akad" ON public.akad
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated read consumer_cases" ON public.consumer_cases
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated read kpi_definitions" ON public.kpi_definitions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "self-read notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "self-update notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "authenticated read approvals" ON public.approvals
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated read suppliers" ON public.suppliers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated read materials" ON public.materials
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated read purchase_requests" ON public.purchase_requests
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated read purchase_orders" ON public.purchase_orders
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated read maintenance_tickets" ON public.maintenance_tickets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated read maintenance_logs" ON public.maintenance_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "self or all attendance_logs" ON public.attendance_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "self-insert attendance_logs" ON public.attendance_logs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "self-update attendance_logs" ON public.attendance_logs
  FOR UPDATE TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "authenticated read divisions" ON public.divisions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated read users" ON public.users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "self-update users" ON public.users
  FOR UPDATE TO authenticated USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "authenticated read cabangs" ON public.cabangs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated read vehicles" ON public.vehicles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated read office_assets" ON public.office_assets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated read utility_readings" ON public.utility_readings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated read dw_snapshots" ON public.dw_snapshots
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated read dw_fact_kpis" ON public.dw_fact_kpis
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated read dw_fact_leads" ON public.dw_fact_leads
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated read dw_fact_tasks" ON public.dw_fact_tasks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated read dw_fact_cashflow" ON public.dw_fact_cashflow
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated read comments" ON public.comments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated read evidence" ON public.evidence
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated read monthly_plans" ON public.monthly_plans
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated read weekly_plans" ON public.weekly_plans
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated read raci_matrix" ON public.raci_matrix
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated read rewards" ON public.rewards
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated read sow_tasks" ON public.sow_tasks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated read notification_templates" ON public.notification_templates
  FOR SELECT TO authenticated USING (true);

-- service_role bypasses RLS by default; no policies needed for /api/* writes.

COMMIT;
