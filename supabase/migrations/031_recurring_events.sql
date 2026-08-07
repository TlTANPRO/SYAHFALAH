-- 031_recurring_events.sql
-- Plan audit P1-1 closure — move schedule ritme from hardcoded constants to
-- a database-backed table so admin can edit recurring events without redeploy.
-- Note: recurring events are GLOBAL (shared across all users) by design — this is
-- the company's "ritual", not per-user preference. Per-user schedules stay in `tasks`.

CREATE TABLE IF NOT EXISTS public.recurring_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadence text NOT NULL CHECK (cadence IN ('daily', 'weekly')),
  weekday smallint CHECK (weekday IS NULL OR weekday BETWEEN 1 AND 7),
  start_time time,
  end_time time,
  title text NOT NULL,
  location text,
  description text,
  icon text DEFAULT 'calendar',
  color text DEFAULT 'brand',
  is_active boolean NOT NULL DEFAULT true,
  sort_order smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recurring_events_cadence_idx ON public.recurring_events (cadence, sort_order);

-- RLS: open read (it's a company ritual calendar, not PII).
ALTER TABLE public.recurring_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS recurring_events_read ON public.recurring_events;
CREATE POLICY recurring_events_read ON public.recurring_events FOR SELECT TO authenticated, anon USING (true);

-- Seed the existing hardcoded ritme as data so the dashboard goes live immediately.
INSERT INTO public.recurring_events (cadence, weekday, start_time, title, location, icon, sort_order) VALUES
  ('daily', NULL, '08:30', 'Daily standup',          'Ruang meeting', 'users', 1),
  ('daily', NULL, '12:00', 'ISHOMA',                 '-',            'coffee',2),
  ('daily', NULL, '17:00', 'Submit laporan harian',  'WA group',     'send', 3),
  ('weekly', 1, '09:00', 'Weekly standup (40 menit)', 'Ruang besar','megaphone', 1),
  ('weekly', 2, NULL,    'Site visit',              'Cluster',       'map-pin', 2),
  ('weekly', 3, NULL,    'Content review dengan tim media', 'Ruang media', 'edit', 3),
  ('weekly', 4, NULL,    'Follow up SP3K',         'Kantor',        'phone', 4),
  ('weekly', 5, '16:00', 'Friday reflection',      'Ruang besar',   'smile',  5);
