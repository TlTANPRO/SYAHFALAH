# Plan — Direct Data Update + Edit di Dashboard

> Date: 2026-08-10
> Status: INVENTORY + GAPS
> Method: 5-kategori adversarial audit against existing v8 infrastructure

## Honest Baseline — Yang Sudah Ada (v8 Inline CRUD)

### UI Primitives (10 components)
- `Dialog`, `Sheet`, `Popover`, `Combobox`, `DatePicker`
- `InlineEdit` (click-to-edit on title/text/select/number/date)
- `FieldForm` (auto-form dari FieldSchema, lazy-loads FK options)
- `DetailSheet` (right panel composite + Tabs + read-only mode)
- `QuickAddDialog` (Cmd+Shift+K)

### Schema Registry
- `src/lib/schema/registry.ts` — 11 entities: tasks, leads, projects, sow_tasks,
  comments, users, kpi_targets, documents, attendance_logs, leave_requests,
  approvals
- Each entity: FieldSchema[] + tabs (e.g. leads: Overview / Pipeline / Assignment)

### Generic CRUD API (16 routes)
- POST/GET: /api/{tasks,leads,sow_tasks,projects,...}/route.ts
- PATCH/DELETE: /api/{tasks,sow_tasks,attendance,documents,comments,...}/[id]/route.ts
- Factory: `makePatchHandler / makeDeleteHandler / makePostHandler`
  - Field whitelisting (no mass-assign)
  - JWT verification via cookies
  - Service role key (RLS bypassed)
  - Standard error envelope

### Live Sync (Realtime)
- `useLiveTable` hook (TanStack Query + Supabase Realtime)
- `RealtimeProvider` v2 with 12 subscriptions (added approvals, audit_logs, documents, sow_tasks)
- 20 tables in `supabase_realtime` publication
- Conflict resolution: last-write-wins default

### Quick-Add (Cmd+Shift+K)
- T = Task, L = Lead, P = Project, S = SOW Task, C = Comment, D = Document

### Already Wired (1 page only)
- `personal/tasks/page.tsx` — InlineEdit on title + DetailSheet with 3 tabs

## Audit: 5-Kategori Adversarial

### 1. Wrong Assumptions
❌ "Semua page perlu InlineEdit" → SALAH. InlineEdit optimal untuk
   single-field mutation (title, status, assignee). Heavy multi-field CRUD
   lebih cocok dengan DetailSheet "Edit mode".
❌ "DetailSheet cukup read-only" → SALAH. User butuh Mode Edit yang
   sama seamlessnya. Currently DetailSheet hanya menampilkan data.

### 2. Missing Data
❌ Edit mode di DetailSheet belum ada (read-only only)
❌ Optimistic UI: ada di use-toggle-mutation tapi belum ada di InlineEdit/FieldForm
❌ Undo/Redo: tidak ada
❌ Audit trail: ada `api_gateway_log` tapi user-facing audit log belum terekspos
❌ Bulk edit: tidak ada (hanya bulk delete di beberapa page)
❌ Field-level permissions: tidak ada (semua field editable by semua role)

### 3. Schema Conflicts
❌ Schema registry hanya 11 entities. Reality: 51 tables di DB. Sisanya
   (purchasing orders, maintenance tickets, leave, rewards, dsb.) belum punya
   FieldSchema. Saat ini belum ada generic "unknown table" UI.
❌ Multi-table relationships (e.g. project → tasks → comments) belum di-handle
   di DetailSheet sebagai nested CRUD.
❌ Soft-delete vs hard-delete: ada di beberapa route, tidak di semua.

### 4. UX Traps
❌ Save tanpa loading state di InlineEdit (race condition jika user double-click)
❌ Conflict saat 2 user edit bareng — belum ada realtime presence indicator
❌ Form validation errors tidak visible jelas (InlineEdit pakai default)
❌ Mobile: InlineEdit pakai Popover yang kecil di layar sempit
❌ Cmd+Shift+K shortcut conflict dengan browser shortcut Cmd+Shift+K
   (Firefox private browsing, Chrome clear cache)
❌ Accessibility: InlineEdit belum punya aria-live region untuk perubahan

### 5. Environment
✓ Vercel Hobby 30s max OK (semua CRUD di single request)
✓ TanStack Query optimistic + rollback ready
✓ Realtime publication 20 tables
✓ Service role key configured
✓ Cloudflare WAF workaround documented

## Plan: 6 Fase

### Fase 1 — Wire InlineEdit ke 5 page prioritas (TICKET = 4-6 jam)
**Target**: Lead, Project, SOW Task, Document, User Management

Pattern copy dari `personal/tasks`:
1. Tambah `<InlineEdit>` di kolom title/name di table/list
2. Tambah `<DetailSheet>` di row click
3. Tambah `<QuickAdd>` button di header
4. Verifikasi save + realtime broadcast

Pages:
- `/owner/marketing` (leads)
- `/owner/projects` (projects)
- `/personal/sow` (sow_tasks)
- `/documents` (documents)
- `/admin/users` (users — Pak Ardian only)

### Fase 2 — Edit Mode di DetailSheet (TICKET = 8-12 jam)
**Goal**: Click "Edit" di DetailSheet → masuk mode edit dengan FieldForm
yang pre-populated, Save = PATCH via generic-crud, Cancel = reset.

Refactor: `DetailSheet` menerima optional `editable` + `schemaEntity` props.
Saat `editable=true` dan user klik Edit:
- Switch dari read-only ke FieldForm
- FieldForm baca FieldSchema dari registry, populate dari existing row
- Save → optimistic update → PATCH /api/{entity}/[id]
- Realtime broadcast → other users see update

### Fase 3 — Field-level Permissions (TICKET = 4-6 jam)
**Goal**: Tiap field punya `permissions: { owner: rw, kepala_kantor: ro, ... }`
- Schema registry: tambah `permissions?: Record<role, 'r' | 'rw'>`
- InlineEdit/FieldForm: hide/disable field sesuai role user
- Server-side: PATCH handler validate field-level access

### Fase 4 — Audit Trail UI (TICKET = 3-4 jam)
**Goal**: Tiap edit → tulis ke `audit_logs` table dengan before/after JSON
- New table atau reuse `audit_logs` yang sudah ada?
- Schema: id, table_name, row_id, user_id, action (INSERT/UPDATE/DELETE),
  before (jsonb), after (jsonb), created_at
- UI: di DetailSheet tab "Riwayat" tampilkan timeline perubahan

### Fase 5 — Bulk Edit (TICKET = 6-8 jam)
**Goal**: Select multiple rows → "Edit together" → apply changes
- New `BulkActionBar` component (similar to existing `BulkActionBar` di leads)
- Field selection: hanya field yang relevan lintas rows (status, assignee, due_date)
- "Apply to N selected" → PATCH batched → optimistic UI

### Fase 6 — Mobile Polish + A11y (TICKET = 4-6 jam)
**Goal**: InlineEdit works smoothly on mobile, accessible to screen readers
- Popover → bottom sheet on mobile (< 640px viewport)
- aria-live region di InlineEdit (announce "Title updated to XYZ")
- Keyboard navigation (Tab + Enter to edit, Esc to cancel)
- Loading state saat save (prevent double-submit)

## Prioritas (Tier System)

| Tier | Scope | Effort | Value |
|---|---|---|---|
| **T1 (critical)** | Fase 1: wire ke 5 page | 4-6 jam | Tinggi — visible everywhere |
| **T2 (high)** | Fase 2: DetailSheet Edit mode | 8-12 jam | Tinggi — single source of truth |
| **T3 (medium)** | Fase 3 + 4: permissions + audit | 7-10 jam | Medium — compliance/security |
| **T4 (polish)** | Fase 5 + 6: bulk + mobile | 10-14 jam | Medium — UX niceties |

## Honest Scope Estimate

- **T1 only**: 1 hari kerja (4-6 jam)
- **T1 + T2**: 2-3 hari kerja (12-18 jam)
- **All tiers**: 1 minggu+ (30-50 jam)

## Risiko

1. **Edit conflict**: 2 user edit bareng. Mitigasi: last-write-wins + audit log
2. **Field-level permission complexity**: easy to break RLS pattern. Mitigasi: test in dev dengan multiple role accounts
3. **Audit log table size**: bisa grow cepat. Mitigasi: retention policy (90 days)
4. **Bulk edit UX**: banyak edge case (mixed entity types). Mitigasi: hanya enable untuk entity type tertentu

## Rekomendasi Immediate Action

**Mulai dengan T1 (Fase 1)**: Wire InlineEdit ke 5 page. Quick wins,
visible everywhere, foundation untuk T2-T6.

Setelah T1 selesai, baru diskusi prioritas T2-T6.
