-- 004_functions_triggers.sql
-- Database functions and triggers for automation

-- ============================================
-- KPI CASCADE RECALCULATION
-- ============================================

-- Function to recalculate KPI progress from children
CREATE OR REPLACE FUNCTION recalculate_kpi_cascade(p_kpi_id UUID)
RETURNS VOID AS $$
DECLARE
  v_kpi RECORD;
  v_children RECORD;
  v_weighted_sum NUMERIC := 0;
  v_total_weight NUMERIC := 0;
  v_parent_id UUID;
BEGIN
  -- Get the KPI that was updated
  SELECT * INTO v_kpi FROM kpis WHERE id = p_kpi_id;
  
  -- If this is a personal KPI, progress is already calculated from actual/target
  -- If this is division/kepala_kantor/company, calculate from children
  IF v_kpi.level IN ('division', 'kepala_kantor', 'company') THEN
    FOR v_children IN 
      SELECT progress, weight FROM kpis WHERE parent_kpi_id = v_kpi.id
    LOOP
      v_weighted_sum := v_weighted_sum + (v_children.progress * v_children.weight);
      v_total_weight := v_total_weight + v_children.weight;
    END LOOP;
    
    IF v_total_weight > 0 THEN
      UPDATE kpis 
      SET progress = v_weighted_sum / v_total_weight,
          actual = (v_weighted_sum / v_total_weight / 100) * target,
          updated_at = NOW()
      WHERE id = v_kpi.id;
    END IF;
  END IF;
  
  -- Recursively update parent
  IF v_kpi.parent_kpi_id IS NOT NULL THEN
    PERFORM recalculate_kpi_cascade(v_kpi.parent_kpi_id);
  END IF;
END;
$$ language 'plpgsql';

-- Trigger to auto-calculate KPI cascade
CREATE OR REPLACE FUNCTION trigger_kpi_cascade()
RETURNS TRIGGER AS $$
BEGIN
  -- Only cascade if progress or status changed
  IF OLD.progress IS DISTINCT FROM NEW.progress 
     OR OLD.status IS DISTINCT FROM NEW.status 
     OR OLD.actual IS DISTINCT FROM NEW.actual THEN
    PERFORM pg_notify('kpi_cascade_trigger', json_build_object(
      'kpi_id', NEW.id,
      'company_id', NEW.company_id,
      'division_id', NEW.division_id,
      'user_id', NEW.user_id,
      'level', NEW.level,
      'old_progress', OLD.progress,
      'new_progress', NEW.progress,
      'trigger', TG_OP
    )::text);
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER kpi_cascade_trigger
AFTER INSERT OR UPDATE ON kpis
FOR EACH ROW
WHEN (OLD.progress IS DISTINCT FROM NEW.progress 
      OR OLD.status IS DISTINCT FROM NEW.status 
      OR OLD.actual IS DISTINCT FROM NEW.actual)
EXECUTE FUNCTION trigger_kpi_cascade();

-- ============================================
-- TASK COMPLETION -> KPI PROGRESS
-- ============================================

-- Function to update KPI progress when task is completed
CREATE OR REPLACE FUNCTION update_kpi_from_task()
RETURNS TRIGGER AS $$
DECLARE
  v_link RECORD;
  v_kpi RECORD;
  v_completed_weight NUMERIC := 0;
  v_total_weight NUMERIC := 0;
  v_new_progress NUMERIC;
BEGIN
  -- Only act on status change to completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Get all KPI links for this task
    FOR v_link IN 
      SELECT kpi_id, impact_weight FROM task_kpis WHERE task_id = NEW.id
    LOOP
      -- Get the KPI
      SELECT * INTO v_kpi FROM kpis WHERE id = v_link.kpi_id;
      
      -- Calculate total weight for this KPI's linked tasks
      SELECT COALESCE(SUM(tk.impact_weight), 0) INTO v_total_weight
      FROM task_kpis tk
      JOIN tasks t ON t.id = tk.task_id
      WHERE tk.kpi_id = v_kpi.id;
      
      -- Calculate completed weight
      SELECT COALESCE(SUM(tk.impact_weight), 0) INTO v_completed_weight
      FROM task_kpis tk
      JOIN tasks t ON t.id = tk.task_id
      WHERE tk.kpi_id = v_kpi.id AND t.status = 'completed';
      
      -- Calculate new progress
      IF v_total_weight > 0 THEN
        v_new_progress := (v_completed_weight / v_total_weight) * 100;
        
        UPDATE kpis 
        SET progress = LEAST(v_new_progress, 100),
            actual = (v_new_progress / 100) * target,
            updated_at = NOW()
        WHERE id = v_kpi.id;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER task_kpi_update_trigger
AFTER UPDATE ON tasks
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION update_kpi_from_task();

-- ============================================
-- CARRY-OVER TASK GENERATION
-- ============================================

-- Function to generate carry-over tasks
CREATE OR REPLACE FUNCTION generate_carry_over_tasks(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(task_id UUID, title TEXT) AS $$
DECLARE
  v_task RECORD;
  v_new_task_id UUID;
BEGIN
  FOR v_task IN
    SELECT * FROM tasks
    WHERE scheduled_date = p_date - INTERVAL '1 day'
      AND status IN ('pending', 'in_progress')
      AND type = 'daily_routine'
      AND is_carry_over = FALSE
  LOOP
    -- Create carry-over task
    INSERT INTO tasks (
      company_id, division_id, assignee_id, sow_id, sow_task_id,
      title, description, type, status, priority,
      scheduled_date, due_date, original_task_id, is_carry_over,
      notified_morning, notified_deadline, notified_overdue
    ) VALUES (
      v_task.company_id, v_task.division_id, v_task.assignee_id, 
      v_task.sow_id, v_task.sow_task_id,
      v_task.title || ' (Carry-over)', v_task.description,
      'carry_over', 'pending', v_task.priority,
      p_date, v_task.due_date, v_task.id, TRUE,
      FALSE, FALSE, FALSE
    ) RETURNING id INTO v_new_task_id;
    
    -- Copy subtasks
    INSERT INTO subtasks (task_id, title, completed, order_index)
    SELECT v_new_task_id, title, FALSE, order_index
    FROM subtasks WHERE task_id = v_task.id;
    
    -- Copy KPI links
    INSERT INTO task_kpis (task_id, kpi_id, impact_weight)
    SELECT v_new_task_id, kpi_id, impact_weight
    FROM task_kpis WHERE task_id = v_task.id;
    
    RETURN QUERY SELECT v_new_task_id, v_task.title || ' (Carry-over)';
  END LOOP;
END;
$$ language 'plpgsql';

-- ============================================
-- DAILY TASK GENERATION FROM SOW
-- ============================================

-- Function to generate daily tasks from SOW
CREATE OR REPLACE FUNCTION generate_daily_tasks_from_sow(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(user_id UUID, task_count INT) AS $$
DECLARE
  v_user RECORD;
  v_sow RECORD;
  v_sow_task RECORD;
  v_task_count INT := 0;
  v_day_of_week INT := EXTRACT(DOW FROM p_date)::INT;
  v_day_of_month INT := EXTRACT(DAY FROM p_date)::INT;
BEGIN
  FOR v_user IN
    SELECT * FROM users WHERE is_active = TRUE
  LOOP
    v_task_count := 0;
    
    -- Get SOW for this position
    SELECT * INTO v_sow 
    FROM sows 
    WHERE position_id = v_user.position 
      AND is_active = TRUE 
    LIMIT 1;
    
    IF NOT FOUND THEN CONTINUE; END IF;
    
    FOR v_sow_task IN
      SELECT * FROM sow_tasks WHERE sow_id = v_sow.id
    LOOP
      -- Check frequency
      CASE v_sow_task.frequency
        WHEN 'daily' THEN
          -- Always create
          NULL;
        WHEN 'weekly' THEN
          -- Create on Monday (day 1)
          IF v_day_of_week != 1 THEN CONTINUE; END IF;
        WHEN 'monthly' THEN
          -- Create on 1st of month
          IF v_day_of_month != 1 THEN CONTINUE; END IF;
        ELSE
          CONTINUE;
      END CASE;
      
      -- Check if task already exists for today
      IF EXISTS (
        SELECT 1 FROM tasks 
        WHERE assignee_id = v_user.id 
          AND sow_id = v_sow.id 
          AND sow_task_id = v_sow_task.id
          AND scheduled_date = p_date
      ) THEN
        CONTINUE;
      END IF;
      
      -- Create task
      INSERT INTO tasks (
        company_id, division_id, assignee_id, sow_id, sow_task_id,
        title, description, type, status, priority,
        scheduled_date, due_date, is_carry_over
      ) VALUES (
        v_user.company_id, v_user.division_id, v_user.id, 
        v_sow.id, v_sow_task.id,
        v_sow_task.title, v_sow_task.description,
        'daily_routine', 'pending', 'medium',
        p_date, p_date + INTERVAL '17 hours', FALSE
      );
      
      v_task_count := v_task_count + 1;
    END LOOP;
    
    RETURN QUERY SELECT v_user.id, v_task_count;
  END LOOP;
END;
$$ language 'plpgsql';

-- ============================================
-- MORNING BRIEFING GENERATION
-- ============================================

-- View for morning briefing data
CREATE OR REPLACE VIEW user_morning_briefing AS
SELECT 
  u.id as user_id,
  u.name,
  u.division_id,
  u.role,
  u.position,
  -- Routine tasks for today
  COUNT(t.id) FILTER (WHERE t.status = 'pending' AND t.type = 'daily_routine') as routine_pending,
  COUNT(t.id) FILTER (WHERE t.status = 'in_progress') as in_progress,
  -- Carry-over tasks
  COUNT(t.id) FILTER (WHERE t.is_carry_over = TRUE AND t.status != 'completed') as carry_over_count,
  -- Overdue tasks
  COUNT(t.id) FILTER (WHERE t.due_date < NOW() AND t.status != 'completed') as overdue_count,
  -- Due soon (2 hours)
  COUNT(t.id) FILTER (WHERE t.due_date BETWEEN NOW() AND NOW() + INTERVAL '2 hours' AND t.status != 'completed') as due_soon_count,
  -- Task details
  json_agg(
    json_build_object(
      'id', t.id,
      'title', t.title,
      'status', t.status,
      'priority', t.priority,
      'due_date', t.due_date,
      'is_carry_over', t.is_carry_over,
      'type', t.type
    )
  ) FILTER (WHERE t.id IS NOT NULL) as tasks
FROM users u
LEFT JOIN tasks t ON t.assignee_id = u.id AND t.scheduled_date = CURRENT_DATE
WHERE u.is_active = TRUE
GROUP BY u.id;

-- ============================================
-- CRON JOB FUNCTIONS
-- ============================================

-- Function to run daily at 05:00 - Generate tasks
CREATE OR REPLACE FUNCTION cron_generate_daily_tasks()
RETURNS VOID AS $$
BEGIN
  PERFORM generate_daily_tasks_from_sow(CURRENT_DATE);
  PERFORM generate_carry_over_tasks(CURRENT_DATE);
  RAISE NOTICE 'Daily tasks generated for %', CURRENT_DATE;
END;
$$ language 'plpgsql';

-- Function to run daily at 07:00 - Send morning briefings
CREATE OR REPLACE FUNCTION cron_send_morning_briefings()
RETURNS VOID AS $$
DECLARE
  v_user RECORD;
  v_briefing TEXT;
BEGIN
  FOR v_user IN
    SELECT * FROM user_morning_briefing
  LOOP
    -- Build briefing message
    v_briefing := format(
      '🌅 Morning Briefing - %s\n\n📋 Today''s Tasks:\n• Routine: %s pending\n• In Progress: %s\n• Carry-over: %s\n• Overdue: %s\n• Due Soon: %s',
      to_char(CURRENT_DATE, 'Day, DD Month YYYY'),
      v_user.routine_pending,
      v_user.in_progress,
      v_user.carry_over_count,
      v_user.overdue_count,
      v_user.due_soon_count
    );
    
    -- Insert notification (actual delivery handled by application)
    INSERT INTO notifications (user_id, type, title, message, related_entity_type, related_entity_id)
    VALUES (v_user.user_id, 'morning_brief', 
      '🌅 Morning Briefing - ' || to_char(CURRENT_DATE, 'Day, DD Month YYYY'),
      v_briefing, 'dashboard', 'morning_brief');
  END LOOP;
  
  RAISE NOTICE 'Morning briefings queued for %', CURRENT_DATE;
END;
$$ language 'plpgsql';

-- Function to run every 15 minutes - Check deadlines
CREATE OR REPLACE FUNCTION cron_check_deadlines()
RETURNS VOID AS $$
DECLARE
  v_task RECORD;
BEGIN
  -- Tasks due in 2 hours (not yet notified)
  FOR v_task IN
    SELECT * FROM tasks
    WHERE due_date BETWEEN NOW() AND NOW() + INTERVAL '2 hours'
      AND status NOT IN ('completed', 'cancelled')
      AND notified_deadline = FALSE
  LOOP
    UPDATE tasks SET notified_deadline = TRUE WHERE id = v_task.id;
    
    INSERT INTO notifications (user_id, type, title, message, related_entity_type, related_entity_id)
    VALUES (v_task.assignee_id, 'deadline_approaching',
      '⚠️ Deadline Approaching',
      format('Task "%s" is due in less than 2 hours', v_task.title),
      'task', v_task.id);
  END LOOP;
  
  -- Overdue tasks (not yet notified)
  FOR v_task IN
    SELECT * FROM tasks
    WHERE due_date < NOW()
      AND status NOT IN ('completed', 'cancelled')
      AND notified_overdue = FALSE
  LOOP
    UPDATE tasks SET notified_overdue = TRUE WHERE id = v_task.id;
    
    INSERT INTO notifications (user_id, type, title, message, related_entity_type, related_entity_id)
    VALUES (v_task.assignee_id, 'overdue',
      '🔴 OVERDUE',
      format('Task "%s" was due at %s', v_task.title, to_char(v_task.due_date, 'HH24:MI')),
      'task', v_task.id);
  END LOOP;
END;
$$ language 'plpgsql';

-- Function to run daily at 09:00 - Recalculate KPI cascade
CREATE OR REPLACE FUNCTION cron_recalculate_kpi_cascade()
RETURNS VOID AS $$
DECLARE
  v_kpi RECORD;
BEGIN
  -- Find all KPIs that need recalculation (division/kepala_kantor/company level)
  FOR v_kpi IN
    SELECT id FROM kpis 
    WHERE level IN ('division', 'kepala_kantor', 'company')
      AND period_start <= CURRENT_DATE 
      AND period_end >= CURRENT_DATE
  LOOP
    PERFORM recalculate_kpi_cascade(v_kpi.id);
  END LOOP;
  
  RAISE NOTICE 'KPI cascade recalculated for %', CURRENT_DATE;
END;
$$ language 'plpgsql';

-- ============================================
-- UTILITY FUNCTIONS
-- ============================================

-- Function to calculate KPI progress from task completion
CREATE OR REPLACE FUNCTION calculate_kpi_progress_from_tasks(p_kpi_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_total_weight NUMERIC := 0;
  v_completed_weight NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(tk.impact_weight), 0) INTO v_total_weight
  FROM task_kpis tk
  JOIN tasks t ON t.id = tk.task_id
  WHERE tk.kpi_id = p_kpi_id;
  
  SELECT COALESCE(SUM(tk.impact_weight), 0) INTO v_completed_weight
  FROM task_kpis tk
  JOIN tasks t ON t.id = tk.task_id
  WHERE tk.kpi_id = p_kpi_id AND t.status = 'completed';
  
  IF v_total_weight > 0 THEN
    RETURN LEAST((v_completed_weight / v_total_weight) * 100, 100);
  END IF;
  
  RETURN 0;
END;
$$ language 'plpgsql';

-- Function to get user's direct reports
CREATE OR REPLACE FUNCTION get_direct_reports(p_user_id UUID)
RETURNS TABLE(id UUID, name TEXT, position TEXT, role user_role) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.name, u.position, u.role
  FROM users u
  WHERE u.reports_to = p_user_id AND u.is_active = TRUE;
END;
$$ language 'plpgsql';

-- Function to get user's division members
CREATE OR REPLACE FUNCTION get_division_members(p_division_id UUID)
RETURNS TABLE(id UUID, name TEXT, position TEXT, role user_role) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.name, u.position, u.role
  FROM users u
  WHERE u.division_id = p_division_id AND u.is_active = TRUE;
END;
$$ language 'plpgsql';

-- Function to check if user can approve
CREATE OR REPLACE FUNCTION can_user_approve(p_user_id UUID, p_amount NUMERIC DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  v_role user_role;
  v_limit NUMERIC;
BEGIN
  SELECT role INTO v_role FROM users WHERE id = p_user_id;
  
  CASE v_role
    WHEN 'owner' THEN RETURN TRUE;
    WHEN 'kepala_kantor' THEN 
      IF p_amount IS NULL OR p_amount <= 10000000 THEN RETURN TRUE; END IF;
      RETURN FALSE;
    ELSE RETURN FALSE;
  END CASE;
END;
$$ language 'plpgsql';