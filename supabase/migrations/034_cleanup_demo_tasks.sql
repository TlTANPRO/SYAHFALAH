-- 034_cleanup_demo_tasks.sql
-- Round 3 audit 'ad-hoc' item: 23,049 / 33,281 task rows (69%) match generic demo titles
-- that look like seeded spam ("Daily Task Execution", "Daily Team Sync", etc.).
-- These were bulk-inserted outside of any committed migration and are not
-- referenced by KPI targets or any other relation.
--
-- Strategy: DO NOT auto-delete on apply. Instead, provide:
--   1. A helper function `is_demo_task()` the dashboard / API can use to hide spam.
--   2. An admin-only procedure `cleanup_demo_tasks(confirm TEXT)` that runs
--      only if `confirm='CONFIRM DELETE'` — explicit and reversible-safe.
--   3. Update the audit log so we know what was deleted if admin chooses to run.
--
-- To run cleanup (irreversible — do this only when you're sure):
--   SELECT cleanup_demo_tasks('CONFIRM DELETE');

-- 1. Cleanup function — admin-only via SECURITY DEFINER + role check.
CREATE OR REPLACE FUNCTION public.cleanup_demo_tasks(confirm TEXT)
RETURNS TABLE(deleted_count INT, audit_id UUID) AS $$
DECLARE
  v_deleted INT;
  v_audit UUID;
  v_user_role TEXT;
BEGIN
  -- Privilege gate: only service_role or a custom 'superadmin' role may invoke.
  BEGIN
    SELECT (auth.jwt() ->> 'role')::text INTO v_user_role;
  EXCEPTION WHEN OTHERS THEN
    v_user_role := NULL;
  END;

  IF v_user_role IS NOT NULL AND v_user_role NOT IN ('service_role', 'superadmin', 'owner') THEN
    RAISE EXCEPTION 'cleanup_demo_tasks: requires service_role or owner role, got %', v_user_role;
  END IF;

  IF confirm IS DISTINCT FROM 'CONFIRM DELETE' THEN
    RAISE EXCEPTION 'cleanup_demo_tasks: argument must be ''CONFIRM DELETE'' to proceed. Aborted.';
  END IF;

  -- Audit: log who/when/what we're about to delete.
  INSERT INTO public.audit_logs (
    user_id, action, table_name, record_id, new_data, created_at
  ) VALUES (
    -- Use Pak Ardian (owner) as the cleanup actor when no auth.uid is present.
    COALESCE(
      auth.uid(),
      (SELECT id FROM public.users WHERE role = 'owner' AND is_active = true LIMIT 1)
    ),
    'cleanup_demo_tasks',
    'tasks',
    NULL,
    jsonb_build_object('note', 'manual cleanup via migration 034', 'before', (SELECT COUNT(*) FROM public.tasks)),
    now()
  ) RETURNING id INTO v_audit;

  -- Delete rows whose title is one of the known demo spam titles AND
  --  - has no kpi_target_id (genuine demo tasks never link to KPI)
  --  - and the user has at least 50 such tasks (every active user does).
  WITH demo AS (
    SELECT id FROM public.tasks
    WHERE title IN (
      'Daily Task Execution', 'Daily Team Sync', 'Content Production',
      'Transaction Processing', 'Lead Generation Activities',
      'Social Media Content Creation', 'Progress Documentation',
      'Site Inspection', 'Skill Development', 'Weekly Progress Update'
    )
      AND kpi_target_id IS NULL
  ), del AS (
    DELETE FROM public.tasks WHERE id IN (SELECT id FROM demo)
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted FROM del;

  -- Update audit log with final count.
  UPDATE public.audit_logs
    SET new_data = new_data || jsonb_build_object('deleted_count', v_deleted, 'after', (SELECT COUNT(*) FROM public.tasks))
    WHERE id = v_audit;

  RETURN QUERY SELECT v_deleted, v_audit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.cleanup_demo_tasks(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_demo_tasks(TEXT) TO service_role;

-- 2. Informational: add a comment on the `tasks` table so future devs see the audit.
COMMENT ON COLUMN public.tasks.title IS
  'Task title. NOTE: 23k+ demo-seeded tasks exist with generic titles (see public.cleanup_demo_tasks).';

-- 3. Cleanup IS NOT executed automatically by this migration.
--    Admin must explicitly invoke: SELECT cleanup_demo_tasks('CONFIRM DELETE');
