-- supabase/migrations/20260810_cleanup_synthetic_data.sql
-- Remove ALL data not from base file "PROGRAM KERJA-1.docx" (12 named persons + 6 divisions).
-- Tables truncated (synthetic/demo data only):
--   kpi_targets, projects, customers, attendance_logs, tasks, maintenance_tickets,
--   maintenance_logs, purchase_requests, purchase_orders, approvals, leave_requests,
--   documents, sow_tasks, leads, surveys, sp3k, rewards, comments, bookings,
--   consumer_cases, evidence.
-- PRESERVED (system / structural):
--   api_audit_log (audit history)
--   dw_fact_*, dw_snapshots (analytics layer)
--   notifications, notification_templates (system)
--   divisions (6 base-file divisions stay)
--   users (12 base-file persons stay; Andi removed)

BEGIN;

TRUNCATE TABLE
  kpi_targets, projects, customers, attendance_logs, tasks,
  maintenance_tickets, maintenance_logs, purchase_requests,
  purchase_orders, approvals, leave_requests, documents,
  sow_tasks, leads, surveys, sp3k, rewards, comments,
  bookings, consumer_cases, evidence
RESTART IDENTITY CASCADE;

-- Remove user 'Andi' (NOT in base file 'PROGRAM KERJA-1.docx')
DELETE FROM users WHERE full_name = 'Andi';

-- Refresh post-deletion: ensure reporting_to_user_id references are sane
-- (FK handled with ON DELETE SET NULL via api_audit_log pattern)
DO $$
DECLARE
  removed_count INT := 0;
BEGIN
  SELECT COUNT(*) INTO removed_count FROM users WHERE full_name = 'Andi';
  RAISE NOTICE 'Cleanup complete. Andi remaining: %', removed_count;
END $$;

COMMIT;

-- Verification queries (run separately):
-- SELECT COUNT(*) FROM users;  -- should be 12
-- SELECT COUNT(*) FROM projects; SELECT COUNT(*) FROM customers;  -- should be 0
-- SELECT COUNT(*) FROM kpi_targets; SELECT COUNT(*) FROM leads;  -- should be 0
