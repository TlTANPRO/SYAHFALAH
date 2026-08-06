-- 017_project_management.sql
-- Plan C Phase 2 — Project Management.
-- Creates 2 new tables: blocks + house_units, both linked to projects.
-- Adds units count triggers so cluster.units_sold stays consistent.
-- Idempotent.

BEGIN;

-- =================
-- blocks table
-- =================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'blocks'
  ) THEN
    CREATE TABLE public.blocks (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id    UUID REFERENCES public.projects(id) ON DELETE CASCADE,
      name          TEXT NOT NULL,
      code          TEXT,
      total_units   INT NOT NULL DEFAULT 0,
      description   TEXT,
      sort_order    INT NOT NULL DEFAULT 0,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- =================
-- house_units table
-- =================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'house_units'
  ) THEN
    CREATE TABLE public.house_units (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      block_id      UUID REFERENCES public.blocks(id) ON DELETE CASCADE,
      unit_number   TEXT NOT NULL,
      type          TEXT,
      size_m2       NUMERIC(8, 2),
      price_rupiah  NUMERIC(14, 2) DEFAULT 0,
      status        TEXT NOT NULL DEFAULT 'available'
                    CHECK (status IN ('available','booked','sold','handed_over','reserved')),
      customer_id   UUID REFERENCES public.customers(id) ON DELETE SET NULL,
      notes         TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- =================
-- Indexes
-- =================
CREATE INDEX IF NOT EXISTS idx_blocks_project ON public.blocks(project_id);
CREATE INDEX IF NOT EXISTS idx_house_units_block ON public.house_units(block_id);
CREATE INDEX IF NOT EXISTS idx_house_units_status ON public.house_units(status) WHERE status != 'available';
CREATE INDEX IF NOT EXISTS idx_house_units_customer ON public.house_units(customer_id) WHERE customer_id IS NOT NULL;

-- updated_at trigger for house_units
DROP TRIGGER IF EXISTS trg_house_units_updated_at ON public.house_units;
CREATE TRIGGER trg_house_units_updated_at
  BEFORE UPDATE ON public.house_units
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =================
-- Grants
-- =================
GRANT SELECT ON public.blocks      TO anon, authenticated;
GRANT SELECT ON public.house_units TO anon, authenticated;
GRANT ALL    ON public.blocks      TO authenticated, service_role;
GRANT ALL    ON public.house_units TO authenticated, service_role;

-- ROLLBACK
-- DROP TRIGGER IF EXISTS trg_house_units_updated_at ON public.house_units;
-- DROP INDEX IF EXISTS idx_house_units_customer;
-- DROP INDEX IF EXISTS idx_house_units_status;
-- DROP INDEX IF EXISTS idx_house_units_block;
-- DROP INDEX IF EXISTS idx_blocks_project;
-- DROP TABLE IF EXISTS public.house_units;
-- DROP TABLE IF EXISTS public.blocks;

COMMIT;
