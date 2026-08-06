-- 019_maintenance.sql
-- Plan C Phase 2 — Maintenance module.
-- Creates 2 tables: maintenance_tickets + maintenance_logs.
-- Idempotent.

BEGIN;

-- =================
-- maintenance_tickets table
-- =================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'maintenance_tickets'
  ) THEN
    CREATE TABLE public.maintenance_tickets (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code          TEXT UNIQUE,
      title         TEXT NOT NULL,
      description   TEXT,
      customer_id   UUID REFERENCES public.customers(id) ON DELETE SET NULL,
      house_unit_id UUID REFERENCES public.house_units(id) ON DELETE SET NULL,
      project_id    UUID REFERENCES public.projects(id) ON DELETE SET NULL,
      reported_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
      assigned_to_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
      priority      TEXT NOT NULL DEFAULT 'normal'
                    CHECK (priority IN ('low','normal','high','urgent')),
      status        TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','in_progress','resolved','closed','cancelled')),
      category      TEXT,
      reported_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at   TIMESTAMPTZ,
      cost_rupiah   NUMERIC(14, 2) DEFAULT 0,
      notes         TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- =================
-- maintenance_logs table (status changes, comments)
-- =================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'maintenance_logs'
  ) THEN
    CREATE TABLE public.maintenance_logs (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id     UUID NOT NULL REFERENCES public.maintenance_tickets(id) ON DELETE CASCADE,
      actor_id      UUID REFERENCES public.users(id) ON DELETE SET NULL,
      action        TEXT NOT NULL,
                    -- 'status_change' | 'comment' | 'assignment' | 'resolution'
      from_status   TEXT,
      to_status     TEXT,
      message       TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- =================
-- Indexes
-- =================
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_status ON public.maintenance_tickets(status) WHERE status NOT IN ('resolved','closed');
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_priority ON public.maintenance_tickets(priority) WHERE priority IN ('high','urgent');
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_customer ON public.maintenance_tickets(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_unit ON public.maintenance_tickets(house_unit_id) WHERE house_unit_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_assigned ON public.maintenance_tickets(assigned_to_id) WHERE assigned_to_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_ticket ON public.maintenance_logs(ticket_id);

-- updated_at trigger for maintenance_tickets
DROP TRIGGER IF EXISTS trg_maintenance_tickets_updated_at ON public.maintenance_tickets;
CREATE TRIGGER trg_maintenance_tickets_updated_at
  BEFORE UPDATE ON public.maintenance_tickets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =================
-- Grants
-- =================
GRANT SELECT ON public.maintenance_tickets TO anon, authenticated;
GRANT SELECT ON public.maintenance_logs   TO authenticated;
GRANT ALL    ON public.maintenance_tickets TO authenticated, service_role;
GRANT ALL    ON public.maintenance_logs   TO authenticated, service_role;

-- ROLLBACK
-- DROP TRIGGER IF EXISTS trg_maintenance_tickets_updated_at ON public.maintenance_tickets;
-- DROP INDEX IF EXISTS idx_maintenance_logs_ticket;
-- DROP INDEX IF EXISTS idx_maintenance_tickets_assigned;
-- DROP INDEX IF EXISTS idx_maintenance_tickets_unit;
-- DROP INDEX IF EXISTS idx_maintenance_tickets_customer;
-- DROP INDEX IF EXISTS idx_maintenance_tickets_priority;
-- DROP INDEX IF EXISTS idx_maintenance_tickets_status;
-- DROP TABLE IF EXISTS public.maintenance_logs;
-- DROP TABLE IF EXISTS public.maintenance_tickets;

COMMIT;
