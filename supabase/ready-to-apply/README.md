# Ready-to-apply SQL scripts

Copy-paste SQL yang siap di-run di Supabase SQL Editor.
TIDAK auto-applied (= butuh user manual action karena security policy).

## apply-011-migration.sql
- Apply: Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run
- Adds: clusters, leads, projects, consumer_cases tables + seed data
- Idempotent (ON CONFLICT DO NOTHING) — safe re-run
- Audit 6-Aug: tables ini return HTTP 404 (migration 011 belum di-apply)

## seed-2026-kpi-monthly.sql
- 3 strategi monthly distribution — UNCOMMENT yang sesuai
- Opsi A: Even split (annual/12)
- Opsi B: Single period (2026-08 baseline only)
- Opsi C: Destructive reset (back up 2025 first!)
- Audit 6-Aug: 0 2026 KPI targets di DB (semua 2025-01)
