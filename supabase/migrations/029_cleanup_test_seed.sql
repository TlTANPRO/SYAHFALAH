-- 029_cleanup_test_seed.sql
-- Plan audit D2: clean legacy 'Test Seed' division.
-- Division was a stale manual probe that polluted summary views.

DELETE FROM public.divisions WHERE name = 'Test Seed';
-- division_task_summary and division_kpi_summary are views over divisions,
-- so deletion automatically removes the offending rows on next refresh.
