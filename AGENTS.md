# AGENTS.md — Syahfalah Dashboard

> **WAJIB BACA `WAJIB-BACA.md` sebelum edit apapun.**
> File itu berisi 5 aturan kritis (RBAC, middleware, stacking context, deploy, cache) yang WAJIB diikuti. Setiap edit yang menyangkut RBAC, API routes, dropdowns, atau deploy HARUS baca itu dulu.

## Project

Syahfalah Operations Dashboard — Next.js 15.5.22 + React 18.3.1 + TypeScript + pnpm + Supabase + Vercel.

- **Repo**: `C:\Users\Syahfalah\SYAHFALAH`
- **Production URL**: `https://syahfalah-dashboard.vercel.app`
- **Supabase project**: `wzwyiasnjzgnlmphqgkj`
- **Vercel team**: `titan-0fab`

## 5 Aturan Kritis (ringkasan)

1. **RBAC** — kepala_kantor (Mada) = READ-ONLY. Block dengan `role === 'kepala_kantor'` eksplisit, JANGAN `hasRoleAtLeast` (inverted).
2. **Middleware > Layout** — RBAC harus di `src/middleware.ts` (edge), bukan di layout.tsx yang parent-nya `'use client'`.
3. **Stacking context** — Dropdown dengan `position: fixed` di parent yang punya `backdrop-blur-md` akan terclip. Pakai `createPortal(..., document.body)`.
4. **Deploy workflow** — `git add -A && git commit` SEBELUM `pnpm run deploy:prod`. Verify live via curl setelah deploy.
5. **Cache + personalization** — Auth: `Vary: Cookie + private`. Per-user data: scope cache key by `role` + `divisionId`.

Detail lengkap: **[WAJIB-BACA.md](./WAJIB-BACA.md)** — file ini wajib dibaca sebelum edit.

## Skills

- `syahfalah-rbac-and-deploy` — workflow RBAC + deploy (loaded automatically for relevant edits)

## Test

```bash
# All tests
npx playwright test

# Build check
pnpm run build

# Deploy (after git commit)
pnpm run deploy:prod
```

## Quick Reference

| Yang diubah | File yang perlu dicek |
|---|---|
| RBAC rule | `src/middleware.ts` + `src/app/api/*/route.ts` |
| User dropdown | `src/components/auth/UserMenu.tsx` |
| Header | `src/components/layout/Topbar.tsx` |
| Login redirect | `src/app/(auth)/login/page.tsx` |
| API route | `src/app/api/<entity>/route.ts` + `src/lib/api/crud-handler.ts` |
| Validation | `src/lib/validation/field-limits.ts` |
| Cache | `src/middleware.ts` headers + page-level `revalidate` |
| Documentation | `docs/architecture.md` + `docs/bug-reports/` |

## Account PINs (testing)

- Pak Ardian (owner) — `1607` — full access
- Mada (kepala_kantor) — `0327` — READ-ONLY, expect /kepala-kantor redirect
- Other: see `docs/bug-reports/mada-audit-2026-08-13.md`

## Last updated

2026-08-13 — Added after Mada audit (15 bugs found, 12 fixed, 14/14 Playwright green)
