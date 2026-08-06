-- 023_data_warehouse.sql
-- Plan C Phase 4 — Data warehouse (snapshot schema).
-- Creates minimal fact/dimension tables for offline analytics + BI export.
-- Idempotent.

BEGIN;

-- =================
-- dw_snapshots (control table)
-- =================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'dw_snapshots'
  ) THEN
    CREATE TABLE public.dw_snapshots (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      snapshot_date DATE NOT NULL,
      status        TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','running','completed','failed')),
      row_counts    JSONB NOT NULL DEFAULT '{}'::jsonb,
      started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at  TIMESTAMPTZ,
      error_message TEXT
    );
  END IF;
END $$;

-- =================
-- dw_fact_kpis (daily KPI snapshot per user/division)
-- =================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'dw_fact_kpis'
  ) THEN
    CREATE TABLE public.dw_fact_kpis (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      snapshot_id   UUID NOT NULL REFERENCES public.dw_snapshots(id) ON DELETE CASCADE,
      snapshot_date DATE NOT NULL,
      user_id       UUID,
      division_id   UUID,
      kpi_def_id    UUID,
      target_value  NUMERIC(14, 2),
      actual_value  NUMERIC(14, 2),
      progress      NUMERIC(5, 2),
      status        TEXT
    );
  END IF;
END $$;

-- =================
-- dw_fact_leads (daily lead pipeline snapshot)
-- =================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'dw_fact_leads'
  ) THEN
    CREATE TABLE public.dw_fact_leads (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      snapshot_id   UUID NOT NULL REFERENCES public.dw_snapshots(id) ON DELETE CASCADE,
      snapshot_date DATE NOT NULL,
      lead_id       UUID,
      stage         TEXT,
      source        TEXT,
      cluster_id    UUID,
      estimated_value_rupiah NUMERIC(14, 2),
      score         INT
    );
  END IF;
END $$;

-- =================
-- dw_fact_tasks (daily task completion rate)
-- =================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'dw_fact_tasks'
  ) THEN
    CREATE TABLE public.dw_fact_tasks (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      snapshot_id   UUID NOT NULL REFERENCES public.dw_snapshots(id) ON DELETE CASCADE,
      snapshot_date DATE NOT NULL,
      user_id       UUID,
      task_id       UUID,
      status        TEXT,
      is_overdue    BOOLEAN,
      completed_at  TIMESTAMPTZ,
      due_date      DATE
    );
  END IF;
END $$;

-- =================
-- dw_fact_cashflow (consumer case + PO totals)
-- =================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'dw_fact_cashflow'
  ) THEN
    CREATE TABLE public.dw_fact_cashflow (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      snapshot_id   UUID NOT NULL REFERENCES public.dw_snapshots(id) ON DELETE CASCADE,
      snapshot_date DATE NOT NULL,
      kind          TEXT CHECK (kind IN ('consumer_case','purchase_order','booking')),
      ref_id        UUID,
      cluster_id    UUID,
      status        TEXT,
      amount_rupiah NUMERIC(14, 2)
    );
  END IF;
END $$;

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_dw_snapshots_date_unique ON public.dw_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_dw_fact_kpis_snapshot_user ON public.dw_fact_kpis(snapshot_date, user_id);
CREATE INDEX IF NOT EXISTS idx_dw_fact_leads_snapshot_stage ON public.dw_fact_leads(snapshot_date, stage);
CREATE INDEX IF NOT EXISTS idx_dw_fact_tasks_snapshot_status ON public.dw_fact_tasks(snapshot_date, status);
CREATE INDEX IF NOT EXISTS idx_dw_fact_cashflow_snapshot_kind ON public.dw_fact_cashflow(snapshot_date, kind);

-- Grants
GRANT SELECT ON public.dw_snapshots, public.dw_fact_kpis, public.dw_fact_leads, public.dw_fact_tasks, public.dw_fact_cashflow TO authenticated, service_role;
GRANT ALL    ON public.dw_snapshots, public.dw_fact_kpis, public.dw_fact_leads, public.dw_fact_tasks, public.dw_fact_cashflow TO service_role;

-- ROLLBACK
-- DROP INDEX IF EXISTS idx_dw_fact_cashflow_snapshot_kind;
-- DROP INDEX IF EXISTS idx_dw_fact_tasks_snapshot_status;
-- DROP INDEX IF EXISTS idx_dw_fact_leads_snapshot_stage;
-- DROP INDEX IF EXISTS idx_dw_fact_kpis_snapshot_user;
-- DROP INDEX IF EXISTS idx_dw_snapshots_date_unique;
-- DROP TABLE IF EXISTS public.dw_fact_cashflow;
-- DROP TABLE IF EXISTS public.dw_fact_tasks;
-- DROP TABLE IF EXISTS public.dw_fact_leads;
-- DROP TABLE IF EXISTS public.dw_fact_kpis;
-- DROP TABLE IF EXISTS public.dw_snapshots;

COMMIT;
