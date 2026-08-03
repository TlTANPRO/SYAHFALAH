-- 001_initial_schema.sql
-- Core tables for Syahfalah Dashboard

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Custom types
CREATE TYPE user_role AS ENUM ('owner', 'kepala_kantor', 'pic_divisi', 'staff');
CREATE TYPE kpi_level AS ENUM ('company', 'kepala_kantor', 'division', 'personal');
CREATE TYPE kpi_status AS ENUM ('on_track', 'at_risk', 'off_track', 'achieved');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'overdue', 'cancelled');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE task_type AS ENUM ('daily_routine', 'weekly_target', 'monthly_target', 'ad_hoc', 'carry_over');
CREATE TYPE notification_type AS ENUM (
  'morning_brief', 'deadline_approaching', 'overdue', 'new_task', 
  'carry_over', 'kpi_at_risk', 'mention', 'approval_request'
);
CREATE TYPE reward_type AS ENUM (
  'bonus_monthly', 'bonus_quarterly', 'bonus_yearly', 'commission', 
  'incentive_qc', 'incentive_closing', 'incentive_media', 'promotion', 
  'public_recognition', 'training', 'flexible_work', 'physical_gift', 
  'coaching', 'sp1', 'sp2', 'sp3'
);

-- Companies table
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  subsidiaries TEXT[] DEFAULT '{}',
  fiscal_year TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Divisions table
CREATE TABLE divisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  pic_id UUID, -- Will reference users later
  parent_id UUID REFERENCES divisions(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (extends auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  division_id UUID REFERENCES divisions(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'staff',
  position TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  pin_salt TEXT NOT NULL,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  join_date DATE DEFAULT CURRENT_DATE,
  reports_to UUID REFERENCES users(id),
  notification_prefs JSONB DEFAULT '{"morning_brief": {"in_app": true, "push": true, "whatsapp": true}, "deadline": {"in_app": true, "push": true}, "overdue": {"in_app": true, "push": true, "whatsapp": true}}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK for divisions.pic_id
ALTER TABLE divisions ADD CONSTRAINT fk_division_pic FOREIGN KEY (pic_id) REFERENCES users(id);

-- KPIs table
CREATE TABLE kpis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  division_id UUID REFERENCES divisions(id),
  user_id UUID REFERENCES users(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  level kpi_level NOT NULL,
  formula TEXT,
  target NUMERIC NOT NULL DEFAULT 0,
  actual NUMERIC DEFAULT 0,
  progress NUMERIC GENERATED ALWAYS AS (
    CASE WHEN target > 0 THEN LEAST((actual / target) * 100, 100) ELSE 0 END
  ) STORED,
  unit TEXT NOT NULL DEFAULT '',
  frequency TEXT NOT NULL DEFAULT 'monthly',
  weight NUMERIC DEFAULT 1,
  status kpi_status GENERATED ALWAYS AS (
    CASE 
      WHEN progress >= 100 THEN 'achieved'::kpi_status
      WHEN progress >= 80 THEN 'on_track'::kpi_status
      WHEN progress >= 60 THEN 'at_risk'::kpi_status
      ELSE 'off_track'::kpi_status
    END
  ) STORED,
  evidence_required BOOLEAN DEFAULT FALSE,
  evidence_urls TEXT[] DEFAULT '{}',
  parent_kpi_id UUID REFERENCES kpis(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for KPI cascade queries
CREATE INDEX idx_kpis_company_period ON kpis(company_id, period_start, period_end) WHERE level = 'company';
CREATE INDEX idx_kpis_division_period ON kpis(division_id, period_start, period_end) WHERE level = 'division';
CREATE INDEX idx_kpis_user_period ON kpis(user_id, period_start, period_end) WHERE level = 'personal';
CREATE INDEX idx_kpis_parent ON kpis(parent_kpi_id);
CREATE INDEX idx_kpis_level ON kpis(level);

-- SOW (Scope of Work) table
CREATE TABLE sows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  division_id UUID REFERENCES divisions(id),
  position_id TEXT NOT NULL UNIQUE,
  position_name TEXT NOT NULL,
  tujuan_posisi TEXT,
  pic_pendamping UUID[] DEFAULT '{}',
  tools TEXT[] DEFAULT '{}',
  kpi_ringkasan TEXT,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SOW Tasks
CREATE TABLE sow_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sow_id UUID REFERENCES sows(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL DEFAULT 'daily',
  related_kpi_codes TEXT[] DEFAULT '{}',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  division_id UUID REFERENCES divisions(id),
  assignee_id UUID REFERENCES users(id) ON DELETE CASCADE,
  sow_id UUID REFERENCES sows(id),
  sow_task_id UUID REFERENCES sow_tasks(id),
  title TEXT NOT NULL,
  description TEXT,
  type task_type NOT NULL DEFAULT 'daily_routine',
  status task_status NOT NULL DEFAULT 'pending',
  priority task_priority NOT NULL DEFAULT 'medium',
  scheduled_date DATE NOT NULL,
  start_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_hours NUMERIC,
  actual_hours NUMERIC,
  original_task_id UUID REFERENCES tasks(id),
  is_carry_over BOOLEAN DEFAULT FALSE,
  recurrence_rule TEXT,
  notified_morning BOOLEAN DEFAULT FALSE,
  notified_deadline BOOLEAN DEFAULT FALSE,
  notified_overdue BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_assignee_date ON tasks(assignee_id, scheduled_date);
CREATE INDEX idx_tasks_division_date ON tasks(division_id, scheduled_date);
CREATE INDEX idx_tasks_status_date ON tasks(status, scheduled_date);
CREATE INDEX idx_tasks_carry_over ON tasks(original_task_id) WHERE is_carry_over = TRUE;
CREATE INDEX idx_tasks_type ON tasks(type);
CREATE INDEX idx_tasks_sow ON tasks(sow_id);

-- Subtasks
CREATE TABLE subtasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task-KPI Links (Many-to-Many)
CREATE TABLE task_kpis (
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  kpi_id UUID REFERENCES kpis(id) ON DELETE CASCADE,
  impact_weight NUMERIC DEFAULT 1,
  PRIMARY KEY (task_id, kpi_id)
);

-- Attachments
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments (Threaded)
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  parent_id UUID REFERENCES comments(id),
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_entity_type TEXT,
  related_entity_id UUID,
  read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX idx_notifications_user_read ON notifications(user_id, read, sent_at DESC);

-- Notification Deliveries (Audit log)
CREATE TABLE notification_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  message_id TEXT,
  error TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rewards & Punishments
CREATE TABLE rewards_punishments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type reward_type NOT NULL,
  trigger_reason TEXT NOT NULL,
  amount NUMERIC,
  description TEXT,
  status TEXT DEFAULT 'pending',
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id)
);

-- RACI Matrix
CREATE TABLE raci_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  activity TEXT NOT NULL,
  director TEXT CHECK (director IN ('R','A','C','I','-')),
  kepala_kantor TEXT CHECK (kepala_kantor IN ('R','A','C','I','-')),
  pic TEXT CHECK (pic IN ('R','A','C','I','-')),
  staff TEXT CHECK (staff IN ('R','A','C','I','-')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reporting Rhythm
CREATE TABLE reporting_rhythms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL,
  meeting_name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  participants TEXT[] NOT NULL,
  output TEXT,
  day_of_week INTEGER,
  day_of_month INTEGER,
  month_of_quarter INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Push Subscriptions (Web Push)
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Schedules
CREATE TABLE daily_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time_blocks JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, date)
);

-- Weekly Plans
CREATE TABLE weekly_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  week INTEGER NOT NULL CHECK (week BETWEEN 1 AND 4),
  activities TEXT[] DEFAULT '{}',
  targets JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, month, week)
);

-- Monthly Targets
CREATE TABLE monthly_targets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  indicators JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, month)
);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_divisions_updated_at BEFORE UPDATE ON divisions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kpis_updated_at BEFORE UPDATE ON kpis FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sows_updated_at BEFORE UPDATE ON sows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rewards_punishments_updated_at BEFORE UPDATE ON rewards_punishments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_raci_entries_updated_at BEFORE UPDATE ON raci_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_daily_schedules_updated_at BEFORE UPDATE ON daily_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_weekly_plans_updated_at BEFORE UPDATE ON weekly_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_monthly_targets_updated_at BEFORE UPDATE ON monthly_targets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;