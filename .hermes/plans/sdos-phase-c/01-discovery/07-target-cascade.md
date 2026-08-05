# DOMAIN 7 — TARGET CASCADE

## Cascade Pattern (per PRD §6)

```
Yearly Target → Quarterly → Monthly → Weekly → Daily
```

Example for "Bhumi Saka Arum Closing":
- Yearly 2026: 40 unit
- Q1 2026: 12 unit
- Monthly Jan: 4 unit
- Weekly: 1 unit
- Daily: ~0.2 unit (rounded to 1 every 4-5 days)

## Per-Division Targets

Each division has its own cascade:
- Marketing: Lead → Survey → Closing (downward funnel)
- Legal: SP3K → AJB → SHM Recording
- Project: Block completed → QC passed → Serah Terima
- Maintenance: Komplain resolved → chronic check
- Purchasing: PO processed → Material delivered → Receipt

## DB Schema

`kpi_targets` already exists, need to extend:
```sql
ALTER TABLE kpi_targets ADD COLUMN parent_target_id UUID REFERENCES kpi_targets(id);
ALTER TABLE kpi_targets ADD COLUMN cascade_period TEXT CHECK (cascade_period IN ('yearly','quarterly','monthly','weekly','daily'));
ALTER TABLE kpi_targets ADD COLUMN auto_calculate BOOLEAN DEFAULT false;
```

## Cascade Calculation Logic

When user changes Quarterly target:
1. Calculate proportional adjustment per month
2. Recalculate weekly = month ÷ 4 (rounded)
3. Recalculate daily = weekly ÷ 5
4. Trigger notification to PIC if cascade exceeds realistic (>1.5x current capacity)

## Validation (must have)

- Cascade sum across periods must equal parent total
- Daily target = 1 if division has weekly activity; 0 if no daily check expected
- If manual override, force comment/justification

---
