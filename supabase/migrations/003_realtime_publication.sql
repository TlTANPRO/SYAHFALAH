-- 003_realtime_publication.sql
-- Enable Supabase Realtime for real-time subscriptions

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE kpis;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE rewards_punishments;
ALTER PUBLICATION supabase_realtime ADD TABLE subtasks;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE weekly_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE monthly_targets;

-- Create function to broadcast KPI cascade updates
CREATE OR REPLACE FUNCTION broadcast_kpi_cascade()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify about KPI cascade changes
  PERFORM pg_notify('kpi_cascade', json_build_object(
    'kpi_id', NEW.id,
    'company_id', NEW.company_id,
    'division_id', NEW.division_id,
    'user_id', NEW.user_id,
    'level', NEW.level,
    'progress', NEW.progress,
    'status', NEW.status,
    'trigger', TG_OP
  )::text);
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger on KPI updates to cascade
CREATE TRIGGER kpi_cascade_trigger
AFTER INSERT OR UPDATE ON kpis
FOR EACH ROW
WHEN (OLD.progress IS DISTINCT FROM NEW.progress OR OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION broadcast_kpi_cascade();

-- Function to broadcast task changes
CREATE OR REPLACE FUNCTION broadcast_task_changes()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('task_changes', json_build_object(
    'task_id', NEW.id,
    'assignee_id', NEW.assignee_id,
    'division_id', NEW.division_id,
    'status', NEW.status,
    'type', NEW.type,
    'trigger', TG_OP
  )::text);
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER task_changes_trigger
AFTER INSERT OR UPDATE ON tasks
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.assignee_id IS DISTINCT FROM NEW.assignee_id)
EXECUTE FUNCTION broadcast_task_changes();

-- Function to broadcast new notifications
CREATE OR REPLACE FUNCTION broadcast_new_notification()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('new_notification', json_build_object(
    'notification_id', NEW.id,
    'user_id', NEW.user_id,
    'type', NEW.type,
    'title', NEW.title,
    'message', NEW.message
  )::text);
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER new_notification_trigger
AFTER INSERT ON notifications
FOR EACH ROW
EXECUTE FUNCTION broadcast_new_notification();

-- Function to broadcast new comments
CREATE OR REPLACE FUNCTION broadcast_new_comment()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('new_comment', json_build_object(
    'comment_id', NEW.id,
    'task_id', NEW.task_id,
    'user_id', NEW.user_id,
    'content', NEW.content
  )::text);
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER new_comment_trigger
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION broadcast_new_comment();

-- Grant permissions for realtime
GRANT SELECT ON tasks TO anon, authenticated;
GRANT SELECT ON kpis TO anon, authenticated;
GRANT SELECT ON notifications TO anon, authenticated;
GRANT SELECT ON comments TO anon, authenticated;
GRANT SELECT ON rewards_punishments TO anon, authenticated;
GRANT SELECT ON subtasks TO anon, authenticated;
GRANT SELECT ON daily_schedules TO anon, authenticated;
GRANT SELECT ON weekly_plans TO anon, authenticated;
GRANT SELECT ON monthly_targets TO anon, authenticated;