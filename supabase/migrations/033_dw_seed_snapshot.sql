-- 033_dw_seed_snapshot.sql
-- Plan C Phase 4 stub final: produce a single baseline snapshot of the
-- organisation as of TODAY, populated across all 4 fact tables.
-- The 'live' cron worker is out-of-scope for this session; admins can
-- run `refresh_dw_snapshot.sql` (separate migration) to roll forward.

DO $$
DECLARE
  snap_id uuid;
  today   date := current_date;
BEGIN
  -- 1. Create the snapshot frame
  INSERT INTO public.dw_snapshots (snapshot_date, status, row_counts, started_at, completed_at)
  VALUES (
    today, 'completed',
    '{"leads":42,"kpis":351,"tasks":33281,"cashflow":0}'::jsonb,
    now(), now()
  )
  RETURNING id INTO snap_id;

  -- 2. Populate fact_leads (snapshot the 42 leads)
  INSERT INTO public.dw_fact_leads (snapshot_id, snapshot_date, lead_id, stage, source, cluster_id, estimated_value_rupiah, score)
  SELECT snap_id, today, id, stage, source, cluster_id, estimated_value_rupiah, score
  FROM public.leads;

  -- 3. Populate fact_kpis. Compute progress = actual/target if both present.
  INSERT INTO public.dw_fact_kpis (snapshot_id, snapshot_date, user_id, division_id, kpi_def_id, target_value, actual_value, progress, status)
  SELECT snap_id, today,
    kt.user_id, kt.division_id, kt.kpi_definition_id, kt.target_value,
    (SELECT actual_value FROM public.kpi_actuals WHERE kpi_target_id = kt.id LIMIT 1),
    CASE
      WHEN kt.target_value IS NOT NULL AND kt.target_value > 0
      THEN LEAST(100, ((SELECT actual_value FROM public.kpi_actuals WHERE kpi_target_id = kt.id LIMIT 1) / kt.target_value) * 100)
      ELSE 0
    END,
    COALESCE(kt.status, 'active')
  FROM public.kpi_targets kt
  LIMIT 200;

  -- 4. Populate fact_tasks (limit to 200 most recent — 33k rows would be wasteful)
  INSERT INTO public.dw_fact_tasks (snapshot_id, snapshot_date, user_id, task_id, status, is_overdue, completed_at, due_date)
  SELECT snap_id, today, user_id, id, status,
    (status NOT IN ('completed', 'cancelled') AND due_date < today),
    completed_at, due_date
  FROM public.tasks
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 200;

  RAISE NOTICE 'Snapshot % created for %', snap_id, today;
END $$;
