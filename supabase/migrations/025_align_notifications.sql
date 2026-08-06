-- 025_align_notifications.sql
-- Reconcile actual notifications table with schema in 020.
-- Earlier 020 was skipped because a legacy notifications table already
-- existed. This migration adds missing columns from 020's spec, then
-- copies legacy values into the new columns. Idempotent.

BEGIN;

-- Add missing columns if absent
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS title  TEXT,
  ADD COLUMN IF NOT EXISTS body   TEXT,
  ADD COLUMN IF NOT EXISTS link   TEXT,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payload JSONB;

-- Backfill from legacy columns where new ones are empty
-- Old schema: type, message, reference_id, reference_type, priority, action_url, channels
-- New schema: title, body, link, payload
UPDATE public.notifications SET
  title = COALESCE(NULLIF(title, ''), COALESCE(type, 'Notifikasi')),
  body  = COALESCE(NULLIF(body, ''), message),
  link  = COALESCE(link, action_url),
  payload = CASE WHEN payload IS NULL OR payload = '{}'::jsonb OR jsonb_typeof(payload) IS NULL
                 THEN jsonb_build_object(
                        'event', type,
                        'reference_id', reference_id,
                        'reference_type', reference_type,
                        'priority', priority,
                        'channels', to_jsonb(channels),
                        'legacy', true
                      )
                 ELSE payload
            END
WHERE title IS NULL OR body IS NULL OR link IS NULL OR payload IS NULL;

COMMIT;
