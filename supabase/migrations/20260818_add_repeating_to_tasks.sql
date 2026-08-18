-- Migration: add repeating-task support to tasks
-- Date: 2026-08-18
-- Phase 1 of Sheets → Dashboard realtime sync plan
--
-- Adds:
--   recurrence_rule  TEXT NULL  — RRULE string per RFC 5545 (e.g. 'FREQ=WEEKLY;BYDAY=MO')
--   recurrence_start DATE NULL  — first occurrence date
--   recurrence_end   DATE NULL  — last occurrence date (NULL = open-ended)
--   external_id      TEXT NULL  — composite key from Sheets (e.g. 'sheets:MARKETING:R5') UNIQUE
--   last_synced_at   TIMESTAMPTZ NULL — last successful sync timestamp
--
-- Notes:
--   - tasks.type already supports 'daily_routine' | 'weekly_target' | 'monthly_target' (no enum change).
--   - recurrence_rule is read-time expanded via `rrule` npm lib (see src/lib/tasks/expandRrule.ts).
--   - external_id enables idempotent upsert from Sheets sync.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS recurrence_rule  TEXT NULL,
  ADD COLUMN IF NOT EXISTS recurrence_start  DATE NULL,
  ADD COLUMN IF NOT EXISTS recurrence_end    DATE NULL,
  ADD COLUMN IF NOT EXISTS external_id      TEXT NULL,
  ADD COLUMN IF NOT EXISTS last_synced_at    TIMESTAMPTZ NULL;

-- Unique constraint on external_id (NULLs allowed; only non-null values must be unique)
CREATE UNIQUE INDEX IF NOT EXISTS uq_tasks_external_id
  ON public.tasks (external_id)
  WHERE external_id IS NOT NULL;

-- Index on recurrence_rule for efficient rrule expansion queries
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence_rule
  ON public.tasks (recurrence_rule)
  WHERE recurrence_rule IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN public.tasks.recurrence_rule IS 'RRULE per RFC 5545 (e.g. FREQ=WEEKLY;BYDAY=MO). NULL = one-off task.';
COMMENT ON COLUMN public.tasks.external_id IS 'Source key from external system (e.g. sheets:MARKETING:R5). UNIQUE per non-null value.';
COMMENT ON COLUMN public.tasks.last_synced_at IS 'Last successful sync timestamp from external source.';
