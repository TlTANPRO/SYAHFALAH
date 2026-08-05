-- 015_plan_c_approvals.sql
-- Plan C Phase 1 Item 6 — Approval workflow v2.
-- Real approval workflow state machine, distinct from notifications-based
-- approval in /owner/approvals/page.tsx (which is just urgent notifications).
--
-- States: pending → approved | rejected | cancelled
-- Approver decides; requester can cancel pending ones.
--
-- Idempotent: safe to re-apply (CREATE TABLE IF NOT EXISTS guarded by pg_catalog check).
-- ROLLBACK block at bottom for clean revert.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'approvals'
  ) THEN
    CREATE TABLE public.approvals (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      requester_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      approver_id   UUID REFERENCES public.users(id) ON DELETE SET NULL,
      title         TEXT NOT NULL,
      description   TEXT,
      kind          TEXT NOT NULL DEFAULT 'general'
                    CHECK (kind IN ('general','spending','leave','access','budget','sow')),
      status        TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected','cancelled')),
      amount        NUMERIC(14, 2),
      metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
      decided_at    TIMESTAMPTZ,
      decision_note TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_approvals_status ON public.approvals(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_approvals_requester ON public.approvals(requester_id);
CREATE INDEX IF NOT EXISTS idx_approvals_approver ON public.approvals(approver_id) WHERE approver_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_approvals_created ON public.approvals(created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_touch_updated_at ON public.approvals;
CREATE TRIGGER trg_touch_updated_at
  BEFORE UPDATE ON public.approvals
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Grants: owner/kepala_kantor can read+write via API; authenticated
-- can read own requests. We enforce ownership at the API layer for now.
-- Migration 010 already revoked anon; authenticated has default GRANT.
GRANT ALL ON public.approvals TO authenticated;
GRANT ALL ON public.approvals TO service_role;

-- ROLLBACK
-- DROP TRIGGER IF EXISTS trg_touch_updated_at ON public.approvals;
-- DROP FUNCTION IF EXISTS public.touch_updated_at();
-- DROP INDEX IF EXISTS idx_approvals_status;
-- DROP INDEX IF EXISTS idx_approvals_requester;
-- DROP INDEX IF EXISTS idx_approvals_approver;
-- DROP INDEX IF EXISTS idx_approvals_created;
-- DROP TABLE IF EXISTS public.approvals;

COMMIT;
