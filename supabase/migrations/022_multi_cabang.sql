-- 022_multi_cabang.sql
-- Plan C Phase 4 — Multi-cabang (multi-branch) support.
-- Adds cabangs table + FK from divisions, projects, clusters.
-- Idempotent.

BEGIN;

-- =================
-- cabangs table
-- =================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'cabangs'
  ) THEN
    CREATE TABLE public.cabangs (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code          TEXT UNIQUE NOT NULL,
      name          TEXT NOT NULL,
      region        TEXT,
      address       TEXT,
      phone         TEXT,
      manager_id    UUID REFERENCES public.users(id) ON DELETE SET NULL,
      is_active     BOOLEAN NOT NULL DEFAULT true,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- =================
-- Add cabang_id FK to operational tables (nullable for back-compat)
-- =================
DO $$
BEGIN
  -- divisions.cabang_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'divisions' AND column_name = 'cabang_id'
  ) THEN
    ALTER TABLE public.divisions
      ADD COLUMN cabang_id UUID REFERENCES public.cabangs(id) ON DELETE SET NULL;
  END IF;
  -- clusters.cabang_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clusters' AND column_name = 'cabang_id'
  ) THEN
    ALTER TABLE public.clusters
      ADD COLUMN cabang_id UUID REFERENCES public.cabangs(id) ON DELETE SET NULL;
  END IF;
  -- projects.cabang_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'cabang_id'
  ) THEN
    ALTER TABLE public.projects
      ADD COLUMN cabang_id UUID REFERENCES public.cabangs(id) ON DELETE SET NULL;
  END IF;
  -- users.cabang_id (so individual users are tied to a branch)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'cabang_id'
  ) THEN
    ALTER TABLE public.users
      ADD COLUMN cabang_id UUID REFERENCES public.cabangs(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =================
-- Indexes for FK lookups
-- =================
CREATE INDEX IF NOT EXISTS idx_divisions_cabang ON public.divisions(cabang_id) WHERE cabang_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clusters_cabang ON public.clusters(cabang_id) WHERE cabang_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_cabang ON public.projects(cabang_id) WHERE cabang_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_cabang ON public.users(cabang_id) WHERE cabang_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cabangs_active ON public.cabangs(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_cabangs_region ON public.cabangs(region) WHERE region IS NOT NULL;

-- =================
-- Grants
-- =================
GRANT SELECT ON public.cabangs TO anon, authenticated;
GRANT ALL    ON public.cabangs TO authenticated, service_role;

-- Seed 2 starter cabangs
INSERT INTO public.cabangs (code, name, region, address, is_active) VALUES
  ('CBG-JMR', 'Cabang Jawa Timur', 'Jawa Timur', 'Surabaya — managed by Riza', true),
  ('CBG-LTG', 'Cabang Luar Jawa', 'Non-Jawa',   'Lintas Jawa — managed by Rizal', true)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region;

-- =================
-- Backfill: assign first cabang to existing divisions/users (best-effort)
-- =================
UPDATE public.divisions
  SET cabang_id = (SELECT id FROM public.cabangs WHERE code = 'CBG-JMR' LIMIT 1)
  WHERE cabang_id IS NULL;
UPDATE public.users
  SET cabang_id = (SELECT id FROM public.cabangs WHERE code = 'CBG-JMR' LIMIT 1)
  WHERE cabang_id IS NULL AND role != 'guest';

-- ROLLBACK
-- DROP INDEX IF EXISTS idx_cabangs_region;
-- DROP INDEX IF EXISTS idx_cabangs_active;
-- DROP INDEX IF EXISTS idx_users_cabang;
-- DROP INDEX IF EXISTS idx_projects_cabang;
-- DROP INDEX IF EXISTS idx_clusters_cabang;
-- DROP INDEX IF EXISTS idx_divisions_cabang;
-- ALTER TABLE public.users DROP COLUMN IF EXISTS cabang_id;
-- ALTER TABLE public.projects DROP COLUMN IF EXISTS cabang_id;
-- ALTER TABLE public.clusters DROP COLUMN IF EXISTS cabang_id;
-- ALTER TABLE public.divisions DROP COLUMN IF EXISTS cabang_id;
-- DROP TABLE IF EXISTS public.cabangs;

COMMIT;
