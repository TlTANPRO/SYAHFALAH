# ERD (Entity Relationship Diagram) — Final v1.0
**Status**: Draft, awaiting stakeholder approval

## Existing (70% aligned)

```
users (13) ─┬─ has ─ divisions (8)
            └─ own ─> consumer_cases (25)
                       ├─ embedded in ─ leads (40)
                       └─ flow into ─ projects (15)

tasks (33,276) ─ has ─ sow_tasks ─┬─ in ─ projects
                                  ├─ PIC ─ users
                                  └─ reported by ─ kpi_actuals

kpi_definitions (29) → kpi_targets (348) → kpi_actuals (348)
notifications (107) ─ for ─ users
audit_logs (existing) ─ action by ─ users
comments ─ on ─ tasks / leads / consumer_cases
monthly_plans, rewards (0) — wired but empty
```

## Additions needed (Phase 1+)

### 1. User schema expand
```sql
ALTER TABLE users ADD COLUMN reporting_to_user_id UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN hire_date DATE;
ALTER TABLE users ADD COLUMN skills TEXT[];
ALTER TABLE users ADD COLUMN photo_url TEXT;
ALTER TABLE users ADD COLUMN date_of_birth DATE;
```

### 2. Division schema expand
```sql
ALTER TABLE divisions ADD COLUMN parent_id UUID REFERENCES divisions(id);
ALTER TABLE divisions ADD COLUMN head_user_id UUID REFERENCES users(id);
ALTER TABLE divisions ADD COLUMN level INT DEFAULT 2;
ALTER TABLE divisions ADD COLUMN is_active BOOLEAN DEFAULT true;
```

### 3. Consumer_cases split into 5 tables (Phase 1+)
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE surveys (
  id UUID PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  surveyor_id UUID REFERENCES users(id),
  scheduled_date DATE,
  completed_date DATE,
  result TEXT,
  photos TEXT[]
);

CREATE TABLE bookings (
  id UUID PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  unit_id UUID, -- points to house_units (NEW)
  booking_date DATE,
  booking_fee NUMERIC,
  status TEXT
);

CREATE TABLE sp3k (
  id UUID PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id),
  documents JSONB,
  status TEXT, -- pending | approved | rejected
  sla_deadline DATE
);

CREATE TABLE akad (
  id UUID PRIMARY KEY,
  sp3k_id UUID REFERENCES sp3k(id),
  notaris_id UUID REFERENCES users(id),
  scheduled_date DATE,
  signed_date DATE
);
```

### 4. House tracking (Phase 2+)
```sql
CREATE TABLE projects ( ... ) -- rename clusters → projects
CREATE TABLE blocks (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  name TEXT,
  total_units INT
);
CREATE TABLE house_units (
  id UUID PRIMARY KEY,
  block_id UUID REFERENCES blocks(id),
  unit_number TEXT,
  type TEXT,
  status TEXT, -- available | booked | sold | handed_over
  customer_id UUID REFERENCES customers(id) -- current owner
);
```

### 5. Task schema expand
```sql
ALTER TABLE tasks ADD COLUMN type TEXT; -- 'lead_follow_up' | 'survey' | 'sp3k' | etc.
ALTER TABLE tasks ADD COLUMN parent_task_id UUID REFERENCES tasks(id);
ALTER TABLE tasks ADD COLUMN checklist_id UUID REFERENCES checklist_items(id);
ALTER TABLE tasks ADD COLUMN approval_id UUID REFERENCES approvals(id);
```

### 6. Target cascade
```sql
ALTER TABLE kpi_targets ADD COLUMN parent_target_id UUID REFERENCES kpi_targets(id);
ALTER TABLE kpi_targets ADD COLUMN cascade_period TEXT;
```

### 7. New domain tables (Phase 2+)
```sql
-- Legal (SHM, AJB, PBG, SLF)
CREATE TABLE legal_documents (...);
CREATE TABLE notaris_ledger (...);

-- Purchasing
CREATE TABLE suppliers (...);
CREATE TABLE materials (...);
CREATE TABLE purchase_orders (...);
CREATE TABLE purchase_requests (...);
CREATE TABLE stock_ledger (...);

-- Maintenance
CREATE TABLE maintenance_tickets (...);
CREATE TABLE maintenance_logs (...);

-- Operational
CREATE TABLE vehicles (...);
CREATE TABLE office_assets (...);
CREATE TABLE attendance_logs (...);
```

### 8. Cross-cutting
```sql
-- Attachments (universal file metadata)
CREATE TABLE attachments (
  id UUID PRIMARY KEY,
  entity_type TEXT, -- 'tasks' | 'leads' | 'house_units' | etc.
  entity_id UUID,
  storage_path TEXT,
  mime_type TEXT,
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMPTZ
);

-- Notifications template (Smart Reminder rules)
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY,
  trigger_type TEXT,
  recipient_role TEXT,
  message_template TEXT,
  channel TEXT[] -- ['in_app', 'whatsapp', 'email']
);
```

## Migration Order

```
Wave 1 (Phase 1, non-breaking):
- ALTER users, divisions (add columns with defaults)
- CREATE customers table, migrate consumer_cases → customers
- ALTER kpi_targets (cascade columns)
- ALTER tasks (type, parent_task_id)

Wave 2 (Phase 2, additive):
- CREATE surveys, bookings, sp3k, akad (linked to customers)
- CREATE blocks, house_units (linked to projects)
- CREATE legal_documents, notaris_ledger
- CREATE suppliers, materials, purchase_orders

Wave 3 (Phase 3, additive):
- CREATE maintenance_tickets, maintenance_logs
- CREATE vehicles, office_assets, attendance_logs
- CREATE notification_templates
- CREATE AI patterns
```

---
