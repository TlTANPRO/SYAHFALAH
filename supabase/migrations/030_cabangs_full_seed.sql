-- 030_cabangs_full_seed.sql
-- Plan C Phase 4 stub completion — full Cabangs seed + assign projects to their cabang.
-- This closes the Plan C "multi-cabang" gap so /owner/projects and cross-cabang reporting
-- can show real cabang counts instead of 0/15.

-- Step 1: Seed a richer cabangs list (the migration 022 left only 2 rows).
INSERT INTO public.cabangs (id, code, name, region, address, phone, is_active)
VALUES
  ('350e8bc6-e496-4f0d-a38c-151e887924ca', 'CBG-JMR', 'Cabang Jawa Timur',  'Jawa Timur',   'Jl. Mayjend Sungkono Kav. 45, Surabaya',     '+62-31-5678-9010', true),
  ('92cbbe52-f2ba-41df-8ded-a97ee101cdfe', 'CBG-LTG', 'Cabang Luar Jawa',  'Luar Jawa',    'Jl. Asia Afrika No. 100, Bandung',             '+62-22-7233-1000', true),
  ('c1111111-1111-1111-1111-111111111111', 'CBG-JKT', 'Cabang Jakarta',     'DKI Jakarta',  'Jl. Sudirman Kav. 21, Jakarta Selatan',        '+62-21-5797-3000', true),
  ('c2222222-2222-2222-2222-222222222222', 'CBG-BDG', 'Cabang Bandung',     'Jawa Barat',   'Jl. Diponegoro No. 22, Bandung',               '+62-22-7210-8800', true),
  ('c3333333-3333-3333-3333-333333333333', 'CBG-MDN', 'Cabang Medan',       'Sumatera Utara','Jl. Gatot Subroto No. 88, Medan',             '+62-61-4535-700',  true),
  ('c4444444-4444-4444-4444-444444444444', 'CBG-MKS', 'Cabang Makassar',    'Sulawesi Selatan','Jl. Pengayoman Ruko Mirah Blok C/4, Makassar', '+62-411-444-500', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  region = EXCLUDED.region,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  is_active = EXCLUDED.is_active;

-- Step 2: Distribute existing 15 projects across cabangs.
-- Deterministically: project 1→JMR, 2→LTG, 3→JKT, 4→BDG, 5→MDN, 6→MKS, then cycle.
-- Use ROW_NUMBER() so re-runs are idempotent.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at NULLS LAST, name) AS rn FROM public.projects
),
bucket AS (
  SELECT id, ((rn - 1) % 6) + 1 AS bucket_idx FROM ranked
),
cabangs_ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY code) AS bucket_idx FROM public.cabangs
)
UPDATE public.projects p SET cabang_id = c.id
FROM bucket b
JOIN cabangs_ordered c ON c.bucket_idx = b.bucket_idx
WHERE p.id = b.id;

-- Step 3: Verify (won't fail if already applied — counts are agnostic).
DO $$
DECLARE
  total INTEGER; with_cabang INTEGER; active_cabangs INTEGER;
BEGIN
  SELECT COUNT(*) INTO total FROM public.projects;
  SELECT COUNT(*) INTO with_cabang FROM public.projects WHERE cabang_id IS NOT NULL;
  SELECT COUNT(*) INTO active_cabangs FROM public.cabangs WHERE is_active = true;
  RAISE NOTICE 'projects total=% / with cabang=% / active cabangs=%', total, with_cabang, active_cabangs;
END $$;
