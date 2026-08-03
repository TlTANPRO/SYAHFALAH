-- 002_rls_policies.sql
-- Row Level Security policies for multi-tenant access control

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE sows ENABLE ROW LEVEL SECURITY;
ALTER TABLE sow_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards_punishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE raci_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE reporting_rhythms ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_targets ENABLE ROW LEVEL SECURITY;

-- ============================================
-- COMPANIES POLICIES
-- ============================================
CREATE POLICY "Users can view their company" ON companies
  FOR SELECT USING (
    id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Owner can manage company" ON companies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND company_id = companies.id 
      AND role = 'owner'
    )
  );

-- ============================================
-- DIVISIONS POLICIES
-- ============================================
CREATE POLICY "Users can view divisions in their company" ON divisions
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Owner/Head can manage divisions" ON divisions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND company_id = divisions.company_id 
      AND role IN ('owner', 'kepala_kantor')
    )
  );

-- ============================================
-- USERS POLICIES
-- ============================================
-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (id = auth.uid());

-- Users can read team members in same division
CREATE POLICY "Users can read team members" ON users
  FOR SELECT USING (
    division_id IN (SELECT division_id FROM users WHERE id = auth.uid())
    OR reports_to = auth.uid()
    OR id = auth.uid()
  );

-- Head/PIC can read all in their scope
CREATE POLICY "Managers can read team" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users m 
      WHERE m.id = auth.uid() 
      AND m.role IN ('owner', 'kepala_kantor', 'pic_divisi')
      AND (
        m.company_id = users.company_id
        OR m.division_id = users.division_id
        OR m.id = users.reports_to
      )
    )
  );

-- Owner can manage all users in company
CREATE POLICY "Owner can manage users" ON users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND company_id = users.company_id 
      AND role = 'owner'
    )
  );

-- Head can manage users in their division
CREATE POLICY "Head can manage division users" ON users
  FOR INSERT, UPDATE USING (
    EXISTS (
      SELECT 1 FROM users m 
      WHERE m.id = auth.uid() 
      AND m.role IN ('kepala_kantor', 'pic_divisi')
      AND m.division_id = users.division_id
    )
  );

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================
-- KPIs POLICIES
-- ============================================
-- Users can read KPIs in their scope
CREATE POLICY "Users can read relevant KPIs" ON kpis
  FOR SELECT USING (
    -- Company KPIs visible to all in company
    (level = 'company' AND company_id IN (SELECT company_id FROM users WHERE id = auth.uid()))
    OR
    -- Division KPIs visible to division members
    (level = 'division' AND division_id IN (SELECT division_id FROM users WHERE id = auth.uid()))
    OR
    -- Head/PIC KPIs visible to heads
    (level = 'kepala_kantor' AND company_id IN (SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'kepala_kantor')))
    OR
    -- Personal KPIs visible to self and managers
    (level = 'personal' AND (
      user_id = auth.uid()
      OR user_id IN (SELECT id FROM users WHERE reports_to = auth.uid())
      OR division_id IN (SELECT division_id FROM users WHERE id = auth.uid() AND role IN ('kepala_kantor', 'pic_divisi'))
    ))
  );

-- Owner/Head can manage company/division KPIs
CREATE POLICY "Managers can manage KPIs" ON kpis
  FOR INSERT, UPDATE, DELETE USING (
    EXISTS (
      SELECT 1 FROM users m 
      WHERE m.id = auth.uid() 
      AND m.role IN ('owner', 'kepala_kantor', 'pic_divisi')
      AND (
        (kpis.level = 'company' AND m.company_id = kpis.company_id)
        OR (kpis.level = 'division' AND m.division_id = kpis.division_id)
        OR (kpis.level = 'kepala_kantor' AND m.company_id = kpis.company_id)
        OR (kpis.level = 'personal' AND m.division_id = kpis.division_id)
      )
    )
  );

-- Users can update their own personal KPI actuals
CREATE POLICY "Users can update own KPI actuals" ON kpis
  FOR UPDATE USING (
    level = 'personal' 
    AND user_id = auth.uid()
    AND actual IS NOT NULL
  )
  WITH CHECK (
    level = 'personal' 
    AND user_id = auth.uid()
  );

-- ============================================
-- SOWs POLICIES
-- ============================================
CREATE POLICY "Users can read SOWs in their division" ON sows
  FOR SELECT USING (
    division_id IN (SELECT division_id FROM users WHERE id = auth.uid())
    OR company_id IN (SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'kepala_kantor'))
  );

CREATE POLICY "Managers can manage SOWs" ON sows
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users m 
      WHERE m.id = auth.uid() 
      AND m.role IN ('owner', 'kepala_kantor', 'pic_divisi')
      AND m.division_id = sows.division_id
    )
  );

-- ============================================
-- SOW TASKS POLICIES
-- ============================================
CREATE POLICY "Users can read SOW tasks in their division" ON sow_tasks
  FOR SELECT USING (
    sow_id IN (SELECT id FROM sows WHERE division_id IN (SELECT division_id FROM users WHERE id = auth.uid()))
  );

CREATE POLICY "Managers can manage SOW tasks" ON sow_tasks
  FOR ALL USING (
    sow_id IN (
      SELECT id FROM sows 
      WHERE division_id IN (
        SELECT division_id FROM users 
        WHERE id = auth.uid() 
        AND role IN ('owner', 'kepala_kantor', 'pic_divisi')
      )
    )
  );

-- ============================================
-- TASKS POLICIES
-- ============================================
-- Users can read tasks assigned to them or in their division
CREATE POLICY "Users can read relevant tasks" ON tasks
  FOR SELECT USING (
    assignee_id = auth.uid()
    OR division_id IN (SELECT division_id FROM users WHERE id = auth.uid())
    OR assignee_id IN (SELECT id FROM users WHERE reports_to = auth.uid())
  );

-- Users can create tasks for themselves or their team
CREATE POLICY "Users can create tasks" ON tasks
  FOR INSERT WITH CHECK (
    assignee_id = auth.uid()
    OR assignee_id IN (SELECT id FROM users WHERE reports_to = auth.uid())
    OR EXISTS (
      SELECT 1 FROM users m 
      WHERE m.id = auth.uid() 
      AND m.role IN ('owner', 'kepala_kantor', 'pic_divisi')
      AND m.division_id = tasks.division_id
    )
  );

-- Users can update their own tasks
CREATE POLICY "Users can update own tasks" ON tasks
  FOR UPDATE USING (
    assignee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users m 
      WHERE m.id = auth.uid() 
      AND m.role IN ('owner', 'kepala_kantor', 'pic_divisi')
      AND m.division_id = tasks.division_id
    )
  );

-- Managers can delete tasks in their scope
CREATE POLICY "Managers can delete tasks" ON tasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users m 
      WHERE m.id = auth.uid() 
      AND m.role IN ('owner', 'kepala_kantor', 'pic_divisi')
      AND m.division_id = tasks.division_id
    )
  );

-- ============================================
-- SUBTASKS POLICIES
-- ============================================
CREATE POLICY "Users can read subtasks of accessible tasks" ON subtasks
  FOR SELECT USING (
    task_id IN (SELECT id FROM tasks WHERE assignee_id = auth.uid() OR division_id IN (SELECT division_id FROM users WHERE id = auth.uid()))
  );

CREATE POLICY "Users can manage subtasks of own tasks" ON subtasks
  FOR ALL USING (
    task_id IN (SELECT id FROM tasks WHERE assignee_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM users m 
      WHERE m.id = auth.uid() 
      AND m.role IN ('owner', 'kepala_kantor', 'pic_divisi')
      AND task_id IN (SELECT id FROM tasks WHERE division_id = m.division_id)
    )
  );

-- ============================================
-- COMMENTS POLICIES
-- ============================================
CREATE POLICY "Users can read comments on accessible tasks" ON comments
  FOR SELECT USING (
    task_id IN (SELECT id FROM tasks WHERE assignee_id = auth.uid() OR division_id IN (SELECT division_id FROM users WHERE id = auth.uid()))
  );

CREATE POLICY "Users can comment on accessible tasks" ON comments
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND task_id IN (SELECT id FROM tasks WHERE assignee_id = auth.uid() OR division_id IN (SELECT division_id FROM users WHERE id = auth.uid()))
  );

CREATE POLICY "Users can update own comments" ON comments
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================
-- NOTIFICATIONS POLICIES
-- ============================================
CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- System can create notifications
CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- ============================================
-- NOTIFICATION DELIVERIES POLICIES
-- ============================================
CREATE POLICY "Users can read own delivery logs" ON notification_deliveries
  FOR SELECT USING (
    notification_id IN (SELECT id FROM notifications WHERE user_id = auth.uid())
  );

-- ============================================
-- REWARDS & PUNISHMENTS POLICIES
-- ============================================
CREATE POLICY "Users can read own rewards" ON rewards_punishments
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Managers can read team rewards" ON rewards_punishments
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE reports_to = auth.uid())
    OR EXISTS (
      SELECT 1 FROM users m 
      WHERE m.id = auth.uid() 
      AND m.role IN ('owner', 'kepala_kantor', 'pic_divisi')
      AND user_id IN (SELECT id FROM users WHERE division_id = m.division_id)
    )
  );

CREATE POLICY "Managers can manage rewards" ON rewards_punishments
  FOR INSERT, UPDATE USING (
    EXISTS (
      SELECT 1 FROM users m 
      WHERE m.id = auth.uid() 
      AND m.role IN ('owner', 'kepala_kantor')
      AND user_id IN (SELECT id FROM users WHERE company_id = m.company_id)
    )
  );

-- ============================================
-- RACI ENTRIES POLICIES
-- ============================================
CREATE POLICY "Users can read RACI in their company" ON raci_entries
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Owner/Head can manage RACI" ON raci_entries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users m 
      WHERE m.id = auth.uid() 
      AND m.role IN ('owner', 'kepala_kantor')
      AND m.company_id = raci_entries.company_id
    )
  );

-- ============================================
-- REPORTING RHYTHMS POLICIES
-- ============================================
CREATE POLICY "Users can read rhythms in their company" ON reporting_rhythms
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Owner/Head can manage rhythms" ON reporting_rhythms
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users m 
      WHERE m.id = auth.uid() 
      AND m.role IN ('owner', 'kepala_kantor')
      AND m.company_id = reporting_rhythms.company_id
    )
  );

-- ============================================
-- PUSH SUBSCRIPTIONS POLICIES
-- ============================================
CREATE POLICY "Users can manage own push subscriptions" ON push_subscriptions
  FOR ALL USING (user_id = auth.uid());

-- ============================================
-- DAILY SCHEDULES POLICIES
-- ============================================
CREATE POLICY "Users can manage own schedule" ON daily_schedules
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Managers can read team schedules" ON daily_schedules
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE reports_to = auth.uid())
    OR EXISTS (
      SELECT 1 FROM users m 
      WHERE m.id = auth.uid() 
      AND m.role IN ('kepala_kantor', 'pic_divisi')
      AND user_id IN (SELECT id FROM users WHERE division_id = m.division_id)
    )
  );

-- ============================================
-- WEEKLY PLANS POLICIES
-- ============================================
CREATE POLICY "Users can manage own weekly plans" ON weekly_plans
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Managers can read team weekly plans" ON weekly_plans
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE reports_to = auth.uid())
    OR EXISTS (
      SELECT 1 FROM users m 
      WHERE m.id = auth.uid() 
      AND m.role IN ('kepala_kantor', 'pic_divisi')
      AND user_id IN (SELECT id FROM users WHERE division_id = m.division_id)
    )
  );

-- ============================================
-- MONTHLY TARGETS POLICIES
-- ============================================
CREATE POLICY "Users can manage own monthly targets" ON monthly_targets
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Managers can read team monthly targets" ON monthly_targets
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE reports_to = auth.uid())
    OR EXISTS (
      SELECT 1 FROM users m 
      WHERE m.id = auth.uid() 
      AND m.role IN ('kepala_kantor', 'pic_divisi')
      AND user_id IN (SELECT id FROM users WHERE division_id = m.division_id)
    )
  );

-- ============================================
-- ATTACHMENTS POLICIES
-- ============================================
CREATE POLICY "Users can read attachments on accessible tasks" ON attachments
  FOR SELECT USING (
    task_id IN (SELECT id FROM tasks WHERE assignee_id = auth.uid() OR division_id IN (SELECT division_id FROM users WHERE id = auth.uid()))
  );

CREATE POLICY "Users can upload attachments to accessible tasks" ON attachments
  FOR INSERT WITH CHECK (
    uploaded_by = auth.uid()
    AND task_id IN (SELECT id FROM tasks WHERE assignee_id = auth.uid() OR division_id IN (SELECT division_id FROM users WHERE id = auth.uid()))
  );