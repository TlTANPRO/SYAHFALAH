# 📜 WAJIB BACA — Syahfalah Dashboard Edit Rules

**WAJIB DIBACA sebelum melakukan edit apapun di repo ini.**

Repo: SYAHFALAH (`C:\Users\Syahfalah\SYAHFALAH`)
Stack: Next.js 15.5.22 + React 18.3.1 + TypeScript + pnpm
Deploy: Vercel (`syahfalah-dashboard.vercel.app`) + Supabase (`wzwyiasnjzgnlmphqgkj`)

## 🚨 5 ATURAN KRITIS (WAJIB DIIKUTI)

### 1. ROLE-BASED ACCESS CONTROL (RBAC)
- **Role hierarchy**: `staff=1 < pic_divisi=2 < kepala_kantor=3 < owner=4`
- **kepala_kantor (Mada) = READ-ONLY** — tidak boleh POST/PATCH/DELETE di entity apapun
- ❌ **JANGAN** gunakan `hasRoleAtLeast(role, 'pic_divisi')` untuk BLOCK kepala_kantor — akan return `TRUE` (allow) karena kepala_kantor > pic_divisi
- ✅ **HARUS** gunakan `role === 'kepala_kantor'` eksplisit untuk block, atau `hasRoleAtLeast(role, 'staff')` untuk allow writes
- Lokasi cek: `src/middleware.ts` (edge) + `src/app/api/*/route.ts` (API handlers)
- JANGAN taruh RBAC di `layout.tsx` jika parent layout-nya `'use client'` — akan SILENTLY IGNORED

### 2. MIDDLEWARE vs LAYOUT
- Server-component layout yang throw `redirect()` dari `next/navigation` **TIDAK BISA** dipercaya jika parent layout (`(dashboard)/layout.tsx`) adalah `'use client'`
- **HARUS** taruh route-level RBAC di `src/middleware.ts` (edge, runs BEFORE any layout)
- Matcher saat ini: `/owner/:path*`, `/admin/:path*`, `/personal/:path*`, `/kepala-kantor/:path*`, `/divisi/:path*`
- Untuk tambah route baru, update ROUTE_RBAC array di `src/middleware.ts`

### 3. STACKING CONTEXT GOTCHA
- Element dengan `position: fixed` di dalam parent yang punya `backdrop-blur-md`, `transform`, `filter`, atau `overflow: hidden` akan **TERCLIP** (dropdown tidak muncul)
- **SOLUSI**: render dropdown/modal/popover via `createPortal(..., document.body)` agar escape dari parent context
- Berlaku untuk: UserMenu, modal, tooltip, command palette, dll yang render di top layer
- Test: jika dropdown tidak muncul, check parent `<header>` atau parent lain untuk backdrop-blur/transform

### 4. DEPLOY WORKFLOW
- `pnpm run deploy:prod` = `vercel deploy --prod --yes` → builds from **CURRENT WORKING TREE** (local disk), BUKAN git HEAD
- **WAJIB**: `git add -A && git commit -m "..."` SEBELUM `pnpm run deploy:prod`
- **WAJIB**: setelah deploy, verify via direct HTTP curl bahwa fix terkirim
  ```bash
  curl -v -H "Cookie: access_token=<mada_token>" https://syahfalah-dashboard.vercel.app/owner
  # Should return 307 redirect to /forbidden (NOT 200)
  ```
- Build green ≠ deploy correct — Vercel CDN bisa cache stale
- Output deploy: `syahfalah-dashboard-NEW_ALIAS-titan-0fab.vercel.app`

### 5. CACHE + PERSONALIZATION
- Authenticated routes: `Vary: Cookie` + `Cache-Control: private, must-revalidate, max-age=0` (di middleware)
- Anonymous routes: `Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=600`
- Jangan campur cache rules antara auth + anon — bisa data leak cross-user
- Untuk data per-user (brief, dashboard), pass scope key ke `unstable_cache`:
  ```ts
  unstable_cache(fn, ['entity', scope.role, scope.divisionId], { revalidate: 60, tags: [...] })
  ```

## 📂 STRUKTUR FILE PENTING

| Path | Fungsi |
|---|---|
| `src/middleware.ts` | **Edge RBAC** + cache headers (PALING PENTING) |
| `src/lib/auth/role-guard.ts` | `hasRoleAtLeast`, `requireRole`, `requireExactRole` |
| `src/lib/api/auth-guard.ts` | `requireAuth`, `requireAnyRole`, `isError` |
| `src/lib/api/errors.ts` | `apiError`, `buildError`, `wrapDbError` |
| `src/lib/api/crud-handler.ts` | `handleList`, `handleCreate`, `handleUpdate`, `handleDelete` |
| `src/lib/api/generic-crud.ts` | **OLD pattern**, gunakan `crud-handler.ts` untuk new APIs |
| `src/hooks/` | 5 generic React Query hooks (useEntityList, useEntityMutation, dll) |
| `src/lib/validation/field-limits.ts` | Validation helpers (title maxLength, etc) |
| `src/components/auth/UserMenu.tsx` | Profile dropdown (uses createPortal) |
| `src/components/layout/Topbar.tsx` | Topbar (jangan lupa backdrop-blur context) |
| `src/app/(dashboard)/layout.tsx` | **'use client'** parent — RBAC di layout child TIDAK BEKERJA |
| `src/app/(auth)/login/page.tsx` | Login + role-based redirect (P1-1) |
| `docs/bug-reports/mada-audit-2026-08-13.md` | 15 bugs audit report |
| `docs/architecture.md` | Full architecture |

## 🧪 TESTING

- **Canonical test command**: `npx playwright test` (semua test files)
- **Specific test**: `npx playwright test tests/<file>.spec.js --reporter=list`
- **Single bug regression**: `npx playwright test tests/<file>.spec.js -g "test name"`
- Test files location: `tests/*.spec.js`
- Login PIN: Pak Ardian (owner) = `1607`, Mada (kepala_kantor) = `0327`
- Mada's PIN = 0327 (kepala_kantor, READ-ONLY, expects read-only banner di /kepala-kantor)

## 🏗️ COMMAND CHEATSHEET

```bash
# Build + verify locally
pnpm run build

# Deploy to production
git add -A && git commit -m "..."
pnpm run deploy:prod

# Run all tests
npx playwright test

# Verify fix live
curl -v -H "Cookie: access_token=<token>" https://syahfalah-dashboard.vercel.app/api/tasks

# Check file
ls src/middleware.ts
ls src/app/api/tasks/route.ts
```

## 🆘 TROUBLESHOOTING PATTERNS

| Symptom | Likely Cause | Fix |
|---|---|---|
| Dropdown tidak muncul | Parent backdrop-blur/transform clipping | Use `createPortal(..., document.body)` |
| kepala_kantor bisa write | `hasRoleAtLeast` inverted logic | Use explicit `role === 'kepala_kantor'` |
| RBAC tidak enforce | Layout-level guard di client parent | Pindah ke `src/middleware.ts` |
| Deploy tidak update | Vercel cache stale | Touch file + force redeploy |
| Page returns HTML not JSON | Page route vs API route confusion | Periksa URL — page = HTML, /api/ = JSON |
| 401 on deploy test | Token expired | Re-login via `/api/auth/pin` |
| Test pass locally tapi fail di prod | Build cache different | Re-build + verify Vercel build hash |

## 📝 CHECKLIST SEBELUM COMMIT

- [ ] `pnpm run build` exit 0 (no TS errors)
- [ ] `npx playwright test` all pass
- [ ] `git status` clean (no uncommitted changes)
- [ ] `git log` shows meaningful commit message
- [ ] Manual curl test on dev URL (jika ada perubahan RBAC)
- [ ] Indonesian copy preserved
- [ ] No hardcoded secrets (PINs, tokens) in code
- [ ] Update docs/ jika ada perubahan arsitektur

---

**Updated**: 2026-08-13 (after Mada audit + 15 bug fixes + UserMenu portal fix)
**Maintainer**: Lihat `docs/architecture.md` untuk overview
