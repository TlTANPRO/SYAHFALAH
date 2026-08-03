-- 007_dashboard_views.sql
-- Dashboard views for Supabase - Run this in Supabase SQL Editor
-- This creates the missing views that the dashboard depends on

-- ============================================
-- DIVISION KPI SUMMARY VIEW
-- ============================================
CREATE OR REPLACE VIEW division_kpi_summary AS
SELECT 
  d.id as division_id,
  d.name as division_name,
  d.code as division_code,
  COUNT(k.id) as kpi_count,
  COUNT(k.id) FILTER (WHERE k.status = 'achieved') as achieved_count,
  COUNT(k.id) FILTER (WHERE k.status = 'on_track') as on_track_count,
  COUNT(k.id) FILTER (WHERE k.status = 'at_risk') as at_risk_count,
  COUNT(k.id) FILTER (WHERE k.status = 'off_track') as off_track_count,
  ROUND(AVG(k.progress)::numeric, 1) as avg_progress,
  json_agg(
    json_build_object(
      'id', k.id,
      'code', k.code,
      'name', k.name,
      'target', k.target_value,
      'actual', k.actual,
      'progress', k.progress,
      'status', k.status
    )
  ) FILTER (WHERE k.id IS NOT NULL) as kpis
FROM divisions d
LEFT JOIN kpi_definitions k ON k.division_id = d.id AND k.level = 'division'
GROUP BY d.id;

-- ============================================
-- DIVISION TASK SUMMARY VIEW
-- ============================================
CREATE OR REPLACE VIEW division_task_summary AS
SELECT 
  d.id as division_id,
  d.name as division_name,
  COUNT(t.id) as total_tasks,
  COUNT(t.id) FILTER (WHERE t.status = 'pending') as pending_count,
  COUNT(t.id) FILTER (WHERE t.status = 'in_progress') as in_progress_count,
  COUNT(t.id) FILTER (WHERE t.status = 'completed') as completed_count,
  COUNT(t.id) FILTER (WHERE t.status = 'overdue') as overdue_count,
  COUNT(t.id) FILTER (WHERE t.is_carry_over = TRUE) as carry_over_count,
  ROUND(
    COUNT(t.id) FILTER (WHERE t.status = 'completed')::numeric / 
    NULLIF(COUNT(t.id) FILTER (WHERE t.status != 'cancelled'), 0) * 100, 1
  ) as completion_rate
FROM divisions d
LEFT JOIN tasks t ON t.division_id = d.id AND t.scheduled_date = CURRENT_DATE
GROUP BY d.id;

-- ============================================
-- NOTIFICATIONS VIEW (with correct column names)
-- ============================================
CREATE OR REPLACE VIEW notifications_with_user AS
SELECT 
  n.*,
  u.name as user_name,
  u.email as user_email
FROM notifications n
LEFT JOIN users u ON n.user_id = u.id
WHERE n.is_read = FALSE
ORDER BY n.created_at DESC;