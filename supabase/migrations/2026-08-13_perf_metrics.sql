-- Migration: Perf metrics table for cross-worker analytics aggregation
-- Created for HARD #1 of production hardening

create table if not exists public.perf_metrics (
  id bigserial primary key,
  recorded_at timestamptz not null default now(),
  metric_type text not null check (metric_type in ('mutation', 'cache_hit', 'cache_miss', 'page_load', 'sse_connect', 'sse_disconnect', 'mutation_error')),
  entity text,
  action text,
  duration_ms integer,
  user_id text,
  route text,
  metadata jsonb default '{}'::jsonb,
  worker_id text
);

create index if not exists idx_perf_metrics_recorded_at on public.perf_metrics (recorded_at desc);
create index if not exists idx_perf_metrics_type on public.perf_metrics (metric_type, recorded_at desc);

-- Enable RLS - service role can write, anon/authenticated can read aggregates
alter table public.perf_metrics enable row level security;

-- Only owner can read
create policy "perf_metrics read owner" on public.perf_metrics
  for select using (
    exists (
      select 1 from public.users u
      where u.id = (auth.jwt() ->> 'userId')::uuid
        and u.role = 'owner'
        and u.is_active = true
    )
  );

-- No write policy for clients - service role (supabase admin) writes from API

-- Aggregate view for last 1 hour
create or replace view public.perf_metrics_1h as
select
  metric_type,
  entity,
  action,
  count(*) as count,
  avg(duration_ms)::int as avg_duration_ms,
  max(duration_ms) as max_duration_ms,
  min(duration_ms) as min_duration_ms
from public.perf_metrics
where recorded_at > now() - interval '1 hour'
group by metric_type, entity, action
order by metric_type, entity, action;

comment on table public.perf_metrics is 'Aggregated perf metrics pushed by crud-handler mutations and page loads. PUSH for production observability.';