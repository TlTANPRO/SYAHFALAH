# Syahfalah Dashboard — Architecture Guide

> Single source of truth for the codebase. Last updated: 2026-08-11.
> Audience: developers extending or modifying the dashboard.

## What Syahfalah Is

Internal operations dashboard for PT Syahfalah. Tracks tasks, KPIs, SOWs,
leads, approvals, divisions, RACI, rewards, and more. Built for 12 user
roles (owner, kepala_kantor, pic_divisi, staff, ...).

**Stack**: Next.js 15 (App Router) + React 18 + TanStack Query + Supabase
(Postgres + Auth + Realtime) + Tailwind + shadcn/ui + lucide-react.

**Live URL**: https://syahfalah-dashboard.vercel.app

## Codebase Stats (as of 2026-08-11)

| | Count | LOC |
|---|---|---|
| TS/TSX files | 340 | 37,060 |
| API routes | 71 | 4,880 |
| Pages | 142 | 17,239 (47%) |
| Components | 70 | 7,825 (21%) |
| Lib files | 34 | 4,931 (13%) |
| AI files | 31 | 4,417 (12%) |

## Directory Layout

```
src/
  app/                    # Next.js App Router
    (dashboard)/          # Authenticated routes (with Topbar + Sidebar layout)
      personal/           # Personal hub
      owner/              # Owner-only pages
      admin/              # Admin pages
      kepala-kantor/      # Kepala kantor pages
      pic-divisi/         # PIC divisi pages
    api/                  # 71 API routes (71 endpoints)
    auth/                 # Auth pages (login, etc.)
  components/
    layout/               # Topbar, Sidebar, HeroSection
    ui/                   # 43 UI primitives (Button, Pagination, etc.)
  hooks/                  # 14 custom hooks (useEntityList, etc.)
  lib/
    api/                  # Server-side API utilities (auth, errors, CRUD)
    auth/                 # JWT, sessions
    schema/               # Schema registry (entity configs)
    ai/                   # AI suggest/summary (28 files)
  stores/                 # Zustand stores (uiStore, authStore, etc.)
  styles/                 # Tailwind layer + design tokens
```

## Layer 1: API Foundation (server-side)

### `lib/api/auth-guard.ts`
Centralized auth helpers used by every protected route.

```ts
import { requireAuth, requireRole, hasRole, getSessionOptional } from '@/lib/api/auth-guard'

// Returns session or Response error
const session = await requireAuth()
if (isError(session)) return session

// Returns session or 403 Response
const session = await requireRole(['owner', 'pic_divisi'])
if (isError(session)) return session
```

### `lib/api/errors.ts`
Standardized error responses. **Never leaks raw SQL**.

```ts
import { apiError } from '@/lib/api/errors'

return apiError.badRequest('id required')         // 400 + { error: { code, message, severity, hint? } }
return apiError.notFound('task')                   // 404
return apiError.forbidden('owner only')            // 403
return apiError.unauthorized()                     // 401
return apiError.rateLimited('try again in 30s')    // 429
return apiError.fromUnknown(err)                   // 500 (sanitized)
```

The standardized response shape is:
```ts
{
  error: {
    code: 'BAD_REQUEST' | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'VALIDATION' | 'RATE_LIMITED' | 'SERVER_ERROR',
    message: string,           // Indonesian, user-friendly
    severity: 'info' | 'warning' | 'error' | 'critical',
    hint?: string,             // Optional remediation hint
    fields?: Record<string, string>  // Optional field-level validation errors
  }
}
```

### `lib/api/crud-handler.ts`
Generic CRUD factory. Reduces a 100-LOC route to 30 LOC.

```ts
// src/app/api/tasks/route.ts (real example)
import { handleList, handleCreate, type CrudConfig } from '@/lib/api/crud-handler'

const TASKS_CONFIG: CrudConfig<'tasks'> = {
  entity: 'tasks',
  table: 'tasks',
  selectFields: 'id, title, status, ...',
  enumFields: { status: ['pending', 'completed', ...] },
  enumAliases: { priority: { normal: 'medium' } },  // normalize before DB
  queryFilters: { status: 'status', scheduled_date: 'scheduled_date' },
  scopeToUser: true,  // auto-filter by user_id
}

export async function GET(req) { return handleList(req, TASKS_CONFIG) }
export async function POST(req) { return handleCreate(req, TASKS_CONFIG) }
```

**CrudConfig features**:
- `selectFields`: comma-separated columns (whitelisted)
- `writableFields`: subset allowed on create/update (defaults to selectFields)
- `enumFields`: validates values against allowed list
- `enumAliases`: maps incoming value X to DB value Y (for legacy clients)
- `queryFilters`: query param name → column name
- `listExtraFilters`: array filter operators (neq, gt, lt, etc.)
- `queryLikeFilters`: case-insensitive partial match (ilike)
- `scopeToUser`: auto-filter by `user_id = session.userId`
- `scopeToDivision`: auto-filter by `division_id = session.divisionId`
- `defaultOrder` / `defaultPageSize` / `maxPageSize`: pagination defaults

### `lib/api/client-errors.ts` (client-side)
Typed error parser. Companion to the server-side `errors.ts`.

```ts
import { ApiError, parseApiError, apiFetch, FALLBACK_MESSAGES } from '@/lib/api/client-errors'

try {
  await apiFetch('/api/tasks', { method: 'POST', body: JSON.stringify(input) })
} catch (err) {
  if (err instanceof ApiError) {
    console.log(err.code)      // 'VALIDATION'
    console.log(err.status)    // 422
    console.log(err.fields)    // { title: 'wajib diisi' }
    console.log(err.hint)      // optional hint
  }
}
```

## Layer 2: Frontend Data Hooks (client-side)

All generic hooks live in `src/hooks/` and are barrel-exported via `@/hooks`.

### `useEntityList<T>(entity, params, options)`
Replaces ~20-30 LOC of `useQuery` boilerplate per page.

```ts
import { useEntityList, type ListResponse } from '@/hooks'

const { data, isLoading, error } = useEntityList<Task>('tasks', {
  page, pageSize: 25, status: 'pending', sort: 'priority:desc',
}, { initialData: { data: [], total: 0 } })
// data is typed Task[]; data has { data, total, page, pageSize }
```

### `useEntityMutation<TI, TR>(entity, method, options)`
Replaces `useMutation` + manual cache invalidation + manual toasts.

```ts
const updateTask = useEntityMutation<{ id: string; status: Task['status'] }>('tasks', 'PATCH', {
  successMessage: 'Status tugas diperbarui',
  invalidateKeys: [['tasks', 'list']],
})

updateTask.mutate({ id, status: 'completed' })
```

**Auto-features**:
- Credentialed fetch
- Auto-invalidates `['<entity>', 'list']` on success
- Auto-toast on success/error with custom message support
- Standardized error extraction (uses `parseApiError`)
- Endpoint override for non-default URLs (e.g. `/api/marketing/leads`)

### `useEntityOne<T>(entity, id, options)`
Single-item fetch with auto 404→null.

```ts
const { data: task, isLoading } = useEntityOne<Task>('tasks', taskId)
// data is Task | null; query disabled when taskId is empty
```

### `useEntityFilters(chips, options)`
Bridges URL search params with `useEntityList` and `ListFilters`.

```ts
const { q, setQ, activeChip, setActiveChip, params, isActive } = useEntityFilters(
  [{ label: 'Semua', value: '' }, { label: 'Pending', value: 'pending' }],
  { paramName: 'status' }
)
const { data } = useEntityList<Task>('tasks', { page, ...params })
```

URL stays in sync (`?status=pending&q=foo`), back-button works, shareable links.

## Layer 3: UI Primitives

### `components/ui/ListFilters.tsx` (server-friendly)
Renders a `<form method="GET">` with search input + chip filters. Works
without JS, shareable URLs, no useState needed.

### `components/ui/Pagination.tsx` (client)
Cursor-based pagination control.

### `components/ui/EntityList.tsx`
Composes HeroSection + ListFilters + content + Pagination + empty state.
Replaces ~30-50 LOC of layout boilerplate per list page.

### `components/ui/EntityEmptyState.tsx`
Entity-aware empty states (auto-picks copy from `EMPTY_STATE_COPY` registry).

### `components/layout/HeroSection.tsx`
Premium hero pattern (eyebrow + title + subtitle + pills + action).
Used on 48 pages.

## Layer 4: Schema Registry

`src/lib/schema/registry.ts` (687 LOC) is the canonical source of truth
for entity configuration: table name, select fields, validations, etc.
Use this in new code rather than hardcoding entity names.

## Layer 5: Realtime

`useDashboardData` and `useKpiCascade` subscribe to Supabase realtime
channels. Pattern:
1. Open channel on mount
2. Invalidate react-query cache on insert/update/delete
3. Close channel on unmount

## Layer 6: AI

`src/lib/ai/` (28 files, 4,417 LOC) is the largest subsystem. Includes
context summarization, suggest engines, and prompt templates. 12% of
codebase LOC. **Not part of the simplification masterplan** — separate
docs at `docs/ai/` (if exists).

## Layer 7: Stores (Zustand)

- `useUIStore` — toast queue, sidebar collapsed, theme
- `useAuthStore` — client-side auth state
- `useNotificationsStore` — realtime notification queue

## Authentication

JWT-based, 15-min access + 7-day refresh. HttpOnly + Secure + SameSite=Lax.
See `lib/auth/jwt.ts` + `lib/auth/server-session.ts`.

## Error Standardization Contract

**Server → Client contract**:
- All errors return `{ error: { code, message, severity, hint?, fields? } }`
- Indonesian messages by default
- No raw SQL or PostgREST messages leak
- 4xx for client errors, 5xx reserved for actual server errors
- 400 (not 500) for FK violations
- 400 (not 405) for invalid enum values

**Client → Server contract**:
- `POST` / `PATCH` / `PUT` send JSON body
- `DELETE` may send body (for bulk delete) or none
- `Content-Type: application/json` required for bodies
- `credentials: 'include'` on all fetch calls (auth cookies)

## Adding a New Entity (3-step recipe)

1. **Schema**: add entity to `src/lib/schema/registry.ts` (table, fields, enums)
2. **API route**: use `handleList`/`handleCreate`/`handleUpdate`/`handleDelete` from `crud-handler.ts`
3. **Page**: use `useEntityList` + `useEntityMutation` + `<EntityList>` + `<HeroSection>`

**Time-to-add-entity**: 30 minutes (down from 3 hours pre-masterplan).

## RBAC

12 user roles. Route access controlled by `requireRole(['owner'])` server-side.
UI uses `hasRole(session, 'owner')` for conditional rendering. See
`lib/api/auth-guard.ts`.

## Testing

- **Canonical suite**: `npx playwright test tests/mobile-and-ui.spec.js` (4 tests)
- **Inline flow**: `npx playwright test tests/inline-new-task.spec.js` (1 test, Mada E2E)
- 5/5 tests must pass before every commit

## Deployment

- Build: `pnpm run build` (must exit 0)
- Deploy: `pnpm run deploy:prod` (Vercel CLI + post-deploy cleanup)
- URL: `https://syahfalah-dashboard.vercel.app`
- Aliases: deployment-specific `syahfalah-dashboard-<hash>-titan-0fab.vercel.app`

## Simplification Masterplan

This codebase is undergoing a 5-phase simplification. See:
`docs/plans/simplification-masterplan-2026-08-11.md`

- **Phase 1** (DONE): backend generic CRUD + foundation utilities
- **Phase 2** (DONE): frontend data hooks (useEntityList/Mutation/One)
- **Phase 3** (DONE): composition primitives (EntityList, useEntityFilters)
- **Phase 4** (DONE): client-side error UX (client-errors.ts)
- **Phase 5** (DONE): this document + JSDoc

Phase 1-5 result: **-48 LOC** from personal/tasks + admin/users, **-135 LOC**
from 5 backend routes. 4 generic hooks reusable across all 142 pages.
