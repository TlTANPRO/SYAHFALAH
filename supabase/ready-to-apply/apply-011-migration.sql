-- apply-011-migration.sql
-- READY-TO-PASTE for Supabase SQL Editor
-- Apply: Dashboard -> SQL Editor -> New Query -> paste entire contents -> Run
-- Adds: clusters, leads, projects, consumer_cases + seed data
-- Original: supabase/migrations/011_clusters.sql
-- Safe to re-run (idempotent: ON CONFLICT DO NOTHING).

-- 011_clusters.sql
-- Adds: clusters, leads, projects, consumer_cases tables + real seed data.
-- Apply this in Supabase Dashboard → SQL Editor → New Query → paste entire
-- contents → Run. The migration is idempotent (uses IF NOT EXISTS and
-- ON CONFLICT DO NOTHING) so you can safely re-run it.

-- ===== CLUSTERS (6 active property clusters) =====
CREATE TABLE IF NOT EXISTS public.clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  location text NOT NULL,
  total_units integer NOT NULL DEFAULT 0,
  units_sold integer NOT NULL DEFAULT 0,
  average_price_rupiah numeric NOT NULL DEFAULT 0,
  launched_at date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

INSERT INTO public.clusters (code, name, location, total_units, units_sold, average_price_rupiah, launched_at) VALUES
  ('BSA',     'Bhumi Saka Arum',  'Grati, Pasuruan',      120, 87, 425000000, '2024-03-15'),
  ('GRATI',   'Grati Asri',       'Grati, Pasuruan',       80, 62, 385000000, '2024-06-20'),
  ('KENCONG', 'Kencong Residence','Kencong, Jember',       60, 23, 295000000, '2025-02-10'),
  ('KLAMPK',  'Klampokarum',      'Klampokarum, Pasuruan', 45, 12, 340000000, '2025-08-01'),
  ('KABUARAN','Kabuaran',         'Kabuaran, Pasuruan',   100, 34, 410000000, '2025-04-12'),
  ('KAVLING', 'Kavling Mandiri',  'Kavling, Pasuruan',     70, 18, 375000000, '2025-11-05')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, location = EXCLUDED.location,
  total_units = EXCLUDED.total_units, units_sold = EXCLUDED.units_sold,
  average_price_rupiah = EXCLUDED.average_price_rupiah, launched_at = EXCLUDED.launched_at;

-- ===== LEADS (marketing pipeline) =====
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE,
  customer_name text NOT NULL,
  customer_phone text,
  cluster_id uuid REFERENCES public.clusters(id),
  source text NOT NULL,
  stage text NOT NULL DEFAULT 'new',
  estimated_value_rupiah numeric DEFAULT 0,
  assigned_to_id uuid REFERENCES public.users(id),
  contacted_at timestamptz,
  surveyed_at timestamptz,
  booked_at timestamptz,
  closing_at timestamptz,
  batal_at timestamptz,
  batal_reason text,
  created_at timestamptz DEFAULT now()
);

-- ===== PROJECTS (construction tracker) =====
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE,
  name text NOT NULL,
  cluster_id uuid REFERENCES public.clusters(id),
  total_units integer NOT NULL DEFAULT 0,
  units_completed integer NOT NULL DEFAULT 0,
  start_date date NOT NULL,
  target_completion_date date NOT NULL,
  budget_rupiah numeric NOT NULL DEFAULT 0,
  spent_rupiah numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'planning',
  project_manager_id uuid REFERENCES public.users(id),
  created_at timestamptz DEFAULT now()
);

-- ===== CONSUMER CASES (SP3K → BAST → SHM) =====
CREATE TABLE IF NOT EXISTS public.consumer_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE,
  consumer_name text NOT NULL,
  consumer_phone text,
  unit_code text NOT NULL,
  cluster_id uuid REFERENCES public.clusters(id),
  assigned_to_id uuid REFERENCES public.users(id),
  stage text NOT NULL DEFAULT 'berkas',
  sp3k_deadline date,
  bast_date date,
  amount_rupiah numeric DEFAULT 0,
  is_overdue boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ===== Grant SELECT to anon (dashboard uses anon key) =====
GRANT SELECT ON public.clusters TO anon, authenticated;
GRANT SELECT ON public.leads TO anon, authenticated;
GRANT SELECT ON public.projects TO anon, authenticated;
GRANT SELECT ON public.consumer_cases TO anon, authenticated;

-- ===== SEED: 6 construction projects =====
INSERT INTO public.projects (code, name, cluster_id, total_units, units_completed, start_date, target_completion_date, budget_rupiah, spent_rupiah, status, project_manager_id) VALUES
  ('PRJ-BSA-01',  'BSA Tahap 1',          (SELECT id FROM public.clusters WHERE code = 'BSA'),      60, 47, '2024-03-01', '2025-06-30', 18500000000, 15200000000, 'in_progress', (SELECT id FROM public.users WHERE full_name = 'Rizal' LIMIT 1)),
  ('PRJ-BSA-02',  'BSA Tahap 2',          (SELECT id FROM public.clusters WHERE code = 'BSA'),      60, 40, '2025-01-15', '2026-08-30', 19100000000, 16800000000, 'in_progress', (SELECT id FROM public.users WHERE full_name = 'Rizal' LIMIT 1)),
  ('PRJ-GRATI-01','Grati Asri Tahap 1',   (SELECT id FROM public.clusters WHERE code = 'GRATI'),    80, 62, '2024-06-01', '2025-12-31', 22000000000, 19500000000, 'in_progress', (SELECT id FROM public.users WHERE full_name = 'Rizal' LIMIT 1)),
  ('PRJ-KABU-01', 'Kabuaran Tahap 1',      (SELECT id FROM public.clusters WHERE code = 'KABUARAN'),100, 34, '2025-04-15', '2026-12-30', 28000000000, 12400000000, 'in_progress', (SELECT id FROM public.users WHERE full_name = 'Rizal' LIMIT 1)),
  ('PRJ-KEN-01',  'Kencong Tahap 1',       (SELECT id FROM public.clusters WHERE code = 'KENCONG'), 60, 23, '2025-02-20', '2026-10-30', 14500000000,  8700000000, 'in_progress', (SELECT id FROM public.users WHERE full_name = 'Rizal' LIMIT 1)),
  ('PRJ-KAV-01',  'Kavling Mandiri',       (SELECT id FROM public.clusters WHERE code = 'KAVLING'), 70, 18, '2025-11-10', '2027-04-30', 19800000000,  4600000000, 'in_progress', (SELECT id FROM public.users WHERE full_name = 'Rizal' LIMIT 1)),
  ('PRJ-KLAM-01', 'Klampokarum Tahap 1',   (SELECT id FROM public.clusters WHERE code = 'KLAMPK'),  45, 12, '2025-08-05', '2026-12-15', 12000000000,  4100000000, 'in_progress', (SELECT id FROM public.users WHERE full_name = 'Rizal' LIMIT 1))
ON CONFLICT (code) DO UPDATE SET
  units_completed = EXCLUDED.units_completed,
  spent_rupiah = EXCLUDED.spent_rupiah;

-- ===== SEED: 10 consumer cases (filing → SP3K → SHM) =====
INSERT INTO public.consumer_cases (code, consumer_name, consumer_phone, unit_code, cluster_id, assigned_to_id, stage, sp3k_deadline, bast_date, amount_rupiah, is_overdue) VALUES
  ('CC-0001','Siti Maisaroh', '081234567001','F11 GSK', (SELECT id FROM public.clusters WHERE code = 'BSA'),  (SELECT id FROM public.users WHERE full_name = 'Novita' LIMIT 1), 'completed', '2026-05-15', '2026-06-19', 425000000, false),
  ('CC-0002','Ady Kurniawan', '081234567002','G6 GSK',  (SELECT id FROM public.clusters WHERE code = 'BSA'),  (SELECT id FROM public.users WHERE full_name = 'Novita' LIMIT 1), 'completed', '2026-01-20', '2026-02-09', 425000000, false),
  ('CC-0003','Alfinna',       '081234567003','E11 ML',  (SELECT id FROM public.clusters WHERE code = 'GRATI'),(SELECT id FROM public.users WHERE full_name = 'Novita' LIMIT 1), 'sp3k',      '2026-08-15', NULL,         385000000, false),
  ('CC-0004','Nia',           '081234567004','B18 ML',  (SELECT id FROM public.clusters WHERE code = 'GRATI'),(SELECT id FROM public.users WHERE full_name = 'Novita' LIMIT 1), 'berkas',    '2026-08-30', NULL,         385000000, false),
  ('CC-0005','Bambang',       '081234567005','B7 KAV',  (SELECT id FROM public.clusters WHERE code = 'KAVLING'),(SELECT id FROM public.users WHERE full_name = 'Novita' LIMIT 1), 'akad',     '2026-08-01', '2026-09-15', 375000000, true),
  ('CC-0006','Sri Wahyuni',   '081234567006','C12 BSA', (SELECT id FROM public.clusters WHERE code = 'BSA'),  (SELECT id FROM public.users WHERE full_name = 'Novita' LIMIT 1), 'bast',      '2026-07-15', '2026-07-20', 425000000, false),
  ('CC-0007','Julianto',      '081234567007','A4 KLM',  (SELECT id FROM public.clusters WHERE code = 'KLAMPK'),(SELECT id FROM public.users WHERE full_name = 'Novita' LIMIT 1), 'sp3k',     '2026-08-22', NULL,         340000000, false),
  ('CC-0008','Hartono',       '081234567008','D1 KAB',  (SELECT id FROM public.clusters WHERE code = 'KABUARAN'),(SELECT id FROM public.users WHERE full_name = 'Novita' LIMIT 1), 'berkas',  '2026-08-18', NULL,         410000000, true),
  ('CC-0009','Fitriani',      '081234567009','D2 KAB',  (SELECT id FROM public.clusters WHERE code = 'KABUARAN'),(SELECT id FROM public.users WHERE full_name = 'Novita' LIMIT 1), 'sp3k',    '2026-08-20', NULL,         410000000, false),
  ('CC-0010','Mujiono',       '081234567010','A8 KEN',  (SELECT id FROM public.clusters WHERE code = 'KENCONG'),(SELECT id FROM public.users WHERE full_name = 'Novita' LIMIT 1), 'akad',    '2026-08-05', '2026-09-10', 295000000, true)
ON CONFLICT (code) DO NOTHING;

-- ===== SEED: 25 leads in various stages =====
DO $$
DECLARE
  v_names text[] := ARRAY['Budi Santoso','Siti Aminah','Joko Widodo','Dewi Lestari','Ahmad Fauzi','Rina Marlina','Hendra Wijaya','Sri Mulyani','Tono Sucipto','Lilis Karlina','Yusuf Mansur','Fitri Handayani','Dedi Kurniawan','Nur Hidayah','Andi Pratama','Maya Sari','Rizal Abdullah','Indah Permata','Wahyu Saputra','Lutfi Handayani','Bagas Maulana','Tika Amelia','Reza Pahlevi','Mega Lestari','Dimas Anggara'];
  v_sources text[] := ARRAY['meta_ads','tiktok_ads','organic','walk_in','referral','exhouse'];
  v_stages  text[] := ARRAY['new','contacted','survey','booking','sp3k','closing','closed','batal'];
  v_routing uuid;
  v_cluster uuid;
BEGIN
  SELECT id INTO v_routing FROM public.users WHERE full_name = 'Riza' LIMIT 1;
  IF v_routing IS NULL THEN
    SELECT id INTO v_routing FROM public.users WHERE role = 'staff' AND position LIKE '%Marketing%' LIMIT 1;
  END IF;
  FOR i IN 1..25 LOOP
    SELECT id INTO v_cluster FROM public.clusters ORDER BY random() LIMIT 1;
    INSERT INTO public.leads (code, customer_name, customer_phone, cluster_id, source, stage, estimated_value_rupiah, assigned_to_id, contacted_at, surveyed_at, created_at)
    VALUES (
      'LD-' || lpad(i::text, 4, '0'),
      v_names[i],
      '08' || lpad((random() * 9999999999)::bigint::text, 10, '0'),
      v_cluster,
      v_sources[1 + (i % 6)],
      v_stages[1 + (i % 8)],
      380000000 + (random() * 80000000)::numeric,
      v_routing,
      NOW() - (random() * 30 || ' days')::interval,
      CASE WHEN i > 5 THEN NOW() - (random() * 20 || ' days')::interval ELSE NULL END,
      NOW() - (random() * 45 || ' days')::interval
    )
    ON CONFLICT (code) DO NOTHING;
  END LOOP;
END $$;
