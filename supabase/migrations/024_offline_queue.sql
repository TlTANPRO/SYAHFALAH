-- 024_offline_sync_queue.sql
-- Plan C Phase 4 — Mobile PWA offline sync queue.
-- Holds deferred writes from clients that are offline; replayed when
-- network returns. Idempotent.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'offline_sync_queue'
  ) THEN
    CREATE TABLE public.offline_sync_queue (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      client_op_id  TEXT NOT NULL,                 -- client-generated UUID, dedup key
      target_table  TEXT NOT NULL,                 -- 'tasks', 'attendance_logs', etc.
      operation     TEXT NOT NULL CHECK (operation IN ('insert','update','delete')),
      payload       JSONB NOT NULL,
      dedup_key     TEXT,                          -- optional, e.g. (user_id, log_date)
      status        TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','processing','completed','failed','duplicate')),
      error_message TEXT,
      received_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      processed_at  TIMESTAMPTZ,
      UNIQUE (user_id, client_op_id)               -- client dedup
    );
  END IF;
END $$;

-- =================
-- api_gateway_log (request audit for high-value endpoints)
-- =================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'api_gateway_log'
  ) THEN
    CREATE TABLE public.api_gateway_log (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id       UUID REFERENCES public.users(id) ON DELETE SET NULL,
      method        TEXT NOT NULL,
      path          TEXT NOT NULL,
      status_code   INT NOT NULL,
      duration_ms   INT,
      ip_address    INET,
      user_agent    TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_offline_sync_user_pending ON public.offline_sync_queue(user_id, status) WHERE status IN ('pending','processing');
CREATE UNIQUE INDEX IF NOT EXISTS idx_offline_sync_dedup ON public.offline_sync_queue(user_id, client_op_id);
CREATE INDEX IF NOT EXISTS idx_api_gateway_log_created ON public.api_gateway_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_gateway_log_user ON public.api_gateway_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_gateway_log_path ON public.api_gateway_log(path, created_at DESC);

-- Grants
GRANT SELECT ON public.offline_sync_queue TO authenticated;
GRANT INSERT ON public.offline_sync_queue TO authenticated;
GRANT UPDATE (status, error_message, processed_at) ON public.offline_sync_queue TO service_role;
GRANT ALL    ON public.offline_sync_queue TO service_role;
GRANT SELECT ON public.api_gateway_log TO service_role;
GRANT INSERT ON public.api_gateway_log TO service_role;

-- ROLLBACK
-- DROP INDEX IF EXISTS idx_api_gateway_log_path;
-- DROP INDEX IF EXISTS idx_api_gateway_log_user;
-- DROP INDEX IF EXISTS idx_api_gateway_log_created;
-- DROP INDEX IF EXISTS idx_offline_sync_dedup;
-- DROP INDEX IF EXISTS idx_offline_sync_user_pending;
-- DROP TABLE IF EXISTS public.api_gateway_log;
-- DROP TABLE IF EXISTS public.offline_sync_queue;

COMMIT;
