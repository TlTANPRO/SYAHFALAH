# DOMAIN 6 — KPI FRAMEWORK

## Existing KPI definitions (live DB)
- 29 `kpi_definitions` rows (sudah ada)
- 348 `kpi_targets` rows (2026 only)
- 348 `kpi_actuals` rows

## 3-Tier KPI Cascade (per PRD)

| Tier | Owner | Calculation |
|---|---|---|
| **KPI Personal** | Staff | Actual / Target (individual) |
| **KPI Divisi** | PIC | Σ actuals / Σ targets (per division_id) |
| **KPI Perusahaan** | Owner | Weighted avg across divisions |

## Tier Examples (PRD §5)

| Tier | Metric | Target | Actual |
|---|---|---|---|
| Personal | Mada - Lead | 200 | ? |
| Personal | Mada - Survey | 40 | ? |
| Personal | Mada - Closing | 10 | ? |
| Divisi | Marketing - Closing | 40 | 28 (70%) |
| Perusahaan | Total Unit Closing | 60 | 45 (75%) |

## Score Calculation (PRD §19)

Performance Score formula:
- KPI achievement × 40%
- Task completion × 30%
- Discipline (attendance, check-in/out) × 10%
- Report submission × 10%
- Response time × 10%

Total = Σ(weight × value), Grade = A/B/C/D based on total.

## DB Schema Implications

`kpi_definitions` needs:
- `cascade_level` (enum: 'personal', 'divisi', 'company')
- `parent_kpi_id` (FK → kpi_definitions.id, for hierarchy)
- `weight_percentage` (decimal, default based on cascade_level)

`kpi_targets` needs:
- `cascade_period` (enum: 'daily', 'weekly', 'monthly', 'quarterly', 'yearly')
- `parent_target_id` (FK → kpi_targets.id)

`kpi_actuals` needs:
- `recorded_by_user_id` (FK → users.id)
- `verified_by_user_id` (FK → users.id)
- `recorded_at` (timestamp)

---
