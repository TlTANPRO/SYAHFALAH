-- 021_operational_layer.sql
-- Plan C Phase 3 — Operational layer.
-- 4 tables: vehicles, office_assets, attendance_logs, utility_readings.
-- Idempotent.

BEGIN;

-- =================
-- vehicles table (kendaraan operasional)
-- =================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'vehicles'
  ) THEN
    CREATE TABLE public.vehicles (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code          TEXT UNIQUE,
      name          TEXT NOT NULL,
      plate_number  TEXT,
      vehicle_type  TEXT,                       -- 'pickup','sedan','truck','motor'
      assigned_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
      notes         TEXT,
      is_active     BOOLEAN NOT NULL DEFAULT true,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- =================
-- office_assets table
-- =================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'office_assets'
  ) THEN
    CREATE TABLE public.office_assets (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code          TEXT UNIQUE,
      name          TEXT NOT NULL,
      asset_type    TEXT,                       -- 'laptop','chair','projector', etc.
      serial_number TEXT,
      assigned_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
      purchase_date DATE,
      purchase_price_rupiah NUMERIC(14,2) DEFAULT 0,
      condition_note TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- =================
-- attendance_logs table (absensi harian)
-- =================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'attendance_logs'
  ) THEN
    CREATE TABLE public.attendance_logs (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      log_date      DATE NOT NULL,
      check_in_at   TIMESTAMPTZ,
      check_out_at  TIMESTAMPTZ,
      status        TEXT NOT NULL DEFAULT 'present'
                    CHECK (status IN ('present','late','absent','leave','sick','wfh')),
      notes         TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, log_date)
    );
  END IF;
END $$;

-- =================
-- utility_readings table (meteran listrik/air/internet)
-- =================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'utility_readings'
  ) THEN
    CREATE TABLE public.utility_readings (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      utility_type  TEXT NOT NULL CHECK (utility_type IN ('electricity','water','internet','gas')),
      cluster_id    UUID REFERENCES public.clusters(id) ON DELETE SET NULL,
      reading_date  DATE NOT NULL,
      value         NUMERIC(12, 2) NOT NULL,    -- kWh/m3/MB/cylinder
      unit          TEXT NOT NULL,
      amount_rupiah NUMERIC(14, 2) DEFAULT 0,
      notes         TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_active ON public.vehicles(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_vehicles_assigned ON public.vehicles(assigned_user_id) WHERE assigned_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_office_assets_assigned ON public.office_assets(assigned_user_id) WHERE assigned_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON public.attendance_logs(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_status_date ON public.attendance_logs(status, log_date) WHERE status IN ('late','absent');
CREATE INDEX IF NOT EXISTS idx_utility_readings_cluster ON public.utility_readings(cluster_id, reading_date DESC);
CREATE INDEX IF NOT EXISTS idx_utility_readings_type ON public.utility_readings(utility_type, reading_date DESC);

-- Grants
GRANT SELECT ON public.vehicles         TO anon, authenticated;
GRANT SELECT ON public.office_assets    TO authenticated;  -- not anon (purchase_price sensitive)
GRANT SELECT ON public.attendance_logs  TO authenticated;
GRANT SELECT ON public.utility_readings TO authenticated;
GRANT ALL    ON public.vehicles         TO authenticated, service_role;
GRANT ALL    ON public.office_assets    TO authenticated, service_role;
GRANT ALL    ON public.attendance_logs  TO authenticated, service_role;
GRANT ALL    ON public.utility_readings TO authenticated, service_role;

-- ROLLBACK
-- DROP INDEX IF EXISTS idx_utility_readings_type;
-- DROP INDEX IF EXISTS idx_utility_readings_cluster;
-- DROP INDEX IF EXISTS idx_attendance_status_date;
-- DROP INDEX IF EXISTS idx_attendance_user_date;
-- DROP INDEX IF EXISTS idx_office_assets_assigned;
-- DROP INDEX IF EXISTS idx_vehicles_assigned;
-- DROP INDEX IF EXISTS idx_vehicles_active;
-- DROP TABLE IF EXISTS public.utility_readings;
-- DROP TABLE IF EXISTS public.attendance_logs;
-- DROP TABLE IF EXISTS public.office_assets;
-- DROP TABLE IF EXISTS public.vehicles;

COMMIT;
