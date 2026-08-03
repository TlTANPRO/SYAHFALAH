-- TABLE 3: TASKS
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