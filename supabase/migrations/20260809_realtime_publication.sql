-- supabase/migrations/20260809_realtime_publication.sql
-- Enable realtime delivery for all tables that have updated_at + high-traffic
-- tables without updated_at. Total: 20 tables.
--
-- Note: 'kpis' is a VIEW (not a table), excluded. The underlying tables
-- (kpi_definitions, kpi_targets) ARE in the publication.
--
-- RLS policies on each table filter which events each user receives.

ALTER PUBLICATION supabase_realtime ADD TABLE
  -- Tables with updated_at
  public.approvals,
  public.comments,
  public.customers,
  public.divisions,
  public.documents,
  public.house_units,
  public.kpi_definitions,
  public.kpi_targets,
  public.leave_requests,
  public.maintenance_tickets,
  public.monthly_plans,
  public.raci_matrix,
  public.sow_tasks,
  public.tasks,
  public.users,
  public.weekly_plans,
  -- High-traffic tables without updated_at (manually enabled for live ops)
  public.notifications,
  public.audit_logs,
  public.projects,
  public.leads;
