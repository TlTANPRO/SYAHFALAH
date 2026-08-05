-- 012_kpi_2026_seed.sql
-- Seeds KPI targets + actuals for 2026 periods, plus monthly plans
-- continuation. Apply AFTER 011_clusters.sql (depends on clusters,
-- divisions, users tables existing).
--
-- Apply: Supabase Dashboard → SQL Editor → paste → Run.
-- Idempotent: uses ON CONFLICT DO NOTHING on (kpi_definition_id, period).

-- ===== kpi_definitions (master list of KPIs) =====
CREATE TABLE IF NOT EXISTS public.kpi_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  level text NOT NULL CHECK (level IN ('company','division','personal')),
  division_id uuid REFERENCES public.divisions(id),
  unit text,
  target_value numeric,
  target_period text,
  formula text,
  direction text CHECK (direction IN ('higher_better','lower_better','target')) DEFAULT 'higher_better',
  weight numeric DEFAULT 1.0,
  threshold_green numeric DEFAULT 80,
  threshold_yellow numeric DEFAULT 60,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer DEFAULT 0,
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kpi_definitions_level ON public.kpi_definitions(level);
CREATE INDEX IF NOT EXISTS idx_kpi_definitions_division ON public.kpi_definitions(division_id);

-- ===== kpi_targets (period targets per KPI definition) =====
CREATE TABLE IF NOT EXISTS public.kpi_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_definition_id uuid NOT NULL REFERENCES public.kpi_definitions(id) ON DELETE CASCADE,
  period text NOT NULL,
  target_value numeric NOT NULL,
  division_id uuid REFERENCES public.divisions(id),
  user_id uuid REFERENCES public.users(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','archived')),
  approved_by uuid REFERENCES public.users(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(kpi_definition_id, period)
);

-- ===== kpi_actuals (recorded actual values) =====
CREATE TABLE IF NOT EXISTS public.kpi_actuals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_target_id uuid NOT NULL REFERENCES public.kpi_targets(id) ON DELETE CASCADE,
  actual_value numeric NOT NULL,
  recorded_by uuid REFERENCES public.users(id),
  recorded_at timestamptz DEFAULT now(),
  evidence_urls jsonb DEFAULT '[]',
  notes text,
  is_verified boolean DEFAULT false,
  verified_by uuid REFERENCES public.users(id),
  verified_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kpi_actuals_target ON public.kpi_actuals(kpi_target_id);

-- ===== Seed: company-level KPIs (3 indicators) =====
DO $$
DECLARE
  v_company_kpis text[][] := ARRAY[
    ['KPI-COMP-REVENUE',    'Revenue Tahunan',           'Total revenue dari semua cluster',              'IDR', '75000000000'],
    ['KPI-COMP-UNIT-SOLD',  'Unit Terjual',              'Jumlah unit terjual (closing)',                 'count', '300'],
    ['KPI-COMP-CSAT',       'Customer Satisfaction',     'Skor CSAT rata-rata (1-100)',                   '%', '85']
  ];
  v_division_kpis text[][] := ARRAY[
    ['KPI-DIV-MARKETING-LEAD', 'Marketing Lead Conversion', 'Conversion rate leads ke booking (%)',  '%', '25'],
    ['KPI-DIV-CONSTR-PROGRESS','Konstruksi On-Time',       'Pengerjaan proyek sesuai target (%)',    '%', '90'],
    ['KPI-DIV-FINANCE-CASH',   'Cash Collection Rate',     'Penagihan piutang tertagih (%)',          '%', '95']
  ];
  v_user_kpis text[][] := ARRAY[
    ['KPI-PERS-TASKS',  'Task Completion',      'Task selesai tepat waktu',                       'count', '20'],
    ['KPI-PERS-SOW',    'SOW Delivery',         'Deliverables SOW terkirim',                      'count', '10'],
    ['KPI-PERS-CONTRIB','Kontribusi Tim',       'Skor kontribusi per anggota tim',               'count', '5']
  ];
  v_def_id uuid;
  v_target_id uuid;
  v_period text;
  v_actual numeric;
  i int;
BEGIN
  -- Seed company-level definitions
  FOR i IN 1..3 LOOP
    INSERT INTO public.kpi_definitions (code, name, description, level, unit, target_value, target_period, sort_order)
    VALUES (
      v_company_kpis[i][1],
      v_company_kpis[i][2],
      v_company_kpis[i][3],
      'company',
      v_company_kpis[i][4],
      v_company_kpis[i][5]::numeric,
      'monthly',
      i
    )
    ON CONFLICT (code) DO NOTHING
    RETURNING id INTO v_def_id;

    IF v_def_id IS NULL THEN
      SELECT id INTO v_def_id FROM public.kpi_definitions WHERE code = v_company_kpis[i][1];
    END IF;

    -- Seed 6 monthly periods for 2026 (Jan-Jun)
    FOR v_period IN SELECT unnest(ARRAY['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06']) LOOP
      INSERT INTO public.kpi_targets (kpi_definition_id, period, target_value, status, approved_at)
      VALUES (v_def_id, v_period, v_company_kpis[i][5]::numeric, 'active', now())
      ON CONFLICT (kpi_definition_id, period) DO NOTHING
      RETURNING id INTO v_target_id;

      IF v_target_id IS NULL THEN
        SELECT id INTO v_target_id FROM public.kpi_targets WHERE kpi_definition_id = v_def_id AND period = v_period;
      END IF;

      -- Actual: ramp from 60% in Jan to 95% in Jun
      v_actual := v_company_kpis[i][5]::numeric * (0.60 + 0.07 * (v_period::text::int - 2026));

      INSERT INTO public.kpi_actuals (kpi_target_id, actual_value, is_verified, verified_at)
      VALUES (v_target_id, v_actual, true, now())
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  -- Seed division-level definitions (3 indicators, all divisions)
  FOR v_def_id IN
    SELECT id FROM public.divisions WHERE is_active = true
  LOOP
    FOR i IN 1..3 LOOP
      INSERT INTO public.kpi_definitions (code, name, description, level, division_id, unit, target_value, target_period, sort_order)
      VALUES (
        v_division_kpis[i][1] || '-' || (SELECT code FROM public.divisions WHERE id = v_def_id),
        v_division_kpis[i][2],
        v_division_kpis[i][3],
        'division',
        v_def_id,
        v_division_kpis[i][4],
        v_division_kpis[i][5]::numeric,
        'monthly',
        i
      )
      ON CONFLICT (code) DO NOTHING;

      SELECT id INTO v_def_id FROM public.kpi_definitions
        WHERE code = v_division_kpis[i][1] || '-' || (SELECT code FROM public.divisions WHERE id = v_def_id);
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Seed complete: company KPIs (3) + targets (18) + actuals (18) for 2026 Jan-Jun';
END $$;

-- ===== monthly_plans (personal plan surface) =====
CREATE TABLE IF NOT EXISTS public.monthly_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id),
  month text NOT NULL,
  indicators jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected')),
  submitted_at timestamptz,
  approved_by uuid REFERENCES public.users(id),
  approved_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, month)
);

-- ===== RLS: kpi_definitions read = all, write = admin =====
ALTER TABLE public.kpi_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kpi_definitions_read_all" ON public.kpi_definitions;
CREATE POLICY "kpi_definitions_read_all" ON public.kpi_definitions FOR SELECT USING (true);

ALTER TABLE public.kpi_targets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kpi_targets_read_all" ON public.kpi_targets;
CREATE POLICY "kpi_targets_read_all" ON public.kpi_targets FOR SELECT USING (true);

ALTER TABLE public.kpi_actuals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kpi_actuals_read_all" ON public.kpi_actuals;
CREATE POLICY "kpi_actuals_read_all" ON public.kpi_actuals FOR SELECT USING (true);

ALTER TABLE public.monthly_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "monthly_plans_read_own" ON public.monthly_plans;
CREATE POLICY "monthly_plans_read_own" ON public.monthly_plans FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "monthly_plans_write_own" ON public.monthly_plans;
CREATE POLICY "monthly_plans_write_own" ON public.monthly_plans FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.kpi_definitions IS 'Master list of all KPIs (company/division/personal)';
COMMENT ON TABLE public.kpi_targets IS 'Period-bound target values per KPI definition';
COMMENT ON TABLE public.kpi_actuals IS 'Recorded actual values against targets';
COMMENT ON TABLE public.monthly_plans IS 'Personal monthly plans (indicators + status)';
