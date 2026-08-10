-- Add FK constraint to api_audit_log.user_id -> users.id
-- Enables PostgREST joins (used by /admin/audit page)
-- Migration: 20260810_add_api_audit_log_fk.sql

ALTER TABLE api_audit_log
DROP CONSTRAINT IF EXISTS api_audit_log_user_id_fkey;

ALTER TABLE api_audit_log
ADD CONSTRAINT api_audit_log_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id)
ON DELETE SET NULL;

COMMENT ON CONSTRAINT api_audit_log_user_id_fkey ON api_audit_log IS 'FK to users table — enables PostgREST joins for /admin/audit page';
