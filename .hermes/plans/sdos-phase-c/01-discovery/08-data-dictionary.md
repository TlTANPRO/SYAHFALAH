# DOMAIN 8 — MASTER DATA DICTIONARY

## Primary Entities (current + planned)

### Person entities
- `users` — system login users (13 rows)
- `employees` — extended HR data (need to create)
- `customers` — property buyers (was in `consumer_cases`, split needed)

### Organization
- `divisions` — 8 rows, live
- `roles` — enum: owner, kepala_kantor, kepala_divisi, pic_divisi, staff

### Location
- `clusters` — 6 rows (project groupings), rename to `projects`?
- `blocks` — NEW (sub-area within cluster)
- `house_units` — NEW (individual residential unit)
- `addresses` — if needed for customer mapping

### Sales Pipeline
- `leads` — 40 rows, live
- `surveys` — NEW (was inside lead steps)
- `bookings` — NEW (was consumer_cases subset)
- `sp3k` — NEW (was inside consumer_cases)
- `akad` — NEW (split out)
- `serah_terima` — NEW (post-handover mark)

### Construction
- `sow_tasks` — live, 33k+ rows in `tasks`
- `block_progress` — NEW (per-block tracking)
- `phase_history` — NEW (phase progression log)
- `qc_reports` — NEW (with photo attachments)

### Legal
- `legal_documents` — NEW (SHM, AJB, PBG, SLF records)
- `notaris_coordination` — NEW (external party ledger)

### Purchasing
- `suppliers` — NEW
- `materials` — NEW
- `purchase_orders` — NEW
- `stock_ledger` — NEW (in/out ledger)
- `purchase_requests` — NEW (input from project)

### Maintenance
- `maintenance_tickets` — NEW
- `technician_assignments` — NEW
- `maintenance_logs` — NEW (foto before/after)

### Operational
- `vehicles` — NEW
- `office_assets` — NEW
- `attendance_logs` — NEW
- `utility_readings` — NEW (electric, water, internet)

### KPI / Target
- `kpi_definitions` — 29 rows, live
- `kpi_targets` — 348 rows, live
- `kpi_actuals` — 348 rows, live
- `targets_cascade` — link table for parent/child

### Notification / Audit
- `notifications` — 107 rows, live
- `audit_logs` — exists, but schema needs review
- `comments` — exists
- `checklist_items` — need

### Cross-cutting
- `attachments` — file metadata table for ALL entities
- `tags` — flexible label system

## Total entities: ~40

---
