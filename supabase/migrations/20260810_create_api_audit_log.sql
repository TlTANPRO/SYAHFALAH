-- Migration: Create api_audit_log table
-- Date: 2026-08-10
-- Purpose: Track all CRUD operations across entities for audit trail UI
-- Used by: /api/audit/[table]/[id] (GET), inline-crud PATCH/DELETE/POST handlers,
--          /api/bulk-update/[entity] (one entry per row)

-- ============================================================================
-- TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.api_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who did the action (nullable for system-initiated ops)
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  -- What entity + row was affected
  table_name TEXT NOT NULL,
  row_id TEXT NOT NULL,  -- TEXT (not FK) to allow flexibility across entities
  
  -- What kind of change
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  
  -- Diff snapshots for UPDATE actions
  before JSONB,  -- previous row state
  after JSONB,   -- new row state
  
  -- Optional metadata
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Most common query: recent activity for a row
CREATE INDEX IF NOT EXISTS idx_audit_log_table_row_created
  ON public.api_audit_log (table_name, row_id, created_at DESC);

-- Audit by user
CREATE INDEX IF NOT EXISTS idx_audit_log_user_created
  ON public.api_audit_log (user_id, created_at DESC);

-- Audit by action type
CREATE INDEX IF NOT EXISTS idx_audit_log_action_created
  ON public.api_audit_log (action, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE public.api_audit_log ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (used by API routes)
-- No explicit policy needed; service role bypasses RLS

-- Authenticated users can READ audit logs (for /admin/audit page)
-- Restrict to owner + kepala_kantor via app-side check (since RLS can't easily
-- reference user.role without a function)
CREATE POLICY "Authenticated users can read audit logs"
  ON public.api_audit_log
  FOR SELECT
  TO authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE policy for authenticated (only service role can write)
-- This prevents users from forging audit entries

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Authenticated users need SELECT for /admin/audit page
GRANT SELECT ON public.api_audit_log TO authenticated;

-- Anon role: nothing (audit data is sensitive)
-- (No GRANT statement needed; default is no access)

-- Service role: full access (default for service_role)
-- (No GRANT statement needed)

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.api_audit_log IS 'Audit trail for all CRUD operations. Populated by generic-crud.ts logAudit() helper.';
COMMENT ON COLUMN public.api_audit_log.before IS 'Pre-update row snapshot (for UPDATE actions). NULL for INSERT.';
COMMENT ON COLUMN public.api_audit_log.after IS 'Post-update row snapshot (for UPDATE actions). NULL for DELETE.';
COMMENT ON COLUMN public.api_audit_log.row_id IS 'Text (not FK) to support audit across heterogeneous entity types.';
