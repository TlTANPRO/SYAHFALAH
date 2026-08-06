-- 016_marketing_crm.sql
-- Plan C Phase 2 — Marketing CRM domain.
-- Creates 5 new tables: customers, surveys, bookings, sp3k, akad.
-- Also adds FK from consumer_cases → customers (deferred from Wave 1).
--
-- Idempotent: each CREATE TABLE wrapped in DO $$ guard so re-runs are safe.
-- ROLLBACK block at bottom for clean revert.

BEGIN;

-- =================
-- customers table
-- =================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'customers'
  ) THEN
    CREATE TABLE public.customers (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code          TEXT UNIQUE,
      full_name     TEXT NOT NULL,
      phone         TEXT,
      email         TEXT,
      address       TEXT,
      ktp_number    TEXT,
      notes         TEXT,
      metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- =================
-- surveys table
-- =================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'surveys'
  ) THEN
    CREATE TABLE public.surveys (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lead_id       UUID REFERENCES public.leads(id) ON DELETE CASCADE,
      customer_id   UUID REFERENCES public.customers(id) ON DELETE SET NULL,
      surveyor_id   UUID REFERENCES public.users(id) ON DELETE SET NULL,
      cluster_id    UUID REFERENCES public.clusters(id) ON DELETE SET NULL,
      scheduled_date DATE,
      completed_date DATE,
      result        TEXT CHECK (result IN ('interested','not_interested','pending','revisit')),
      photos        TEXT[],
      notes         TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- =================
-- bookings table
-- =================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'bookings'
  ) THEN
    CREATE TABLE public.bookings (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lead_id         UUID REFERENCES public.leads(id) ON DELETE CASCADE,
      customer_id     UUID REFERENCES public.customers(id) ON DELETE SET NULL,
      cluster_id      UUID REFERENCES public.clusters(id) ON DELETE SET NULL,
      booking_date    DATE,
      booking_fee     NUMERIC(14, 2) DEFAULT 0,
      status          TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','confirmed','cancelled','expired')),
      booking_letter_no TEXT,
      notes           TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- =================
-- sp3k table
-- =================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'sp3k'
  ) THEN
    CREATE TABLE public.sp3k (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      booking_id    UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
      customer_id   UUID REFERENCES public.customers(id) ON DELETE SET NULL,
      documents     JSONB NOT NULL DEFAULT '{}'::jsonb,
      status        TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected','cancelled')),
      sla_deadline  DATE,
      reviewer_id   UUID REFERENCES public.users(id) ON DELETE SET NULL,
      reviewed_at   TIMESTAMPTZ,
      review_note   TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- =================
-- akad table
-- =================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'akad'
  ) THEN
    CREATE TABLE public.akad (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sp3k_id       UUID REFERENCES public.sp3k(id) ON DELETE CASCADE,
      customer_id   UUID REFERENCES public.customers(id) ON DELETE SET NULL,
      notaris_id    UUID REFERENCES public.users(id) ON DELETE SET NULL,
      scheduled_date DATE,
      signed_date   DATE,
      notary_name   TEXT,
      notary_fee    NUMERIC(14, 2) DEFAULT 0,
      status        TEXT NOT NULL DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled','signed','cancelled','rescheduled')),
      notes         TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- =================
-- Backfill customer_id on consumer_cases (deferred FK from Wave 1)
-- =================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'consumer_cases'
      AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE public.consumer_cases
      ADD COLUMN customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =================
-- Indexes
-- =================
CREATE INDEX IF NOT EXISTS idx_customers_name    ON public.customers(lower(full_name));
CREATE INDEX IF NOT EXISTS idx_customers_phone   ON public.customers(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_surveys_lead      ON public.surveys(lead_id);
CREATE INDEX IF NOT EXISTS idx_surveys_surveyor  ON public.surveys(surveyor_id);
CREATE INDEX IF NOT EXISTS idx_surveys_cluster   ON public.surveys(cluster_id);
CREATE INDEX IF NOT EXISTS idx_bookings_lead     ON public.bookings(lead_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status   ON public.bookings(status) WHERE status IN ('pending','confirmed');
CREATE INDEX IF NOT EXISTS idx_sp3k_booking      ON public.sp3k(booking_id);
CREATE INDEX IF NOT EXISTS idx_sp3k_status       ON public.sp3k(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_akad_sp3k         ON public.akad(sp3k_id);
CREATE INDEX IF NOT EXISTS idx_akad_notaris      ON public.akad(notaris_id);
CREATE INDEX IF NOT EXISTS idx_akad_scheduled    ON public.akad(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_consumer_cases_customer ON public.consumer_cases(customer_id);

-- =================
-- updated_at trigger (reuse function from migration 015 if exists)
-- =================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_customers_updated_at ON public.customers;
CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =================
-- Grants (matches existing 011 pattern: anon SELECT, full access to
-- authenticated + service_role). Mutations go through /api/marketing/*.
-- =================
GRANT SELECT ON public.customers TO anon, authenticated;
GRANT SELECT ON public.surveys   TO anon, authenticated;
GRANT SELECT ON public.bookings  TO anon, authenticated;
GRANT SELECT ON public.sp3k      TO anon, authenticated;
GRANT SELECT ON public.akad      TO anon, authenticated;

GRANT ALL ON public.customers TO authenticated;
GRANT ALL ON public.surveys   TO authenticated;
GRANT ALL ON public.bookings  TO authenticated;
GRANT ALL ON public.sp3k      TO authenticated;
GRANT ALL ON public.akad      TO authenticated;

GRANT ALL ON public.customers TO service_role;
GRANT ALL ON public.surveys   TO service_role;
GRANT ALL ON public.bookings  TO service_role;
GRANT ALL ON public.sp3k      TO service_role;
GRANT ALL ON public.akad      TO service_role;

-- ROLLBACK
-- DROP TRIGGER IF EXISTS trg_customers_updated_at ON public.customers;
-- DROP FUNCTION IF EXISTS public.touch_updated_at();
-- DROP INDEX IF EXISTS idx_customers_phone;
-- DROP INDEX IF EXISTS idx_customers_name;
-- DROP INDEX IF EXISTS idx_surveys_lead;
-- DROP INDEX IF EXISTS idx_surveys_surveyor;
-- DROP INDEX IF EXISTS idx_surveys_cluster;
-- DROP INDEX IF EXISTS idx_bookings_lead;
-- DROP INDEX IF EXISTS idx_bookings_status;
-- DROP INDEX IF EXISTS idx_sp3k_booking;
-- DROP INDEX IF EXISTS idx_sp3k_status;
-- DROP INDEX IF EXISTS idx_akad_sp3k;
-- DROP INDEX IF EXISTS idx_akad_notaris;
-- DROP INDEX IF EXISTS idx_akad_scheduled;
-- DROP INDEX IF EXISTS idx_consumer_cases_customer;
-- ALTER TABLE public.consumer_cases DROP COLUMN IF EXISTS customer_id;
-- DROP TABLE IF EXISTS public.akad;
-- DROP TABLE IF EXISTS public.sp3k;
-- DROP TABLE IF EXISTS public.bookings;
-- DROP TABLE IF EXISTS public.surveys;
-- DROP TABLE IF EXISTS public.customers;

COMMIT;
