# ARCHITECTURE DECISION RECORDS (ADR)

## ADR-001: Stay on Next.js + Supabase (not Flutter + NestJS)
**Decision**: Jangan rebuild dengan Flutter + NestJS seperti PRD §Architecture awalnya.

**Rationale**:
- Existing 36 pages + 9-batch UX work = significant sunk cost (~Rp 100 juta+ effort equivalent)
- Scrap = full rewrite with zero new business value delivered in the interim
- Supabase + Postgres = same as NestJS+Postgres core data storage
- Realtime via Supabase LISTEN/NOTIFY = same end-user experience as Socket.IO
- AI via Ollama local model = zero vendor lock, can run inside Supabase edge functions

**Consequences**:
- Positive: Zero rewrite, existing users not disrupted
- Negative: Stuck with Next.js client component model (vs Flutter mobile)
- Mitigation: Web App is mobile-responsive; native wrapper Phase 5 only

---

## ADR-002: WebSocket replacement = Supabase Realtime
**Decision**: Use Supabase Realtime instead of Socket.IO.

**Rationale**:
- Vercel edge runtime **does not support WebSocket** natively
- Supabase Realtime uses Postgres change events = works on serverless
- Free tier = 100 concurrent connections = sufficient for 13 users

**Implementation**:
- Subscribe from browser: `supabase.channel('lead-changes').on('postgres_changes', ...)`
- Triggered by Postgres triggers on INSERT/UPDATE
- No need to deploy separate WebSocket server

**Consequences**:
- Positive: Free, serverless-friendly
- Negative: Limited to change subscriptions; no arbitrary pub/sub
- Mitigation: Use Postgres triggers + Edge Functions for custom pub/sub

---

## ADR-003: Authentication = HS256 JWT in HttpOnly cookies (not Supabase Auth)
**Decision**: Use custom JWT, not Supabase Auth.

**Rationale**:
- Already shipped (PIN + access_token cookie + refresh_token)
- Simpler than Supabase Auth for 13 users
- Direct control over token claims

**Consequences**:
- Positive: Already production, working
- Negative: Manual refresh handling, session expiry
- Mitigation: Add WebAuthn MFA in Phase 2 (no schema change)

---

## ADR-004: Storage = Supabase Storage (not S3)
**Decision**: Keep on Supabase Storage.

**Rationale**:
- Supabase free tier = 1GB, paid $25/mo = 100GB. Sufficient.
- S3 migration possible later if needed (compatible API)
- Avoid multi-vendor billing complexity

**Consequences**:
- Positive: Single vendor, single dashboard
- Negative: Vendor lock-in for blob
- Mitigation: Soft-portability via API

---

## ADR-005: AI = Ollama local + cloud fallback (not OpenAI)
**Decision**: Local Ollama for non-sensitive queries, cloud for complex.

**Rationale**:
- Ollama free for 7B-13B models (e.g. llama3.1) at no cost
- Data privacy concern: financial data must not go to OpenAI
- Latency <500ms for local

**Implementation**:
- Run Ollama locally (laptop) for fast inference
- Supabase edge functions proxy to Ollama
- Cloud fallback (Claude Haiku, Sonnet) only when local insufficient

**Consequences**:
- Positive: Cost-effective, privacy-friendly
- Negative: Limited to Ollama-supported models
- Mitigation: Cloud fallback covers gaps

---

## ADR-006: API contract = tRPC-style (not REST)
**Decision**: Stick with hybrid REST + Server Actions.

**Rationale**:
- Existing codebase uses Next.js Server Actions + REST API routes
- Migrating to tRPC = 1-2 weeks of churn, zero new value
- Hybrid pattern works for current scale

**Consequences**:
- Positive: No rewrite
- Negative: Inconsistent types between REST and Server Actions
- Mitigation: Generate OpenAPI spec from route files in Phase 4 (inter-doc)

---

## ADR-007: Real-time UI = SWR/TanStack + Supabase Realtime, no Redux
**Decision**: Stay with TanStack Query (used in `/api/users`, `/api/tasks`).

**Rationale**:
- Cache + optimistic update built-in
- Supabase Realtime = direct subscription via `useEffect`
- Redux would be 3x the code for same result

**Consequences**:
- Positive: Lightweight
- Negative: No global state for cross-page flows (e.g., shopping cart)
- Mitigation: Re-add Zustand for cross-page state when needed

---

## ADR-008: Tests = Vitest (current), add E2E tests Playwright Phase 2
**Decision**: Continue Vitest for unit, add Playwright for E2E.

**Rationale**:
- 19/19 Vitest passing now
- Playwright handles Next.js + cookies + role-based flows well
- Free on Vercel

**Consequences**:
- Positive: Continuous deployment safer
- Negative: Adds CI runtime
- Mitigation: Run E2E only on main branch, parallelized

---

## ADR-009: Logging = simple structured logs (Vercel console + Supabase log), no Sentry
**Decision**: No Sentry. Use Vercel runtime logs + custom audit_logs table.

**Rationale**:
- PRD has specific **Audit Log** (PRD §23) requirement = business-grade logging
- Sentry = ops error tracking = different concern
- For 13 users, Vercel log retention sufficient

**Consequences**:
- Positive: Cost $0
- Negative: Limited error tracking (no stack trace aggregation)
- Mitigation: Add Sentry in Phase 3 if errors increase

---

## ADR-010: Mobile = responsive web app (no Flutter) until Phase 4
**Decision**: Defer Flutter mobile app to Phase 5.

**Rationale**:
- Web app mobile-responsive covers 80% of field use cases
- Flutter app = 4-6 weeks + $99/year Apple + Play Store setup
- Focus on operational modules first

**Consequences**:
- Positive: Cost avoided early
- Negative: No offline, no native camera features
- Mitigation: PWA + IndexedDB (Phase 4) + camera upload via input file

---
