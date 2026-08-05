-- ============================================================================
-- apply-everything v3 — table-existence check via information_schema
-- Run AFTER v2 failed (v2 created only clusters partially)
-- ============================================================================

-- ===== Helper: cek table exists via information_schema (aman, no error) =====
CREATE OR REPLACE FUNCTION public._table_exists(p_table text)
RETURNS boolean LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = p_table
  );
END $$;

-- ===== CLUSTERS table + seed =====
DO $$
BEGIN
  IF NOT public._table_exists('clusters') THEN
    CREATE TABLE public.clusters (
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
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clusters) THEN
    INSERT INTO public.clusters (code, name, location, total_units, units_sold, average_price_rupiah, launched_at) VALUES
      ('BSA','Bhumi Saka Arum','Grati, Pasuruan',120,87,425000000,'2024-03-15'),
      ('GRATI','Grati Asri','Grati, Pasuruan',80,62,385000000,'2024-06-20'),
      ('KENCONG','Kencong Residence','Kencong, Jember',60,23,295000000,'2025-02-10'),
      ('KLAMPK','Klampokarum','Klampokarum, Pasuruan',45,12,340000000,'2025-08-01'),
      ('KABUARAN','Kabuaran','Kabuaran, Pasuruan',100,34,410000000,'2025-04-12'),
      ('KAVLING','Kavling Mandiri','Kavling, Pasuruan',70,18,375000000,'2025-11-05');
  END IF;
END $$;

-- ===== LEADS table + seed =====
DO $$
BEGIN
  IF NOT public._table_exists('leads') THEN
    CREATE TABLE public.leads (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code text UNIQUE,
      customer_name text NOT NULL,
      customer_phone text,
      cluster_id uuid,
      source text NOT NULL,
      stage text NOT NULL DEFAULT 'new',
      estimated_value_rupiah numeric DEFAULT 0,
      assigned_to_id uuid,
      contacted_at timestamptz,
      surveyed_at timestamptz,
      booked_at timestamptz,
      closing_at timestamptz,
      batal_at timestamptz,
      batal_reason text,
      created_at timestamptz DEFAULT now()
    );
    -- FK added after clusters exist
    IF public._table_exists('clusters') THEN
      ALTER TABLE public.leads ADD CONSTRAINT leads_cluster_fk
        FOREIGN KEY (cluster_id) REFERENCES public.clusters(id);
    END IF;
    IF public._table_exists('users') THEN
      ALTER TABLE public.leads ADD CONSTRAINT leads_user_fk
        FOREIGN KEY (assigned_to_id) REFERENCES public.users(id);
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.leads) THEN
    INSERT INTO public.leads (code, customer_name, customer_phone, cluster_id, source, stage,
                              estimated_value_rupiah, assigned_to_id, contacted_at, booked_at, created_at)
    SELECT
      'LEAD-' || lpad(g::text, 4, '0'),
      (ARRAY['Pak Hermawan','Bu Aminah','Pak Darmawan','Ibu Siti','Pak Yanto','Mbak Rini','Pak Sumardi','Ibu Lestari','Pak Hartono','Mbak Mega'])[1 + (g % 10)] || ' #' || g::text,
      '0812' || lpad((g * 9871)::bigint::text, 8, '0'),
      (SELECT id FROM public.clusters WHERE code='BSA' LIMIT 1),
      (ARRAY['Facebook Ads','Instagram','Website','Walk-in','Referral','WhatsApp'])[1 + (g % 6)],
      (ARRAY['new','contacted','surveyed','booked','closing','batal'])[1 + (g % 6)],
      350000000 + ((g * 7919) % 200000000)::numeric,
      (SELECT id FROM public.users WHERE role='pic_divisi' LIMIT 1),
      CASE WHEN g > 3 THEN NOW() - (g || ' days')::interval ELSE NULL END,
      NOW() - ((g * 2) || ' days')::interval,
      NOW() - ((g * 1.5)::numeric || ' days')::interval
    FROM generate_series(1, 40) g
    ON CONFLICT (code) DO NOTHING;
  END IF;
END $$;

-- ===== PROJECTS table + seed (FIXED: make_date) =====
DO $$
BEGIN
  IF NOT public._table_exists('projects') THEN
    CREATE TABLE public.projects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code text UNIQUE,
      name text NOT NULL,
      cluster_id uuid,
      total_units integer NOT NULL DEFAULT 0,
      units_completed integer NOT NULL DEFAULT 0,
      start_date date NOT NULL,
      target_completion_date date NOT NULL,
      budget_rupiah numeric NOT NULL DEFAULT 0,
      spent_rupiah numeric DEFAULT 0,
      status text NOT NULL DEFAULT 'planning',
      project_manager_id uuid,
      created_at timestamptz DEFAULT now()
    );
    IF public._table_exists('clusters') THEN
      ALTER TABLE public.projects ADD CONSTRAINT projects_cluster_fk
        FOREIGN KEY (cluster_id) REFERENCES public.clusters(id);
    END IF;
    IF public._table_exists('users') THEN
      ALTER TABLE public.projects ADD CONSTRAINT projects_pm_fk
        FOREIGN KEY (project_manager_id) REFERENCES public.users(id);
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.projects) THEN
    INSERT INTO public.projects (code, name, cluster_id, total_units, units_completed,
                                 start_date, target_completion_date, budget_rupiah,
                                 spent_rupiah, status, project_manager_id)
    SELECT
      'PROJ-' || lpad(g::text, 4, '0'),
      'Pembangunan Tahap ' || (1 + (g % 3))::text,
      (SELECT id FROM public.clusters WHERE is_active=true ORDER BY code LIMIT 1 OFFSET (g % 6)),
      10 + (g * 5) % 50,
      (g * 3) % 30,
      make_date(2024 + (g % 3), 1 + (g % 12), 15),  -- FIX: make_date not string concat
      make_date(2026 + (g % 3), 1 + (g % 12), 15),
      5000000000 + ((g * 1000000000) % 5000000000)::numeric,
      ((g * 800000000) % 5000000000)::numeric,
      (ARRAY['planning','construction','on_track','delayed','completed'])[1 + (g % 5)],
      (SELECT id FROM public.users WHERE role IN ('pic_divisi','kepala_kantor') LIMIT 1)
    FROM generate_series(1, 15) g
    ON CONFLICT (code) DO NOTHING;
  END IF;
END $$;

-- ===== CONSUMER CASES table + seed =====
DO $$
BEGIN
  IF NOT public._table_exists('consumer_cases') THEN
    CREATE TABLE public.consumer_cases (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code text UNIQUE,
      customer_name text NOT NULL,
      customer_phone text,
      cluster_id uuid,
      project_id uuid,
      unit_number text,
      sp3k_number text,
      bast_number text,
      shm_number text,
      price_rupiah numeric DEFAULT 0,
      status text NOT NULL DEFAULT 'sp3k',
      pic_id uuid,
      sp3k_at timestamptz,
      bast_at timestamptz,
      shm_at timestamptz,
      notes text,
      created_at timestamptz DEFAULT now()
    );
    IF public._table_exists('clusters') THEN
      ALTER TABLE public.consumer_cases ADD CONSTRAINT cc_cluster_fk FOREIGN KEY (cluster_id) REFERENCES public.clusters(id);
    END IF;
    IF public._table_exists('projects') THEN
      ALTER TABLE public.consumer_cases ADD CONSTRAINT cc_project_fk FOREIGN KEY (project_id) REFERENCES public.projects(id);
    END IF;
    IF public._table_exists('users') THEN
      ALTER TABLE public.consumer_cases ADD CONSTRAINT cc_pic_fk FOREIGN KEY (pic_id) REFERENCES public.users(id);
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.consumer_cases) THEN
    INSERT INTO public.consumer_cases (code, customer_name, customer_phone, cluster_id, project_id,
                                        unit_number, sp3k_number, bast_number, shm_number,
                                        price_rupiah, status, pic_id, sp3k_at, bast_at, shm_at)
    SELECT
      'CASE-' || lpad(g::text, 4, '0'),
      (ARRAY['Pak RT 001','Bu RW 002','Pak Hadi','Ibu Sri','Pak Wahyu'])[1 + (g % 5)] || ' #' || g::text,
      '0813' || lpad((g * 7919)::bigint::text, 8, '0'),
      (SELECT id FROM public.clusters WHERE code='BSA' LIMIT 1),
      (SELECT id FROM public.projects LIMIT 1),
      'Unit ' || (1 + (g % 30))::text,
      'SP3K-' || lpad(g::text, 6, '0'),
      CASE WHEN g > 5 THEN 'BAST-' || lpad(g::text, 6, '0') ELSE NULL END,
      CASE WHEN g > 12 THEN 'SHM-' || lpad(g::text, 6, '0') ELSE NULL END,
      380000000 + ((g * 7919) % 100000000)::numeric,
      (ARRAY['sp3k','bast','shm','completed'])[1 + (g % 4)],
      (SELECT id FROM public.users WHERE role='pic_divisi' LIMIT 1),
      NOW() - ((g * 3) || ' days')::interval,
      CASE WHEN g > 5 THEN NOW() - ((g * 2) || ' days')::interval ELSE NULL END,
      CASE WHEN g > 12 THEN NOW() - (g || ' days')::interval ELSE NULL END
    FROM generate_series(1, 25) g
    ON CONFLICT (code) DO NOTHING;
  END IF;
END $$;

-- ============================================================================
-- PART B: security lockdown (idempotent)
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
    SELECT c.relname FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r'
      AND c.relname IN ('users','user_sessions','audit_logs','pin_history')
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

-- Cleanup helper function (optional)
-- DROP FUNCTION IF EXISTS public._table_exists(text);
