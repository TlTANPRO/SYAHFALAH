# Masterplan Simplifikasi Backend + Frontend (UX/UI)
## Syahfalah Dashboard — Tanpa Mengurangi Fitur

**Tanggal**: 2026-08-11
**Filosofi**: KISS, DRY, elimitasi duplikasi, centralisasi pattern, KOMPONEN KECIL & FOKUS.
**Constraint**: ZERO feature removal. ZERO behavior change yang visible. Semua test existing harus pass.

---

## A. AUDIT SAAT INI (Pain Points Terverifikasi)

### Backend

| Pain Point | Evidence | Dampak |
|---|---|---|
| **23 endpoint manual pagination** | 6+ files dengan `pageSize/offset/range()` boilerplate identik | ~30 LOC duplikasi per endpoint × 23 = **~700 LOC** redundant |
| **0 generic CRUD handler** | Semua entity punya `/api/[entity]/route.ts` sendiri | Tambah entity baru = tulis 100+ LOC lagi |
| **17 schemas defined, tapi tiap API route hard-code field list** | `select('id, title, ...')` manual di tiap route | Drift antara schema & API |
| **Auth boilerplate 7 baris di setiap route** | `cookies().get('access_token')` + `verifyAccessToken()` × 23 | ~150 LOC duplikasi |
| **Error wrapping tidak konsisten** | Beberapa return `{error: msg}`, beberapa `{success: bool, error}`, beberapa raw PostgREST | Client harus handle 3+ shape |
| **405 vs 403 confusion** | Endpoint permission-denied return 405 (bukan 403) | Client UX bingung |

### Frontend (UX/UI)

| Pain Point | Evidence | Dampak |
|---|---|---|
| **6 pages dengan pagination boilerplate identik** | personal/tasks, reports, KPI list, audit, team, users | ~80 LOC × 6 = ~480 LOC duplikasi |
| **14 InlineNewTaskForm-style forms tersebar** | Tiap entity (leads, projects, dll) bikin form sendiri | Saat redesign, 14 tempat harus diubah |
| **Empty state copy hard-coded di banyak tempat** | "Belum ada data..." di 25+ pages | Inkonsisten saat copywriting update |
| **Stat cards pattern berulang 30+ kali** | Owner dashboard, Kepala Kantor, KPI explorer — sama pola beda warna | Maintenance nightmare |
| **Filter/search/tab logic disalin ke setiap list page** | 6+ files | Inkonsistensi UX |
| **Toast pattern tidak di-abstraksi** | Tiap mutation punya onSuccess/onError boilerplate | Visual noise di code |

### Kompleksitas

- **340 TS files, 37,060 LOC**
- **142 pages, 17,239 LOC (47%)**
- **71 API routes, 4,880 LOC (avg 68/route)**
- **434-LOC personal/tasks page** (too big)
- **411-LOC /owner page** (too big)

---

## B. STRATEGI 7-LAYER SIMPLIFIKASI

### Layer 1: API Foundation (Generic CRUD)
**Target**: Eliminasi 60% API boilerplate. 23 endpoint jadi ~10.

```
BEFORE:
/api/tasks/route.ts          (129 LOC)
/api/approvals/route.ts      (110 LOC)
/api/notifications/route.ts  (94 LOC)
/api/audit-logs/route.ts     (...)

AFTER:
/api/[entity]/route.ts       (40 LOC, generic)
/lib/api/crud-handler.ts     (200 LOC, reusable core)
/lib/api/auth-guard.ts       (30 LOC, auth + role check)
```

**Implementasi**:
- `crud-handler.ts` dengan `handleList()`, `handleCreate()`, `handleUpdate()`, `handleDelete()`
- Masing-masing membaca schema dari `registry.ts`, validasi fields, apply role-based filtering
- Tiap endpoint jadi thin wrapper: `export const GET = (req) => handleList(req, 'tasks')`
- Schema registry diperluas: tambah `apiFilters` (default eq by user_id, dll), `selectFields`

**LOC reduction**: ~700 LOC → ~250 LOC = **-450 LOC**

### Layer 2: Frontend Data Hooks (TanStack Query Wrappers)
**Target**: Eliminasi 80% data-fetch boilerplate.

```
BEFORE (in personal/tasks/page.tsx):
const { data, isLoading } = useQuery({
  queryKey: ['tasks', 'all', page, PAGE_SIZE, includeTemplate],
  queryFn: async () => {
    const res = await fetch(`/api/tasks?page=${page}&pageSize=${PAGE_SIZE}&sort=scheduled_date:desc`, ...)
    ...
  },
})

AFTER:
const { data, isLoading } = useEntityList('tasks', { page, pageSize, filters: { includeTemplate } })
```

**Implementasi**:
- `useEntityList(entity, options)` — paginated list with caching
- `useEntityOne(entity, id)` — single row
- `useEntityMutation(entity)` — create/update/delete dengan toast otomatis
- Pagination state internal (URL sync via nuqs atau localStorage)
- Optimistic updates built-in

**LOC reduction di 6 list pages**: ~480 LOC → ~150 LOC = **-330 LOC**

### Layer 3: Komposisi Komponen (Composition over Inheritance)
**Target**: Setiap komponen max 200 LOC, single-purpose.

```
BEFORE:
personal/tasks/page.tsx (434 LOC):
  - Hero section inline
  - InlineNewTaskForm inline
  - Search input inline
  - Tab filter inline
  - Task row rendering inline
  - DetailSheet state management inline

AFTER:
personal/tasks/page.tsx (~120 LOC):
  <PageContainer>
    <HeroSection ... />
    <InlineNewTaskForm entity="tasks" />
    <EntityListToolbar search+tabs />
    <EntityList entity="tasks" row={TaskRow} />
    <DetailSheet entity="tasks" />
  </PageContainer>
```

**Komponen baru**:
- `<PageContainer>` — consistent layout, breadcrumbs, hero slot
- `<EntityListToolbar>` — search + tabs + filters, konfigurable via schema
- `<EntityList>` — generic list renderer, accepts row component as prop
- `<EntityDetailSheet>` — wraps existing DetailSheet dengan entity-aware config

**LOC reduction**: 6 list pages × 100 LOC saved = **-600 LOC**

### Layer 4: Design System Token (CSS Variables)
**Target**: Konsistensi visual tanpa hard-code class.

**Sudah ada** (audit):
- `--color-brand-500`, `--color-verdigris-500`, `--color-surface-1`, dll
- `pill`, `card`, `card-body` classes

**Belum ada** (gap):
- Token untuk empty state illustration
- Token untuk toast severity (success/warning/error/info)
- Token untuk "data-testid" prefix standard

**Action**: Extend `globals.css` dengan semantic tokens, document di `docs/design-tokens.md`.

### Layer 5: Error Boundary + Standardized Error Response
**Target**: Consistent error handling, no raw SQL leak.

```
SEBELUM:
return NextResponse.json({ error: error.message }, { status: 500 })
→ Leaks "update or delete on table users violates foreign key"

SESUDAH:
return apiError('CANNOT_DELETE', 'Tidak dapat menghapus user', { cause: 'fk_violation', entity: 'users' })
→ Client receives { error: { code, message, severity, hint } }
```

**Implementation**:
- `lib/api/errors.ts` dengan error code registry
- Wrap all FK violations → 400 BAD_REQUEST (bukan 500)
- Wrap all auth failures → 401 UNAUTHORIZED (sudah OK)
- Wrap all RBAC failures → 403 FORBIDDEN (bukan 405 lagi)
- Client `apiError(code)` helper for typed error handling

### Layer 6: Observability (P0.5 — antara critical & nice-to-have)
**Target**: Quick debugging tanpa harus `console.log` di tiap file.

- Structured logging (`log.info()`, `log.error()`) — bukan `console.log`
- Request ID di setiap API call (untuk tracing)
- Performance metrics per endpoint
- Error tracking via existing audit_log table

### Layer 7: Documentation Inline (JSDoc → AI-friendly)
**Target**: Setiap file punya header comment yang menjelaskan intent + contract.

Pattern:
```ts
/**
 * @intent   List entities with pagination, filtering, role-based scope
 * @audience Owner (full), KK (own division), PIC (own division), Staff (own only)
 * @example  GET /api/tasks?page=2&pageSize=10&status=pending
 * @returns  { data: Task[], total: number, page: number, pageSize: number }
 */
```

---

## C. ROADMAP IMPLEMENTASI (5 Phases)

### Phase 1: Foundation (Week 1) — Backend
- [ ] `lib/api/auth-guard.ts` (30 LOC) — replaces 7-line auth boilerplate
- [ ] `lib/api/errors.ts` (60 LOC) — standardized error responses
- [ ] `lib/api/crud-handler.ts` (200 LOC) — generic list/create/update/delete
- [ ] Migrate 5 high-traffic routes to generic handler: tasks, approvals, notifications, audit-logs, comments
- [ ] Test: existing E2E tests + ad-hoc hermes-verify-

**Outcome**: 5 endpoints jadi 10 LOC each instead of 100. No breaking changes.

### Phase 2: Frontend Data Hooks (Week 2)
- [ ] `hooks/useEntityList.ts` (80 LOC)
- [ ] `hooks/useEntityMutation.ts` (60 LOC)
- [ ] `hooks/useEntityOne.ts` (40 LOC)
- [ ] Migrate personal/tasks page (434 → ~150 LOC)
- [ ] Migrate /owner page (411 → ~150 LOC)
- [ ] Test: Playwright suite still 4/4 pass

**Outcome**: 2 huge pages jadi manageable. State management konsisten.

### Phase 3: Component Library Extraction (Week 3)
- [ ] `<PageContainer>` (50 LOC) — wrap semua pages dengan hero slot
- [ ] `<EntityList>` (120 LOC) — generic list renderer
- [ ] `<EntityListToolbar>` (80 LOC) — search + tabs + filter
- [ ] `<EmptyStateWrapper>` (40 LOC) — auto-resolves Indonesian copy
- [ ] Migrate 4 remaining list pages: ReportsClient, KpiListClient, AuditLogClient, TeamClient
- [ ] Test: all list pages render correctly

**Outcome**: ~600 LOC saved across 6 pages.

### Phase 4: Error UX + Design Tokens (Week 4)
- [ ] Standardized error responses (FK violations → 400)
- [ ] Standardized error toasts (typed by error code)
- [ ] Design tokens audit (semantic naming)
- [ ] Empty state illustration system (avoid text-only)
- [ ] Test: error matrix coverage

**Outcome**: 500 → 400 untuk FK errors, consistent error UX.

### Phase 5: Polish + Documentation (Week 5)
- [ ] JSDoc on all public APIs
- [ ] `docs/architecture.md` — updated with new structure
- [ ] `docs/contributing.md` — how to add new entity
- [ ] E2E test suite expansion (entity CRUD per type)
- [ ] Performance regression check (page load times stable)

**Outcome**: Codebase documented, contributor-friendly.

---

## D. ESTIMATED OUTCOME

### Before (current)
- **340 TS files, 37,060 LOC**
- **142 pages, 17,239 LOC** (47%)
- **71 API routes, 4,880 LOC**
- Longest page: 434 LOC
- Longest API: 217 LOC
- Time to add new entity: ~3 hours (copy-paste-modify)
- Time to fix bug in pagination: must search 6+ files

### After (target, end of Phase 5)
- **~280 TS files (-18%)**
- **~12,000 LOC pages (-30%)**
- **~50 API routes (-30%, mostly auto-generated from schema)**
- Longest page: ~180 LOC (-58%)
- Longest API: ~120 LOC (-45%)
- Time to add new entity: **~30 minutes** (define schema → routes auto-generated)
- Time to fix pagination bug: 1 file (`crud-handler.ts`)
- LOC saved: **~1,800 LOC across all layers**

### Trade-offs (None = feature removal)
✓ All 9 QuickAdd entities still work
✓ All 12 user roles still have correct access
✓ All audit logging still active
✓ All toast feedback still fires
✓ All AI endpoints still functional
✓ All RBAC still enforced
✓ All empty states still Indonesian
✓ All keyboard shortcuts still active

---

## E. RISK MITIGATION

| Risk | Mitigation |
|---|---|
| Generic handler breaks existing routes | Migrate 1 route at a time, keep old route as fallback during dual-write phase |
| Frontend hook abstraction too aggressive | Start with 1 page, validate, then expand |
| Design system changes break visuals | Snapshot test 5 key pages before/after via Playwright |
| Documentation drift | Generate JSDoc from TypeScript types where possible |
| Breaking change to error response shape | Keep both old & new error shape during 1 release; client-side adapter |

---

## F. SUCCESS METRICS

### Quantitative
- [ ] LOC reduction: **>1,500 LOC saved** (-25% from current)
- [ ] Longest file: **<200 LOC** (currently 434)
- [ ] New entity time: **<30 min** (currently 3 hours)
- [ ] Build time: **<90s** (currently 2-3 min)
- [ ] Page load: **<600ms P95** (currently 850ms max)
- [ ] API response: **<300ms P95** (currently 400ms max)

### Qualitative
- [ ] New contributor can add entity in <30 min without reading all docs
- [ ] Bug fixes don't require touching 5+ files for "same concept"
- [ ] Code review feedback drops to "minor" comments (vs "this is too complex")
- [ ] AI-assisted development speed increases (less boilerplate to write)

---

## G. QUICK WIN (Can do in 1 hour)

If cuma mau **satu aksi simplifikasi** yang impact-nya paling gede:

**Migrasi `lib/api/generic-crud.ts` jadi full handler untuk 5 endpoint**:
- tasks, approvals, notifications, audit-logs, comments
- Delete 5 route.ts files (~600 LOC)
- Replace dengan single 30-LOC wrapper per route
- **Net: -450 LOC, no functionality loss**

Saya bisa eksekusi ini sekarang sebagai proof-of-concept. Mau lanjut?

---

## H. NEXT STEPS

1. **Approve masterplan** ini sebagai framework
2. **Pilih Phase 1** (backend foundation) untuk eksekusi pertama
3. **Run Phase 1** dengan dual-write safety (routes lama masih jalan sampai verified)
4. **Iterate per page** dengan Playwright regression

Estimated timeline: 5 weeks untuk semua 5 phases, atau 1 week untuk Phase 1 + Phase 2 (highest impact).
