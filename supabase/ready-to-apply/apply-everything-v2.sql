-- ============================================================================
-- apply-everything.sql — Gabungan PART A (011) + PART B (010)
-- Tanggal: 2026-08-06 — v2 (date cast fix)
-- Apply: paste di Supabase SQL Editor > Run
-- ============================================================================

-- ============================================================================
-- PART A: 011_clusters
-- ============================================================================

-- ===== CLUSTERS =====
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

-- ===== LEADS =====
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

-- ===== PROJECTS =====
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

-- ===== CONSUMER CASES =====
CREATE TABLE IF NOT EXISTS public.consumer_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE,
  customer_name text NOT NULL,
  customer_phone text,
  cluster_id uuid REFERENCES public.clusters(id),
  project_id uuid REFERENCES public.projects(id),
  unit_number text,
  sp3k_number text,
  bast_number text,
  shm_number text,
  price_rupiah numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'sp3k',
  pic_id uuid REFERENCES public.users(id),
  sp3k_at timestamptz,
  bast_at timestamptz,
  shm_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ===== SEED LEADS =====
DO $$
DECLARE
  v_cluster uuid;
  v_sources text[] := ARRAY['Facebook Ads','Instagram','Website','Walk-in','Referral','WhatsApp'];
  v_stages text[] := ARRAY['new','contacted','surveyed','booked','closing','batal'];
  v_routing uuid;
  i int;
BEGIN
  SELECT id INTO v_cluster FROM public.clusters WHERE code = 'BSA' LIMIT 1;
  SELECT id INTO v_routing FROM public.users WHERE role = 'pic_divisi' LIMIT 1;
  IF v_cluster IS NULL THEN RAISE EXCEPTION 'No cluster'; END IF;
  FOR i IN 1..40 LOOP
    INSERT INTO public.leads (code, customer_name, customer_phone, cluster_id, source, stage,
                              estimated_value_rupiah, assigned_to_id, contacted_at, booked_at, created_at)
    VALUES (
      'LEAD-' || lpad(i::text, 4, '0'),
      (ARRAY['Pak Hermawan','Bu Aminah','Pak Darmawan','Ibu Siti','Pak Yanto','Mbak Rini','Pak Sumardi','Ibu Lestari','Pak Hartono','Mbak Mega'])[1 + (i % 10)] || ' #' || i::text,
      '0812' || lpad((random() * 99999999)::bigint::text, 8, '0'),
      v_cluster,
      v_sources[1 + (i % 6)],
      v_stages[1 + (i % 6)],
      350000000 + (random() * 200000000)::numeric,
      v_routing,
      CASE WHEN i > 3 THEN NOW() - (random() * 30 || ' days')::interval ELSE NULL END,
      NOW() - (random() * 60 || ' days')::interval,
      NOW() - (random() * 45 || ' days')::interval
    )
    ON CONFLICT (code) DO NOTHING;
  END LOOP;
END $$;

-- ===== SEED PROJECTS (FIXED: explicit date casts) =====
DO $$
DECLARE
  v_clusters uuid[];
  v_pm uuid;
  v_statuses text[] := ARRAY['planning','construction','on_track','delayed','completed'];
  v_cluster_id uuid;
  v_code text;
  v_year_offset int;
  i int;
  v_start_date date;
  v_target_date date;
BEGIN
  SELECT id INTO v_pm FROM public.users WHERE role IN ('pic_divisi','kepala_kantor') LIMIT 1;
  SELECT array_agg(id) INTO v_clusters FROM public.clusters WHERE is_active = true;
  IF v_clusters IS NULL OR array_length(v_clusters, 1) IS NULL THEN
    RAISE EXCEPTION 'No clusters';
  END IF;
  FOR i IN 1..15 LOOP
    v_cluster_id := v_clusters[1 + (i % array_length(v_clusters, 1))];
    v_code := 'PROJ-' || lpad(i::text, 4, '0');
    -- Build dates via make_date() instead of string concat (avoids date/text type mismatch)
    v_year_offset := (i % 3);  -- 0, 1, or 2 (year range 2024-2026)
    v_start_date := make_date(2024 + v_year_offset, 1 + (i % 12), 15);
    v_target_date := make_date(2026 + v_year_offset, 1 + (i % 12), 15);
    INSERT INTO public.projects (code, name, cluster_id, total_units, units_completed,
                                 start_date, target_completion_date, budget_rupiah,
                                 spent_rupiah, status, project_manager_id)
    VALUES (
      v_code,
      'Pembangunan Tahap ' || (1 + (i % 3))::text,
      v_cluster_id,
      10 + (i * 5) % 50,
      (i * 3) % 30,
      v_start_date,                              -- date type, no cast needed
      v_target_date,                             -- date type, no cast needed
      5000000000 + (random() * 5000000000)::numeric,
      (random() * 5000000000)::numeric,
      v_statuses[1 + (i % 5)],
      v_pm
    )
    ON CONFLICT (code) DO NOTHING;
  END LOOP;
END $$;

-- ===== SEED CONSUMER CASES =====
DO $$
DECLARE
  v_cluster uuid;
  v_project uuid;
  v_user uuid;
  i int;
  v_code text;
  v_statuses text[] := ARRAY['sp3k','bast','shm','completed'];
BEGIN
  SELECT id INTO v_cluster FROM public.clusters WHERE code = 'BSA' LIMIT 1;
  SELECT id INTO v_project FROM public.projects LIMIT 1;
  SELECT id INTO v_user FROM public.users WHERE role = 'pic_divisi' LIMIT 1;
  FOR i IN 1..25 LOOP
    v_code := 'CASE-' || lpad(i::text, 4, '0');
    INSERT INTO public.consumer_cases (code, customer_name, customer_phone, cluster_id, project_id,
                                        unit_number, sp3k_number, bast_number, shm_number,
                                        price_rupiah, status, pic_id, sp3k_at, bast_at, shm_at)
    VALUES (
      v_code,
      (ARRAY['Pak RT 001','Bu RW 002','Pak Hadi','Ibu Sri','Pak Wahyu'])[1 + (i % 5)] || ' #' || i::text,
      '0813' || lpad((random() * 99999999)::bigint::text, 8, '0'),
      v_cluster,
      v_project,
      'Unit ' || (1 + (i % 30))::text,
      'SP3K-' || lpad(i::text, 6, '0'),
      CASE WHEN i > 5 THEN 'BAST-' || lpad(i::text, 6, '0') ELSE NULL END,
      CASE WHEN i > 12 THEN 'SHM-' || lpad(i::text, 6, '0') ELSE NULL END,
      380000000 + (random() * 100000000)::numeric,
      v_statuses[1 + (i % 4)],
      v_user,
      NOW() - (random() * 90 || ' days')::interval,
      CASE WHEN i > 5 THEN NOW() - (random() * 60 || ' days')::interval ELSE NULL END,
      CASE WHEN i > 12 THEN NOW() - (random() * 30 || ' days')::interval ELSE NULL END
    )
    ON CONFLICT (code) DO NOTHING;
  END LOOP;
END $$;

-- ============================================================================
-- PART B: migration 010_security_lockdown.sql
-- ============================================================================

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

GRANT SELECT ON public.team_personal_kpis TO anon;
GRANT SELECT ON public.division_kpi_summary TO anon;
GRANT SELECT ON public.division_task_summary TO anon;
GRANT SELECT ON public.sow_with_tasks TO anon;
GRANT SELECT ON public.kpis TO anon;
GRANT SELECT ON public.notifications_with_user TO anon;
GRANT SELECT ON public.divisions TO anon;
GRANT SELECT ON public.roles TO anon;
GRANT SELECT ON public.role_permissions TO anon;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT c.relname 
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relkind = 'r' 
      AND c.relname IN ('users', 'user_sessions', 'audit_logs', 'pin_history')
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON public.%I FROM anon', t);
  END LOOP;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 'cluster_count' AS check, COUNT(*)::text AS value FROM public.clusters
UNION ALL SELECT 'leads_count', COUNT(*)::text FROM public.leads
UNION ALL SELECT 'projects_count', COUNT(*)::text FROM public.projects
UNION ALL SELECT 'consumer_cases_count', COUNT(*)::text FROM public.consumer_cases;
