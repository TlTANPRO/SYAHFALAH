-- 005_views.sql
-- Database views for dashboard queries

-- ============================================
-- OWNER DASHBOARD VIEWS
-- ============================================

-- Company KPI cascade view
CREATE OR REPLACE VIEW owner_kpi_cascade AS
WITH RECURSIVE kpi_tree AS (
  -- Anchor: Company level KPIs
  SELECT 
    id, code, name, level, target, actual, progress, status, 
    weight, parent_kpi_id, division_id, user_id,
    1 as depth,
    ARRAY[id] as path
  FROM kpis 
  WHERE level = 'company'
  
  UNION ALL
  
  -- Recursive: Children KPIs
  SELECT 
    k.id, k.code, k.name, k.level, k.target, k.actual, k.progress, k.status,
    k.weight, k.parent_kpi_id, k.division_id, k.user_id,
    kt.depth + 1,
    kt.path || k.id
  FROM kpis k
  JOIN kpi_tree kt ON k.parent_kpi_id = kt.id
)
SELECT * FROM kpi_tree ORDER BY depth, code;

-- Division KPI summary
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
      'target', k.target,
      'actual', k.actual,
      'progress', k.progress,
      'status', k.status
    )
  ) FILTER (WHERE k.id IS NOT NULL) as kpis
FROM divisions d
LEFT JOIN kpis k ON k.division_id = d.id AND k.level = 'division'
  AND k.period_start <= CURRENT_DATE AND k.period_end >= CURRENT_DATE
GROUP BY d.id;

-- Personal KPI summary for team view
CREATE OR REPLACE VIEW team_personal_kpis AS
SELECT 
  u.id as user_id,
  u.name,
  u.position,
  u.division_id,
  d.name as division_name,
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
      'target', k.target,
      'actual', k.actual,
      'progress', k.progress,
      'status', k.status,
      'evidence_required', k.evidence_required
    )
  ) FILTER (WHERE k.id IS NOT NULL) as kpis
FROM users u
LEFT JOIN divisions d ON u.division_id = d.id
LEFT JOIN kpis k ON k.user_id = u.id AND k.level = 'personal'
  AND k.period_start <= CURRENT_DATE AND k.period_end >= CURRENT_DATE
WHERE u.is_active = TRUE
GROUP BY u.id, d.name;

-- ============================================
-- TASK VIEWS
-- ============================================

-- Task summary by user
CREATE OR REPLACE VIEW user_task_summary AS
SELECT 
  u.id as user_id,
  u.name,
  u.division_id,
  COUNT(t.id) as total_tasks,
  COUNT(t.id) FILTER (WHERE t.status = 'pending') as pending_count,
  COUNT(t.id) FILTER (WHERE t.status = 'in_progress') as in_progress_count,
  COUNT(t.id) FILTER (WHERE t.status = 'completed') as completed_count,
  COUNT(t.id) FILTER (WHERE t.status = 'overdue') as overdue_count,
  COUNT(t.id) FILTER (WHERE t.status = 'cancelled') as cancelled_count,
  COUNT(t.id) FILTER (WHERE t.is_carry_over = TRUE) as carry_over_count,
  COUNT(t.id) FILTER (WHERE t.type = 'daily_routine') as routine_count,
  COUNT(t.id) FILTER (WHERE t.type = 'ad_hoc') as adhoc_count,
  COUNT(t.id) FILTER (WHERE t.priority = 'critical') as critical_count,
  COUNT(t.id) FILTER (WHERE t.priority = 'high') as high_count
FROM users u
LEFT JOIN tasks t ON t.assignee_id = u.id AND t.scheduled_date = CURRENT_DATE
WHERE u.is_active = TRUE
GROUP BY u.id;

-- Division task summary
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
-- REWARD & PUNISHMENT VIEWS
-- ============================================

-- User reward summary
CREATE OR REPLACE VIEW user_reward_summary AS
SELECT 
  u.id as user_id,
  u.name,
  u.division_id,
  COUNT(rp.id) FILTER (WHERE rp.type LIKE 'bonus_%') as bonus_count,
  COUNT(rp.id) FILTER (WHERE rp.type = 'commission') as commission_count,
  COUNT(rp.id) FILTER (WHERE rp.type LIKE 'incentive_%') as incentive_count,
  COUNT(rp.id) FILTER (WHERE rp.type IN ('promotion', 'public_recognition', 'training', 'flexible_work', 'physical_gift')) as recognition_count,
  COUNT(rp.id) FILTER (WHERE rp.type IN ('coaching', 'sp1', 'sp2', 'sp3')) as punishment_count,
  COALESCE(SUM(rp.amount) FILTER (WHERE rp.type LIKE 'bonus_%' OR rp.type = 'commission' OR rp.type LIKE 'incentive_%'), 0) as total_financial_reward,
  json_agg(
    json_build_object(
      'id', rp.id,
      'type', rp.type,
      'trigger', rp.trigger_reason,
      'amount', rp.amount,
      'status', rp.status,
      'issued_at', rp.issued_at
    )
  ) FILTER (WHERE rp.id IS NOT NULL) as rewards
FROM users u
LEFT JOIN rewards_punishments rp ON rp.user_id = u.id
WHERE u.is_active = TRUE
GROUP BY u.id;

-- ============================================
-- REPORTING RHYTHM VIEWS
-- ============================================

-- Upcoming meetings
CREATE OR REPLACE VIEW upcoming_meetings AS
SELECT 
  rr.id,
  rr.meeting_name,
  rr.frequency,
  rr.duration_minutes,
  rr.participants,
  rr.output,
  CASE rr.frequency
    WHEN 'daily' THEN CURRENT_DATE + INTERVAL '1 day'
    WHEN 'weekly' THEN 
      CURRENT_DATE + ((7 - EXTRACT(DOW FROM CURRENT_DATE))::INT + rr.day_of_week) % 7 * INTERVAL '1 day'
    WHEN 'monthly' THEN 
      DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' + (rr.day_of_month - 1) * INTERVAL '1 day'
    WHEN 'quarterly' THEN
      DATE_TRUNC('quarter', CURRENT_DATE) + INTERVAL '3 months' + (rr.month_of_quarter - 1) * INTERVAL '1 month'
    ELSE NULL
  END as next_occurrence
FROM reporting_rhythms rr
WHERE rr.frequency IN ('daily', 'weekly', 'monthly', 'quarterly')
ORDER BY next_occurrence;

-- ============================================
-- SOW VIEWS
-- ============================================

-- SOW with task count
CREATE OR REPLACE VIEW sow_with_tasks AS
SELECT 
  s.*,
  d.name as division_name,
  COUNT(st.id) as task_count,
  COUNT(st.id) FILTER (WHERE st.frequency = 'daily') as daily_tasks,
  COUNT(st.id) FILTER (WHERE st.frequency = 'weekly') as weekly_tasks,
  COUNT(st.id) FILTER (WHERE st.frequency = 'monthly') as monthly_tasks
FROM sows s
JOIN divisions d ON s.division_id = d.id
LEFT JOIN sow_tasks st ON st.sow_id = s.id
WHERE s.is_active = TRUE
GROUP BY s.id, d.name;

-- User's SOW
CREATE OR REPLACE VIEW user_sow AS
SELECT 
  u.id as user_id,
  u.name,
  u.position,
  s.id as sow_id,
  s.position_name,
  s.tujuan_posisi,
  s.kpi_ringkasan,
  s.tools,
  s.pic_pendamping,
  json_agg(
    json_build_object(
      'id', st.id,
      'title', st.title,
      'description', st.description,
      'frequency', st.frequency,
      'related_kpi_codes', st.related_kpi_codes
    )
  ) FILTER (WHERE st.id IS NOT NULL) as tasks
FROM users u
LEFT JOIN sows s ON s.position_id = u.position AND s.is_active = TRUE
LEFT JOIN sow_tasks st ON st.sow_id = s.id
WHERE u.is_active = TRUE
GROUP BY u.id, s.id;