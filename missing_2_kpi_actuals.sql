-- TABLE 2: KPI_ACTUALS
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