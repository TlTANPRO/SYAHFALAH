-- 020_notifications_automation.sql
-- Plan C Phase 3 — Workflow automation foundation.
-- Creates 2 tables:
--   notification_templates: reusable templates keyed by event + channel
--   notifications: per-user notification delivery log (de-normalized for
--     fast read at dashboard notification feed)
-- Idempotent.

BEGIN;

-- =================
-- notification_templates table
-- =================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'notification_templates'
  ) THEN
    CREATE TABLE public.notification_templates (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code          TEXT UNIQUE NOT NULL,        -- 'survey_due', 'lead_hot', etc.
      title         TEXT NOT NULL,
      body_template TEXT NOT NULL,               -- with {{lead_name}} placeholders
      channel       TEXT NOT NULL DEFAULT 'in_app'
                    CHECK (channel IN ('in_app','email','whatsapp')),
      event         TEXT NOT NULL,               -- 'lead.stage_changed', etc.
      is_active     BOOLEAN NOT NULL DEFAULT true,
      metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- =================
-- notifications table (delivery log)
-- =================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'notifications'
  ) THEN
    CREATE TABLE public.notifications (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      template_id   UUID REFERENCES public.notification_templates(id) ON DELETE SET NULL,
      title         TEXT NOT NULL,
      body          TEXT NOT NULL,
      link          TEXT,                       -- deep link to dashboard section
      is_read       BOOLEAN NOT NULL DEFAULT false,
      read_at       TIMESTAMPTZ,
      payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, created_at DESC) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_user_all ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_templates_event ON public.notification_templates(event) WHERE is_active = true;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated, service_role;
GRANT SELECT ON public.notifications TO anon;  -- own rows only (enforced via RLS later)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_templates TO authenticated, service_role;

-- Seed 4 starter templates
INSERT INTO public.notification_templates (code, title, body_template, event, channel) VALUES
  ('survey_due', 'Survey jatuh tempo', 'Survey untuk {{lead_name}} di cluster {{cluster_name}} jatuh tempo {{date}}.', 'survey.due', 'in_app'),
  ('sp3k_status', 'Update SP3K', 'SP3K #{{booking_code}} berstatus {{status}}.', 'sp3k.status_changed', 'in_app'),
  ('lead_hot', 'Lead panas', 'Lead {{lead_name}} ({{phone}}) naik ke stage {{stage}}.', 'lead.stage_changed', 'in_app'),
  ('maintenance_urgent', 'Ticket urgent', 'Ticket {{title}} berpriority urgent dan belum ditangani.', 'maintenance.ticket_opened', 'in_app')
ON CONFLICT (code) DO UPDATE SET body_template = EXCLUDED.body_template, title = EXCLUDED.title;

-- ROLLBACK
-- DELETE FROM public.notifications WHERE template_id IS NOT NULL;
-- DROP INDEX IF EXISTS idx_notification_templates_event;
-- DROP INDEX IF EXISTS idx_notifications_user_all;
-- DROP INDEX IF EXISTS idx_notifications_user_unread;
-- DROP TABLE IF EXISTS public.notifications;
-- DROP TABLE IF EXISTS public.notification_templates;

COMMIT;
