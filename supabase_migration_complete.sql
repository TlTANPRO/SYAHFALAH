-- ============================================
-- SYAHFALEH DASHBOARD - COMPLETE MIGRATION (SINGLE FILE)
-- Copy paste seluruh ini ke Supabase SQL Editor → Run sekali
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. DIVISIONS
-- ============================================
CREATE TABLE divisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES divisions(id),
    head_user_id UUID,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. USERS
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    pin_hash TEXT NOT NULL,
    pin_salt TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'kepala_kantor', 'pic_divisi', 'staff')),
    division_id UUID REFERENCES divisions(id),
    position TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    avatar_url TEXT,
    fcm_token TEXT,
    vapid_subscription JSONB,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE divisions ADD CONSTRAINT fk_divisions_head_user
    FOREIGN KEY (head_user_id) REFERENCES users(id);

-- ============================================
-- 3. SOW_TASKS
-- ============================================
CREATE TABLE sow_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    division_id UUID NOT NULL REFERENCES divisions(id),
    pic_user_id UUID REFERENCES users(id),
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    status TEXT CHECK (status IN ('planned', 'in_progress', 'completed', 'on_hold', 'cancelled')) DEFAULT 'planned',
    start_date DATE,
    end_date DATE,
    estimated_hours DECIMAL(6,2),
    actual_hours DECIMAL(6,2) DEFAULT 0,
    progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    dependencies UUID[],
    tags TEXT[],
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. KPI_DEFINITIONS
-- ============================================
CREATE TABLE kpi_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    level TEXT NOT NULL CHECK (level IN ('company', 'division', 'pic', 'personal')),
    division_id UUID REFERENCES divisions(id),
    unit TEXT NOT NULL,
    target_value DECIMAL(15,2) NOT NULL,
    target_period TEXT CHECK (target_period IN ('monthly', 'quarterly', 'yearly')) DEFAULT 'monthly',
    formula TEXT,
    direction TEXT CHECK (direction IN ('higher_better', 'lower_better')) DEFAULT 'higher_better',
    weight DECIMAL(4,2) DEFAULT 1.0,
    threshold_green DECIMAL(5,2) DEFAULT 80,
    threshold_yellow DECIMAL(5,2) DEFAULT 60,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. KPI_TARGETS
-- ============================================
CREATE TABLE kpi_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kpi_definition_id UUID NOT NULL REFERENCES kpi_definitions(id),
    period TEXT NOT NULL,
    target_value DECIMAL(15,2) NOT NULL,
    division_id UUID REFERENCES divisions(id),
    user_id UUID REFERENCES users(id),
    status TEXT CHECK (status IN ('draft', 'active', 'archived')) DEFAULT 'active',
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(kpi_definition_id, period, division_id, user_id)
);

-- ============================================
-- 6. KPI_ACTUALS
-- ============================================
CREATE TABLE kpi_actuals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kpi_target_id UUID NOT NULL REFERENCES kpi_targets(id),
    actual_value DECIMAL(15,2) NOT NULL,
    recorded_by UUID REFERENCES users(id),
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    evidence_urls TEXT[],
    notes TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ
);

-- ============================================
-- 7. TASKS
-- ============================================
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    type TEXT CHECK (type IN ('daily_routine', 'weekly_target', 'monthly_target', 'ad_hoc', 'carry_over')) DEFAULT 'ad_hoc',
    status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue', 'cancelled')) DEFAULT 'pending',
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    division_id UUID REFERENCES divisions(id),
    sow_task_id UUID REFERENCES sow_tasks(id),
    kpi_target_id UUID REFERENCES kpi_targets(id),
    scheduled_date DATE NOT NULL,
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    is_carry_over BOOLEAN DEFAULT FALSE,
    carry_over_from UUID REFERENCES tasks(id),
    parent_task_id UUID REFERENCES tasks(id),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. WEEKLY_PLANS
-- ============================================
CREATE TABLE weekly_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    week INTEGER NOT NULL CHECK (week BETWEEN 1 AND 4),
    activities TEXT[] DEFAULT '{}',
    targets JSONB DEFAULT '[]',
    status TEXT CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')) DEFAULT 'draft',
    submitted_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, month, week)
);

-- ============================================
-- 9. MONTHLY_PLANS
-- ============================================
CREATE TABLE monthly_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    indicators JSONB NOT NULL,
    status TEXT CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')) DEFAULT 'draft',
    submitted_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, month)
);

-- ============================================
-- 10. NOTIFICATIONS
-- ============================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'task_assigned', 'task_due_soon', 'task_overdue', 'task_completed',
        'kpi_at_risk', 'kpi_off_track', 'kpi_achieved',
        'weekly_plan_due', 'monthly_plan_due',
        'approval_requested', 'approval_approved', 'approval_rejected',
        'comment_added', 'mention',
        'system_announcement', 'morning_briefing'
    )),
    title TEXT NOT NULL,
    message TEXT,
    reference_id UUID,
    reference_type TEXT,
    priority TEXT CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    action_url TEXT,
    channels TEXT[] DEFAULT ARRAY['in_app'],
    sent_channels TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 11. COMMENTS
-- ============================================
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES users(id),
    reference_id UUID NOT NULL,
    reference_type TEXT NOT NULL CHECK (reference_type IN ('task', 'kpi', 'weekly_plan', 'monthly_plan', 'sow_task')),
    parent_comment_id UUID REFERENCES comments(id),
    mentions UUID[],
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 12. EVIDENCE
-- ============================================
CREATE TABLE evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_id UUID NOT NULL,
    reference_type TEXT NOT NULL CHECK (reference_type IN ('task', 'kpi_actual', 'weekly_plan', 'monthly_plan')),
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    description TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 13. REWARDS & PUNISHMENTS
-- ============================================
CREATE TABLE rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('reward', 'punishment')) NOT NULL,
    category TEXT CHECK (category IN (
        'performance', 'attendance', 'innovation', 'teamwork',
        'kpi_achievement', 'sow_completion', 'violation', 'other'
    )) NOT NULL,
    points INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    reference_id UUID,
    reference_type TEXT,
    given_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'redeemed')) DEFAULT 'pending',
    approved_at TIMESTAMPTZ,
    redeemed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 14. AUDIT_LOGS
-- ============================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 15. RACI_MATRIX
-- ============================================
CREATE TABLE raci_matrix (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity TEXT NOT NULL,
    sow_task_id UUID REFERENCES sow_tasks(id),
    division_id UUID NOT NULL REFERENCES divisions(id),
    role TEXT CHECK (role IN ('R', 'A', 'C', 'I')) NOT NULL,
    user_id UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(activity, division_id, role, user_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_users_division ON users(division_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_tasks_user_date ON tasks(user_id, scheduled_date);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_sow ON tasks(sow_task_id);
CREATE INDEX idx_tasks_kpi ON tasks(kpi_target_id);
CREATE INDEX idx_kpi_targets_period ON kpi_targets(period);
CREATE INDEX idx_kpi_targets_division ON kpi_targets(division_id);
CREATE INDEX idx_kpi_targets_user ON kpi_targets(user_id);
CREATE INDEX idx_kpi_actuals_target ON kpi_actuals(kpi_target_id);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_weekly_plans_user_month ON weekly_plans(user_id, month);
CREATE INDEX idx_monthly_plans_user_month ON monthly_plans(user_id, month);
CREATE INDEX idx_comments_reference ON comments(reference_id, reference_type);
CREATE INDEX idx_rewards_user ON rewards(user_id);
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_raci_activity ON raci_matrix(activity);

-- ============================================
-- RLS ENABLE
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sow_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_actuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE raci_matrix ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

CREATE POLICY "users_select_own_division" ON users
    FOR SELECT USING (
        auth.uid() = id 
        OR division_id = (SELECT division_id FROM users WHERE id = auth.uid())
        OR id IN (
            SELECT id FROM users 
            WHERE division_id = (SELECT division_id FROM users WHERE id = auth.uid())
            AND role IN ('staff', 'pic_divisi')
        )
    );

CREATE POLICY "divisions_select_all" ON divisions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "sow_tasks_select_division" ON sow_tasks
    FOR SELECT USING (
        division_id = (SELECT division_id FROM users WHERE id = auth.uid())
        OR (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'kepala_kantor')
    );
CREATE POLICY "sow_tasks_modify_pic_owner" ON sow_tasks
    FOR ALL USING (
        pic_user_id = auth.uid()
        OR (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'kepala_kantor')
    );

CREATE POLICY "kpi_def_select_all" ON kpi_definitions
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "kpi_def_modify_owner" ON kpi_definitions
    FOR ALL USING (
        (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'kepala_kantor')
    );

CREATE POLICY "kpi_targets_select_own" ON kpi_targets
    FOR SELECT USING (
        division_id = (SELECT division_id FROM users WHERE id = auth.uid())
        OR user_id = auth.uid()
        OR (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'kepala_kantor')
    );
CREATE POLICY "kpi_targets_modify_pic" ON kpi_targets
    FOR ALL USING (
        (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'kepala_kantor', 'pic_divisi')
        AND division_id = (SELECT division_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "kpi_actuals_select_own" ON kpi_actuals
    FOR SELECT USING (
        kpi_target_id IN (
            SELECT id FROM kpi_targets 
            WHERE division_id = (SELECT division_id FROM users WHERE id = auth.uid())
               OR user_id = auth.uid()
               OR (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'kepala_kantor')
        )
    );
CREATE POLICY "kpi_actuals_insert_own" ON kpi_actuals
    FOR INSERT WITH CHECK (
        kpi_target_id IN (
            SELECT id FROM kpi_targets 
            WHERE user_id = auth.uid() OR division_id = (SELECT division_id FROM users WHERE id = auth.uid())
        )
    );

CREATE POLICY "tasks_select_own_division" ON tasks
    FOR SELECT USING (
        user_id = auth.uid()
        OR division_id = (SELECT division_id FROM users WHERE id = auth.uid())
        OR (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'kepala_kantor')
    );
CREATE POLICY "tasks_modify_own" ON tasks
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "weekly_plans_select_own" ON weekly_plans
    FOR SELECT USING (
        user_id = auth.uid()
        OR (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'kepala_kantor', 'pic_divisi')
        AND division_id = (SELECT division_id FROM users WHERE id = auth.uid())
    );
CREATE POLICY "weekly_plans_modify_own" ON weekly_plans
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "monthly_plans_select_own" ON monthly_plans
    FOR SELECT USING (
        user_id = auth.uid()
        OR (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'kepala_kantor', 'pic_divisi')
        AND division_id = (SELECT division_id FROM users WHERE id = auth.uid())
    );
CREATE POLICY "monthly_plans_modify_own" ON monthly_plans
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "notifications_own" ON notifications
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "comments_select_division" ON comments
    FOR SELECT USING (
        author_id = auth.uid()
        OR reference_id IN (
            SELECT id FROM tasks WHERE division_id = (SELECT division_id FROM users WHERE id = auth.uid())
        )
        OR reference_id IN (
            SELECT id FROM kpi_targets WHERE division_id = (SELECT division_id FROM users WHERE id = auth.uid())
        )
    );
CREATE POLICY "comments_insert_own" ON comments
    FOR INSERT WITH CHECK (author_id = auth.uid());

CREATE POLICY "evidence_own" ON evidence
    FOR ALL USING (uploaded_by = auth.uid());

CREATE POLICY "rewards_select_own" ON rewards
    FOR SELECT USING (
        user_id = auth.uid()
        OR (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'kepala_kantor')
    );
CREATE POLICY "rewards_modify_approver" ON rewards
    FOR ALL USING (
        (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'kepala_kantor')
    );

CREATE POLICY "audit_logs_admin" ON audit_logs
    FOR SELECT USING (
        (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'kepala_kantor')
    );

CREATE POLICY "raci_select_division" ON raci_matrix
    FOR SELECT USING (
        division_id = (SELECT division_id FROM users WHERE id = auth.uid())
        OR (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'kepala_kantor')
    );
CREATE POLICY "raci_modify_pic" ON raci_matrix
    FOR ALL USING (
        (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'kepala_kantor', 'pic_divisi')
        AND division_id = (SELECT division_id FROM users WHERE id = auth.uid())
    );

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_divisions_updated_at BEFORE UPDATE ON divisions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sow_tasks_updated_at BEFORE UPDATE ON sow_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kpi_definitions_updated_at BEFORE UPDATE ON kpi_definitions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kpi_targets_updated_at BEFORE UPDATE ON kpi_targets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_weekly_plans_updated_at BEFORE UPDATE ON weekly_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_monthly_plans_updated_at BEFORE UPDATE ON monthly_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rewards_updated_at BEFORE UPDATE ON rewards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_raci_matrix_updated_at BEFORE UPDATE ON raci_matrix FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

SELECT 'Migration completed successfully!' as result;