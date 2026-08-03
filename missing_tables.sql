-- ============================================
-- MISSING TABLES ONLY (kpi_targets, kpi_actuals, tasks)
-- Run this in Supabase SQL Editor
-- ============================================

-- 5. KPI_TARGETS
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

-- 6. KPI_ACTUALS
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

-- 7. TASKS
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

-- Indexes for missing tables
CREATE INDEX idx_tasks_user_date ON tasks(user_id, scheduled_date);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_sow ON tasks(sow_task_id);
CREATE INDEX idx_tasks_kpi ON tasks(kpi_target_id);
CREATE INDEX idx_kpi_targets_period ON kpi_targets(period);
CREATE INDEX idx_kpi_targets_division ON kpi_targets(division_id);
CREATE INDEX idx_kpi_targets_user ON kpi_targets(user_id);
CREATE INDEX idx_kpi_actuals_target ON kpi_actuals(kpi_target_id);

-- RLS for missing tables
ALTER TABLE kpi_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_actuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for missing tables
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

-- Updated_at triggers for missing tables
CREATE TRIGGER update_kpi_targets_updated_at BEFORE UPDATE ON kpi_targets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kpi_actuals_updated_at BEFORE UPDATE ON kpi_actuals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

SELECT 'Missing tables created successfully!' as result;