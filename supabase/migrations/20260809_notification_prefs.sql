// supabase/migrations/20260809_notification_prefs.sql
-- Add notification preferences column to users table.
// Stores per-user notification channel toggles as JSONB.
// Default to all enabled (matches current behavior of notifWA=true, notifEmail=false, notifDesktop=true).

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT '{
  "whatsapp_group": true,
  "email": false,
  "desktop_push": true,
  "sound_enabled": true
}'::jsonb;

COMMENT ON COLUMN public.users.notification_prefs IS
  'Per-user notification channel preferences. Keys: whatsapp_group, email, desktop_push, sound_enabled. All booleans.';
