-- 018_purchasing.sql
-- Plan C Phase 2 — Purchasing module.
-- Creates 4 tables: suppliers, materials, purchase_requests, purchase_orders.
-- Optional: stock_ledger (transaction log).
-- Idempotent.

BEGIN;

-- =================
-- suppliers table
-- =================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'suppliers'
  ) THEN
    CREATE TABLE public.suppliers (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code          TEXT UNIQUE,
      name          TEXT NOT NULL,
      contact_name  TEXT,
      phone         TEXT,
      email         TEXT,
      address       TEXT,
      npwp          TEXT,
      bank_account  TEXT,
      notes         TEXT,
      is_active     BOOLEAN NOT NULL DEFAULT true,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- =================
-- materials table (catalog)
-- =================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'materials'
  ) THEN
    CREATE TABLE public.materials (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code          TEXT UNIQUE,
      name          TEXT NOT NULL,
      category      TEXT,
      unit          TEXT NOT NULL DEFAULT 'pcs',
      standard_price_rupiah NUMERIC(14, 2) DEFAULT 0,
      description   TEXT,
      is_active     BOOLEAN NOT NULL DEFAULT true,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- =================
-- purchase_requests table
-- =================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'purchase_requests'
  ) THEN
    CREATE TABLE public.purchase_requests (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code          TEXT UNIQUE,
      requester_id  UUID REFERENCES public.users(id) ON DELETE SET NULL,
      project_id    UUID REFERENCES public.projects(id) ON DELETE SET NULL,
      title         TEXT NOT NULL,
      description   TEXT,
      needed_by     DATE,
      status        TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected','ordered','cancelled')),
      approver_id   UUID REFERENCES public.users(id) ON DELETE SET NULL,
      approved_at   TIMESTAMPTZ,
      notes         TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- =================
-- purchase_orders table
-- =================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'purchase_orders'
  ) THEN
    CREATE TABLE public.purchase_orders (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code          TEXT UNIQUE,
      request_id    UUID REFERENCES public.purchase_requests(id) ON DELETE SET NULL,
      supplier_id   UUID REFERENCES public.suppliers(id) ON DELETE RESTRICT,
      project_id    UUID REFERENCES public.projects(id) ON DELETE SET NULL,
      total_rupiah  NUMERIC(14, 2) NOT NULL DEFAULT 0,
      status        TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','sent','confirmed','received','cancelled')),
      order_date    DATE,
      expected_date DATE,
      received_date DATE,
      notes         TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- =================
-- Indexes
-- =================
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON public.suppliers(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_materials_category ON public.materials(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_materials_active ON public.materials(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_purchase_requests_status ON public.purchase_requests(status) WHERE status IN ('pending','approved');
CREATE INDEX IF NOT EXISTS idx_purchase_requests_requester ON public.purchase_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_project ON public.purchase_orders(project_id);

-- =================
-- Grants
-- =================
GRANT SELECT ON public.suppliers         TO anon, authenticated;
GRANT SELECT ON public.materials         TO anon, authenticated;
GRANT SELECT ON public.purchase_requests TO anon, authenticated;
GRANT SELECT ON public.purchase_orders   TO anon, authenticated;
GRANT ALL    ON public.suppliers         TO authenticated, service_role;
GRANT ALL    ON public.materials         TO authenticated, service_role;
GRANT ALL    ON public.purchase_requests TO authenticated, service_role;
GRANT ALL    ON public.purchase_orders   TO authenticated, service_role;

-- ROLLBACK
-- DROP INDEX IF EXISTS idx_purchase_orders_project;
-- DROP INDEX IF EXISTS idx_purchase_orders_supplier;
-- DROP INDEX IF EXISTS idx_purchase_orders_status;
-- DROP INDEX IF EXISTS idx_purchase_requests_requester;
-- DROP INDEX IF EXISTS idx_purchase_requests_status;
-- DROP INDEX IF EXISTS idx_materials_active;
-- DROP INDEX IF EXISTS idx_materials_category;
-- DROP INDEX IF EXISTS idx_suppliers_active;
-- DROP TABLE IF EXISTS public.purchase_orders;
-- DROP TABLE IF EXISTS public.purchase_requests;
-- DROP TABLE IF EXISTS public.materials;
-- DROP TABLE IF EXISTS public.suppliers;

COMMIT;
