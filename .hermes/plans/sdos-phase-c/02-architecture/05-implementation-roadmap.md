# IMPLEMENTATION ROADMAP — Sequenced build plan

## Phase 1 — Foundation (Wk 1-2: Plan A items)

| Item | Effort | Files |
|---|---|---|
| Employee profile upgrade | 2 d | employees/[id]/page.tsx, /api/employees/[id] |
| Target cascade logic | 1 d | kpi_targets self-FK + UI on owner/targets/page.tsx |
| Audit log DB + query | 0.5 d | audit_logs new table, /api/audit-logs |
| Digital Twin lite | 1 d | owner/twin/page.tsx + /api/twin/overview |
| Calendar upgrade | 1 d | calendar/page.tsx, /api/calendar/events |
| Approval workflow v2 | 1 d | approvals table + state machine |
| CSV export | 0.5 d | /api/kpis/export.csv |
| Strict 403 page | 0.5 d | error.tsx + role-guard update |

## Phase 2 — Core Operations (Wk 3-6)

| Item | Effort | Files |
|---|---|---|
| Marketing CRM domain | 1 wk | leads/surveys/bookings/sp3k/akad tables + /marketing/* |
| Project Management | 1 wk | blocks/house_units + /projects/* |
| Purchasing module | 1 wk | suppliers/materials/PO + /purchasing/* |
| Maintenance module | 0.5 wk | maintenance_tickets + /maintenance/* |

## Phase 3 — Intelligence (Wk 7-9)

| Item | Effort | Files |
|---|---|---|
| AI Copilot read-only (3 agents) | 1 wk | /api/ai/copilot + PDF reports |
| Workflow automation engine | 1 wk | notification_templates + cron |
| Reporting framework | 0.5 wk | /reports/* |
| Performance scoring | 0.5 wk | employees/[id]/performance |

## Phase 4 — Enterprise (Wk 10-12)

| Item | Effort | Files |
|---|---|---|
| Multi-cabang schema | 1 wk | divisions.cabang_id, projects.cabang_id |
| Data warehouse | 1 wk | snapshots/facts tables |
| Mobile PWA + offline | 1 wk | service-worker.ts + IndexedDB layer |

## Each phase gate must include:

- [ ] Migration applied + tested on staging
- [ ] API contracts finalized (typed responses)
- [ ] E2E tests in Playwright for main flows
- [ ] Smoke test of LIVE dashboard (existing pages still work)
- [ ] Stakeholder demo + sign-off
- [ ] Bug fix iteration (24-72 hour turnaround)

---
