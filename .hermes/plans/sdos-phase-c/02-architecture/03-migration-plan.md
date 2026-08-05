# MIGRATION PLAN

## Migration Principles

1. **Additive only** — never DROP or DELETE existing tables/columns used by current dashboard
2. **Non-blocking** — running dashboard continues functioning throughout
3. **Reversible** — every migration has a rollback path
4. **Backed up** — Supabase point-in-time recovery before each wave
5. **Validated** — dry-run on Supabase project copy first

## Migration Wave Calendar

### Wave 1 — Phase 1 deliverables (Week 2-3)
Goal: Foundation untuk current dashboard

| Migration | Status | Risk | Rollback |
|---|---|---|---|
| ALTER users (add reporting_to_user_id, hire_date, skills) | NEW columns nullable | NONE | Drop columns |
| ALTER divisions (add parent_id, head_user_id, level, is_active) | NEW columns nullable | NONE | Drop columns |
| ALTER kpi_targets (add parent_target_id, cascade_period) | NEW columns nullable | NONE | Drop columns |
| ALTER kpi_definitions (add cascade_level, parent_kpi_id, weight_percentage) | NEW columns nullable | NONE | Drop columns |
| ALTER tasks (add type, parent_task_id) | NEW columns nullable | NONE | Drop columns |
| ALTER projects (rename clusters → projects) - NEW parallel | Soft migration | LOW | Use clusters backup view |
| ALTER leads (add source, score, status, assigned_to) | NEW columns nullable | NONE | Drop columns |
| ALTER consumer_cases (rename not yet, just add customer_id FK) | NEW column nullable | NONE | Drop column |

### Wave 2 — Phase 2 (Week 5-8)
Goal: Split consumer_cases, add core business modules

| Migration | Status | Risk |
|---|---|---|
| CREATE customers (copy from consumer_cases rows) | NEW table, no impact | LOW |
| CREATE surveys, bookings, sp3k, akad | NEW tables | LOW |
| CREATE blocks, house_units | NEW tables | LOW |
| CREATE legal_documents, notaris_ledger | NEW tables | LOW |
| CREATE suppliers, materials, purchase_orders, purchase_requests, stock_ledger | NEW tables | LOW |
| CREATE attachments | NEW table | NONE |
| CREATE notification_templates | NEW table | LOW |

### Wave 3 — Phase 3 (Week 11-14)
Goal: Maintenance, operational, AI patterns

| Migration | Status | Risk |
|---|---|---|
| CREATE maintenance_tickets, maintenance_logs | NEW tables | LOW |
| CREATE vehicles, office_assets, attendance_logs, utility_readings | NEW tables | LOW |
| CREATE ai_patterns (event_pattern + recommendation_history) | NEW tables | LOW |
| CREATE approval_workflow (state machine records) | NEW table | LOW |
| CREATE checklist_items | NEW table | LOW |

### Wave 4 — Phase 4 (Week 17-20)
Goal: Enterprise scale features

| Migration | Status | Risk |
|---|---|---|
| ADD multi-cabang schema (clusters.cabang_id, divisions.cabang_id) | NEW columns nullable | MEDIUM |
| CREATE api_gateway_log | NEW table | LOW |
| CREATE data_warehouse (snapshot, fact tables) | NEW schema | HIGH |
| CREATE offline_sync_queue | NEW table | MEDIUM |

## Rollback Procedure per Wave

Before each wave:
1. Snapshot Supabase point-in-time recovery marker
2. Record migration SQL in `migrations/00NN_name.sql` with downward migration
3. Run on staging copy first
4. Validate schema in Supabase Studio
5. Apply to production
6. Smoke test current dashboard still works

## Out-of-Scope Migrations

- **No DROP**: any existing column or table
- **No RENAME**: tables with existing data (avoid renaming; add parallel view)
- **No DELETE**: existing rows
- **No column type changes**: existing columns must keep their type

---
