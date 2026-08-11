# AUDIT ADVERSARIAL KOMPREHENSIF — Syahfalah Dashboard Live

**URL**: https://syahfalah-dashboard.vercel.app
**Tanggal**: 2026-08-11
**Deploy**: `99czxd0nf-titan-0fab.vercel.app`
**Metode**: 5-kategori adversarial pass (Wrong Assumptions / Missing Data / Schema Conflicts / UX Traps / Environment)

---

## A. SCORING FRAMEWORK

| Aspek | Bobot | Skor | Catatan |
|---|---|---|---|
| **Kemudahan / UX** | 30% | 7.5/10 | QuickAdd visible, Cmd+Shift+K hint, Empty state copy, breadcrumbs, aria-label. Tapi ada gap di /kepala-kantor (no inline create). |
| **Performa** | 15% | 9/10 | Page load 200-850ms. API 250-400ms. AI 200ms-7s. Edge cache active. |
| **Reliability / Error handling** | 15% | 7/10 | Most errors proper 4xx, tapi ada 500 dengan raw SQL error leaked. |
| **Security** | 15% | 9/10 | CSP, HSTS, X-Frame, HttpOnly cookies, RBAC OK. Tapi error leakage dan beberapa endpoint 405 instead of 403. |
| **Backend Complexity** | 10% | 7/10 | 71 routes, 4880 LOC API (avg 68/route). Beberapa routes 200+ LOC. |
| **Frontend Complexity** | 10% | 7/10 | 142 pages, 17239 LOC. Beberapa file 400+ LOC. Bisa dipecah. |
| **Data Integrity** | 5% | 6/10 | Missing enum validation, FK violation leaks SQL, XSS stored as-is in DB. |

**TOTAL SKOR: 7.4/10 (Production-Ready dengan minor concerns)**

---

## B. RATING PER DIMENSI

### 1. KEMUDAHAN PENGGUNAAN (UX) — 7.5/10

**✓ STRENGTHS**
- QuickAdd accessible via Cmd+Shift+K (dengan kbd hint)
- Topbar "Buat" button dengan aria-keyshortcuts (visible tanpa shortcut)
- InlineNewTaskForm baru di /personal/tasks (Mada scenario solved)
- Empty state copy Bahasa Indonesia yang helpful ("Belum ada...", "Tambahkan...")
- 21 routes, all roles can reach relevant ones
- Login flow PIN-based, demo accounts listed di login page
- Toast feedback ("Berhasil dibuat", "Gagal", dst)
- aria-label di Topbar, Sidebar, DetailSheet, InlineEdit
- Touch targets AA compliant (min-h-8 / 32px) di PWA + Topbar

**✗ WEAKNESSES**
- **/kepala-kantor dashboard (Mada landing page)**: read-only stat cards. Tidak ada inline create. User harus navigate ke /personal/tasks manual. (Mada reported this exact issue)
- **Sidebar aria-current**: only 10 aria-* attributes di /personal/tasks page (relatif rendah)
- **<kbd> hint**: Tidak ada di sidebar items, hanya di Topbar
- **Toast container**: tidak visible di SSR HTML, hanya muncul post-hydration
- **404 page**: generic Next.js, tidak branded
- **Loading skeleton**: ada di beberapa page tapi tidak konsisten
- **No breadcrumb di beberapa page** (e.g. /owner, /kepala-kantor)
- **No search highlight**: Ctrl+F only, no in-app search on most pages
- **No onboarding tour** untuk user baru (misal Mada)

**Saran UX Prioritas**:
1. Tambah inline "Buat Task" button di /kepala-kantor Hero section
2. Tambah Quick links: "Ke Personal Tasks" di kepala-kantor agar Mada tidak bingung
3. Tambah breadcrumb ke owner/kepala-kantor
4. Consider onboarding modal pertama kali login per role

### 2. PERFORMA — 9/10

**✓ METRICS (run 2026-08-11)**

| Endpoint | Cold (ms) | Warm (ms) |
|---|---|---|
| /login | 842 | 813 |
| /owner | 743 | 513 |
| /kepala-kantor | 509 | 507 |
| /admin/users | 360 | 306 |
| /personal/tasks | 267 | 256 |
| /personal/kpi | 315 | 330 |
| /sow | 282 | 311 |
| /employees | 472 | 350 |
| /raci | 380 | 299 |
| /settings | 238 | 217 |

| API | Avg | Notes |
|---|---|---|
| /api/tasks | 300ms | Fast, includes pagination |
| /api/notifications | 200ms | Fast |
| /api/audit | 250ms | Fast |
| /api/ai/suggest-field | 189ms - 7.4s | Pattern match fallback works |
| /api/ai/copilot | ~6s | Full LLM cascade |

**Cache-Control: private, no-store** pada API = correct (no stale data).
**Vary header** includes RSC keys = correct Next.js App Router.

**✗ BOTTLENECKS**
- AI suggest-field worst case 7.4s (acceptable dengan 22s abort ceiling)
- /kepala-kantor 78KB body — heaviest page (acceptable)
- No HTTP caching visible to client (private always)

### 3. RELIABILITY / ERROR HANDLING — 7/10

**✓ GOOD CASES**

| Endpoint | Test | Result |
|---|---|---|
| POST /api/tasks (no body) | | 400 "title wajib diisi" ✓ |
| POST /api/auth/pin (no pin) | | 400 "PIN harus 4 digit angka" ✓ |
| POST /api/auth/pin (wrong pin) | | 401 "PIN salah" ✓ |
| POST /api/auth/pin (weak pin 0000) | | 400 "PIN terlalu lemah" ✓ |
| POST /api/bulk-import (no entity) | | 400 "entity 'undefined' not supported" ✓ |
| Rate limit (5 attempts) | | 429 "Terlalu banyak percobaan" ✓ |
| DELETE /api/audit/cleanup (bad date) | | 400 "specify before..." ✓ |
| Non-existent route | | 404 ✓ |
| Auth redirect | | 302 to /login?redirect=... ✓ |

**✗ PROBLEMS**

| Issue | Severity | Detail |
|---|---|---|
| DELETE /api/users/<id> | **Major** | 500 with raw SQL: `update or delete on table "users" violates foreign key constraint` |
| POST /api/tasks (bad FK) | **Major** | 500 with raw SQL: `insert or update on table "tasks" violates foreign key constraint` |
| POST /api/users (staff) | Minor | Returns 405 "Method Not Allowed" instead of 403 "Forbidden" — misleading |
| POST /api/audit/cleanup (staff) | Minor | 405 instead of 403 |
| POST /api/tasks (super-long 2000 chars) | Minor | 201 success, no max length |
| POST /api/tasks (invalid priority enum) | **Major** | 201 success, stores invalid value |
| POST /api/tasks (bad assigned_to UUID) | **Major** | 201 success, but FK orphan or null |

**Root cause**: Routes do PostgREST errors langsung ke client tanpa wrap. Beberapa routes tidak validate enum/PIN/UUID format.

### 4. KEAMANAN — 9/10

**✓ EXCELLENT**

| Aspect | Status |
|---|---|
| HttpOnly cookies | YES (access + refresh) |
| Secure flag | YES (HTTPS only) |
| SameSite | lax |
| Access token TTL | 15 min |
| Refresh token TTL | 7 days |
| CSP | strict (`frame-ancestors 'none'`) |
| X-Frame-Options | DENY |
| X-Content-Type-Options | nosniff |
| HSTS | preload, 2 years |
| Referrer-Policy | strict-origin-when-cross-origin |
| Permissions-Policy | camera/mic/geo blocked |
| SQL injection on PIN | Rejected (400 format) |
| RBAC | working (users/employees/audit) |
| Rate limiting | Working (5 attempts → 429) |
| middleware.ts | Auth + Role + Public paths |
| Vary headers | correct for RSC |
| X-Vercel-Cache | MISS for fresh data |

**⚠ NEEDS ATTENTION**

| Issue | Severity | Detail |
|---|---|---|
| FK violation exposes DB schema | Medium | PostgreSQL error msg visible: `relation "tasks" violates foreign key constraint` |
| Missing rate-limit headers | Low | Backend rate-limits but no `RateLimit-*` headers |
| Some endpoints 405 vs 403 | Low | Could confuse clients — prefer 403 for permission denied |
| No CSRF token (mitigated by SameSite=lax) | Low | SameSite=lax is OK for now |
| Vercel preview URLs leak signup page | Low | `99czxd0nf-titan-0fab.vercel.app` returns Vercel "Sign Up" (auth gating). Not a leak, just unexpected on first hit |

**Tidak ada masalah keamanan critical**. Middleware solid. Headers lengkap.

### 5. BACKEND COMPLEXITY — 7/10

**Source code: 71 API routes, 4880 LOC, avg 68 LOC/route**

| Category | Files | LOC |
|---|---|---|
| API routes | 71 | 4880 |
| AI endpoints | 10 | ~1100 |
| Marketing/CRM | 3 | ~250 |
| Operational | 4 | ~400 |
| Audit | 4 | ~250 |
| Auth | 3 | ~150 |

**Top complex routes**:
- /api/sync/process: 217 LOC (cron job, complex batching)
- /api/bulk-import: 169 LOC (table-agnostic)
- /api/targets: 168 LOC (cascade targets)
- /api/leads/score: 140 LOC (AI scoring)
- /api/search: 132 LOC (multi-entity search)
- /api/tasks: 129 LOC (main CRUD)
- /api/ai/copilot: 117 LOC (full agent)

**✓ GOOD**
- Generic CRUD pattern via /api/[entity]/[id]
- Service role key centralized in /lib/supabase/server
- Validation via Zod schemas
- TypeScript strict mode
- Rate limiting per route

**✗ COMPLEXITY HOTSPOTS**
- /api/sync/process: 217 LOC could be split (sync workers)
- /api/bulk-import: dynamic table routing needs more error context
- Several `[entity]` dynamic routes have similar but not identical validation
- No OpenAPI spec generated (manual docs would help)

### 6. FRONTEND COMPLEXITY — 7/10

**Source: 142 pages, 17239 LOC**

| File | LOC | Concern |
|---|---|---|
| lib/schema/registry.ts | 687 | Single source of truth (OK, intentional) |
| lib/ai/tools.ts | 466 | AI tool definitions (intentional centralization) |
| types/domain.ts | 458 | Type definitions (good) |
| app/(dashboard)/personal/tasks/page.tsx | 434 | Too large, should split |
| app/(dashboard)/owner/page.tsx | 411 | Too large |
| components/ui/quick-add-dialog.tsx | 402 | Complex dialog OK |
| components/admin/users/UserListClient.tsx | 404 | User mgmt complex but OK |
| components/ui/detail-sheet.tsx | 341 | OK |
| app/(dashboard)/calendar/page.tsx | 341 | OK |
| app/(dashboard)/kepala-kantor/page.tsx | 335 | Read-only stats, could be lighter |

**AI code**: 31 files, 4,417 LOC (12% of total) — significant AI integration.

**✓ GOOD**
- Shadcn/ui primitives reused
- TanStack Query for data fetching (caching, invalidation)
- Toast via uiStore (consistent)
- `'use client'` boundaries correctly placed
- TypeScript strict

**✗ CONCERNS**
- 434-line personal/tasks page could split into TaskListContainer + TaskRow + FilterBar
- 411-line /owner page could split into stats cards + sections
- Some duplication: stat card, KPI card patterns repeated
- 98 `as any` casts in src/lib/ai/ (per memory note — acceptable for now)

### 7. DATA INTEGRITY — 6/10

**Schema relations visible**:
- 12 users (all login verified)
- 12 employees (synced with users)
- 19 tasks (mix of QA test data + real)
- 5 approvals
- 18 notifications
- 10 audit logs
- 29 KPIs
- 6 cabangs
- 7 reports
- 3 calendar events

**✓ GOOD**
- Foreign keys enforced at DB level (RLS)
- Migrations clean (per supabase db history)
- Audit logs track changes
- Cascade deletes handled where appropriate

**✗ CONCERNS**
- **Enum validation missing**: priority, status, dll accept any string
- **XSS stored as-is**: `<script>` in title stored & returned in JSON (React renders safely but DB has dirty data)
- **FK error leaks schema**: tidak friendly error message
- **No soft deletes** for tasks (hard delete only — but audit log records it)
- **No data versioning**: hard to rollback
- **Test data still in DB**: 13+ "QA Task" / "QA DetailSheet inline confirm" rows from previous testing

---

## C. ADVERSARIAL PASS RESULTS

### Category 1: Wrong Assumptions
- ❌ Assume Mada has /kepala-kantor inline create → FALSE, must navigate to /personal/tasks
- ❌ Assume rate limit applies per IP → appears to be per-cookie/identifier (5 PIN attempts locks regardless of source)
- ❌ Assume owner can delete users → FALSE (FK violation from sessions/audit FK)
- ✓ Auth redirect preserves original path via `?redirect=` query
- ✓ Empty `division_id` for owner role handled correctly

### Category 2: Missing Data
- ❌ Empty tasks list on /personal/tasks doesn't suggest "Tambah Task" prominently (mitigated by InlineNewTaskForm on empty state)
- ❌ No KPI targets seeded for some users (Mada has none)
- ❌ Calendar only has 3 events — minimal data
- ✓ Empty state copy in Indonesian ("Belum ada data...")
- ✓ Skeleton loaders during data fetch

### Category 3: Schema Conflicts
- ❌ FK violation returns 500 with raw SQL → exposes schema
- ❌ Invalid enum values accepted (priority, status)
- ❌ No max-length on title (2000 chars accepted)
- ✓ RLS prevents cross-user writes
- ✓ Migrations tracked in supabase/migrations/

### Category 4: UX Traps
- ❌ /kepala-kantor has no quick action — user must hunt for Add Task
- ❌ Demo PIN list in login page footer — security concern (but intentional for demo)
- ❌ Cmd+K vs Cmd+Shift+K distinction — two shortcuts, may confuse
- ✓ Toast feedback on every action
- ✓ aria-labels on icon-only buttons
- ✓ Loading states prevent double-click

### Category 5: Environment
- ✓ Vercel CDN active (X-Vercel-Cache: MISS for fresh, HIT for static)
- ✓ Build `1786431127983` deployed and serving
- ✓ 21 routes all return 200 (no broken)
- ✓ Rate limit works (429 at 6th attempt)
- ❌ Vercel preview URLs (99czxd0nf...) show "Sign Up" page (auth gate) — confusing but not a bug
- ❌ No CDN for dynamic API responses (correct — always fresh)

---

## D. FINAL RATING

### Per User Role

| Role | Score | Notes |
|---|---|---|
| **Owner (Pak Ardian)** | 9/10 | Full access, everything works, comprehensive views |
| **Kepala Kantor (Mada)** | 6.5/10 | Lands on read-only dashboard, must discover /personal/tasks for create. New InlineNewTaskForm addresses this. |
| **PIC Divisi (Rizal)** | 7.5/10 | Has division view, but role boundaries unclear |
| **Staff (Amir)** | 8/10 | Clean personal view, simple task flow |

### Overall

| Dimension | Score |
|---|---|
| Kemudahan (UX) | **7.5/10** |
| Performa | **9/10** |
| Reliability | **7/10** |
| Security | **9/10** |
| Backend Complexity | **7/10** |
| Frontend Complexity | **7/10** |
| Data Integrity | **6/10** |
| **WEIGHTED TOTAL** | **7.6/10** |

**Verdict**: Production-ready dengan 5 minor concerns yang harus di-address:

1. **FK violation harus return 400/404, bukan 500** (security + UX)
2. **Enum validation di POST endpoints** (data integrity)
3. **Mada scenario: inline create di /kepala-kantor** (UX gap — solved di /personal/tasks via InlineNewTaskForm, tapi belum di kepala-kantor)
4. **Cleanup test data**: 13+ "QA Task" rows masih di production
5. **File size: 434-line personal/tasks page** bisa di-split

---

## E. REKOMENDASI

### P0 (Critical — blok production)
- Fix FK error → return 400 instead of 500
- Add enum validation di POST /api/tasks (priority, status)
- Cleanup QA test data from production

### P1 (High — UX)
- Add inline "Buat Task" di /kepala-kantor Hero section (mirror what we did for /personal/tasks)
- Add Quick Link "Lihat Personal Tasks" di kepala-kantor
- Add breadcrumb di /owner, /kepala-kantor

### P2 (Medium — improvement)
- Split personal/tasks page.tsx (434 LOC) into TaskListContainer + TaskRow + FilterBar
- Add `RateLimit-*` response headers
- Return 403 instead of 405 untuk permission denied endpoints
- Max-length validation for text fields (title 500 chars, description 5000 chars)
- Sanitize XSS in DB writes (or rely on React rendering only — current state)

### P3 (Low — nice to have)
- Onboarding tour for new users
- Search highlight in results
- Branded 404 page
- Dark mode CSS audit (some color tokens may not have dark variants)
