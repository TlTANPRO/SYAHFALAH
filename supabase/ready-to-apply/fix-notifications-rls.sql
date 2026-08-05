-- apply-fix-notifications-rls.sql
-- Fix 401 Unauthorized on /notifications client queries.
-- 
-- Bug 6-Aug: migration 010 REVOKE ALL FROM anon includes 'notifications'.
-- Realtime polling (NotificationBell, useDashboardData, etc.) menggunakan
-- anon key = 401.
--
-- Fix: GRANT SELECT ke authenticated role untuk table notifications,
-- plus RLS policy supaya user hanya bisa lihat notifikasi mereka sendiri
-- (user_id = auth.uid()).
--
-- Aman karena: authenticated user = user login via PIN middleware (Supabase
-- session JWT). Anon tetap blocked karena tidak ada GRANT untuk role anon.

-- 1. Ensure RLS enabled on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 2. Drop any old permissive policies (idempotent)
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;

-- 3. SELECT policy: user hanya bisa lihat notif mereka sendiri
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 4. UPDATE policy: user bisa mark own notif as read
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5. INSERT policy: server (service_role) yang create notif; tapi izinkan
-- juga system-generated via authenticated fallback
DROP POLICY IF EXISTS "notifications_insert_system" ON public.notifications;
CREATE POLICY "notifications_insert_system"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 6. GRANT table-level SELECT to authenticated (RLS policy di atas filter rows)
GRANT SELECT ON public.notifications TO authenticated;
GRANT UPDATE ON public.notifications TO authenticated;
GRANT INSERT ON public.notifications TO authenticated;

-- 7. Anon tetap blocked (no GRANT for anon = 401 unless via service_role)
-- (tidak perlu tambahkan GRANT untuk anon)

-- 8. Verify
SELECT 
  grantee, 
  string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privileges
FROM information_schema.role_table_grants
WHERE table_schema='public' AND table_name='notifications'
GROUP BY grantee;
