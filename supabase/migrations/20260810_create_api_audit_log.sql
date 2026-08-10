-- 20260810_create_api_audit_log.sql
-- Audit trail for all CRUD operations via generic-crud helper.
-- Best-effort: missing table won't block operations (see logAudit in generic-crud.ts).

CREATE TABLE IF NOT EXISTS public.api_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  table_name TEXT NOT NULL,
  row_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  before JSONB,
  after JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_audit_log_table_row
  ON public.api_audit_log(table_name, row_id);

CREATE INDEX IF NOT EXISTS idx_api_audit_log_user
  ON public.api_audit_log(user_id);

CREATE INDEX IF NOT EXISTS idx_api_audit_log_created_at
  ON public.api_audit_log(created_at DESC);

-- RLS: only service role can write; all authenticated users can read their own audit entries
ALTER TABLE public.api_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_read_own" ON public.api_audit_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Service role bypasses RLS so generic-crud can insert.

-- Grant read to anon for the api route (uses service role, but RLS still applies)
GRANT SELECT ON public.api_audit_log TO anon, authenticated;
