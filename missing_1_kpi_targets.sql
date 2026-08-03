-- TABLE 1: KPI_TARGETS
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