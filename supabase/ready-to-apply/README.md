# Ready-to-apply SQL scripts

Copy-paste SQL yang siap di-run di Supabase SQL Editor.
Tidak auto-applied (= butuh user manual action karena security policy).

## apply-everything.sql ⭐ NEW
- Single file gabungan SEMUA pending migrations (011 + 010)
- Apply: Dashboard > SQL Editor > New Query > paste > Run
- Idempotent: IF NOT EXISTS guards + REVOKE idempotent. Safe re-run.
- Estimated runtime: 5 detik
- Audit 6-Aug confirms 4 table (clusters/projects/leads/consumer_cases) return 404,
  dan anon key masih bisa baca users.pin_hash (PII leak)

## apply-011-migration.sql
- Hanya PART A dari apply-everything.sql
- Adds: clusters, leads, projects, consumer_cases tables + seed data

## seed-2026-kpi-monthly.sql
- 3 strategi monthly distribution — UNCOMMENT sesuai preferensi
- Opsi A: Even split (annual/12)
- Opsi B: Single period (2026-08 baseline)
- Opsi C: Destructive reset (back up first!)
- Audit 6-Aug: 0 2026 KPI targets needed since cleaning

## Apply steps (cara manual free):
1. Buka https://supabase.com/dashboard
2. Pilih project Syahfalah-Operations
3. Klik "SQL Editor" di sidebar
4. Klik "New Query"
5. Paste entire contents of `apply-everything.sql`
6. Klik "Run" (Ctrl+Enter)
7. Tunggu ~5 detik. Check bawah "Result" atau "Messages" tab.

## Notes:
- No Internet/DNS access needed untuk apply = offline
- Tidak butuh bayar Cloudflare atau register domain
- Tidak butuh CLI tool (psql/pgcli) — pure web UI
- 30 detik effort total
