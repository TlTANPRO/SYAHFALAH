// lib/api/crud-handler.ts
// Generic CRUD handlers for entity tables.
// Drastically reduces boilerplate in /api/[entity]/route.ts files.
//
// Usage in a route file:
//
//   // app/api/tasks/route.ts
//   import { handleList, handleCreate } from '@/lib/api/crud-handler'
//   import { requireAuth } from '@/lib/api/auth-guard'
//   import type { CrudConfig } from '@/lib/api/crud-handler'
//
//   const config: CrudConfig<'tasks'> = {
//     entity: 'tasks',
//     table: 'tasks',
//     selectFields: 'id, title, status, priority, ...',
//     defaultOrder: { column: 'priority', ascending: false },
//     scopeToUser: true,  // auto-filter by user_id = session.userId
//     defaultPageSize: 50,
//     maxPageSize: 200,
//     // Optional: onlyOwner, additional filters, etc.
//   }
//
//   export const GET = (req: NextRequest) => handleList(req, config)
//   export const POST = (req: NextRequest) => handleCreate(req, config)
//
// Each handler handles:
//   - Auth check (returns 401 if no session)
//   - Pagination parsing (page, pageSize, limit - all accepted for compat)
//   - Scope to user (if configured)
//   - FK violation → 400 (not 500)
//   - Standardized error response shape
//
// All routes still need [id]/route.ts for PATCH/DELETE - see handleUpdate/handleDelete.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidateTag, revalidatePath } from 'next/cache'
import { requireAuth, isError, type Session } from '@/lib/api/auth-guard'
import { apiError, buildError, wrapDbError } from '@/lib/api/errors'

// OPT #2: Tag-based cache invalidation.
// When any entity is mutated, invalidate relevant dashboard caches so the next
// page render shows fresh data (instead of waiting up to 60s for stale cache).
// Tags follow the convention 'morning-brief' (60s TTL) and 'dashboard' (30s TTL).
const ENTITY_TAGS: Record<string, ReadonlyArray<string>> = {
  tasks: ['morning-brief'],
  leads: ['morning-brief'],
  consumer_cases: ['morning-brief'],
  projects: ['dashboard'],
  kpis: ['dashboard'],
  clusters: ['dashboard'],
  divisions: ['dashboard'],
}

function invalidateCachesFor(entity: string) {
  const tags = ENTITY_TAGS[entity] ?? ['morning-brief', 'dashboard']
  for (const tag of tags) {
    try { revalidateTag(tag) } catch { /* revalidateTag throws in some contexts */ }
  }
  // OPT #7: Also revalidate /owner path explicitly so the ISR cache (60s)
  // bypasses on next request. This gives mutation → fresh UI in <500ms.
  try { revalidatePath('/owner') } catch { /* revalidatePath throws in some contexts */ }
}

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface CrudConfig<T extends string = string> {
  /** Entity name (e.g. 'tasks', 'approvals') */
  entity: T
  /** DB table name (usually same as entity) */
  table: string
  /** Comma-separated fields to select. */
  selectFields: string
  /** Default order. */
  defaultOrder?: { column: string; ascending: boolean }
  /** If true, auto-filter by user_id = session.userId (staff pattern) */
  scopeToUser?: boolean
  /** If set, auto-filter by division_id = session.divisionId */
  scopeToDivision?: boolean
  /** Default page size when not specified */
  defaultPageSize?: number
  /** Max page size allowed */
  maxPageSize?: number
  /**
   * Fields the user is allowed to write (create/update).
   * Other fields in the body are silently stripped.
   * Default: any field that's in selectFields.
   */
  writableFields?: readonly string[]
  /** Required fields on create */
  requiredCreateFields?: readonly string[]
  /** Enum validation (e.g. { status: ['pending','done'], priority: ['low','high'] }) */
  enumFields?: Record<string, readonly string[]>
  /** Value aliases: accept incoming value X, persist as Y (e.g. { priority: { normal: 'medium', urgent: 'critical' } }) */
  enumAliases?: Record<string, Record<string, string>>
  /** Default values applied on create if field is missing */
  defaults?: Record<string, unknown>
  /** Extra filters applied to list queries */
  listFilters?: Record<string, unknown>
  /** Extra filters that can be overridden via query params (key = query name, value = column) */
  queryFilters?: Record<string, string>
  /** Like filters (case-insensitive partial match). Key = query name, value = column */
  queryLikeFilters?: Record<string, string>
  /** Extra filter to always apply (key = column, value = value) - used for `.neq`, `.gt`, etc. */
  listExtraFilters?: Array<{ column: string; op: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte'; value: unknown }>
}

interface ParsedPagination {
  page: number
  pageSize: number
}

// ----------------------------------------------------------------------------
// Supabase service client (service_role key bypasses RLS)
// ----------------------------------------------------------------------------

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// ----------------------------------------------------------------------------
// List (GET)
// ----------------------------------------------------------------------------

export async function handleList<T extends string>(
  req: NextRequest,
  config: CrudConfig<T>
): Promise<NextResponse> {
  const session = await requireAuth()
  if (isError(session)) return session

  const url = req.nextUrl
  const { page, pageSize } = parsePagination(url.searchParams, config)
  const offset = (page - 1) * pageSize

  try {
    const sb = getServiceClient()
    let query = sb
      .from(config.table)
      .select(config.selectFields, { count: 'exact' })

    // Apply scope
    if (config.scopeToUser && session.userId) {
      query = query.eq('user_id', session.userId)
    }
    if (config.scopeToDivision && session.divisionId) {
      query = query.eq('division_id', session.divisionId)
    }

    // Apply extra filters
    for (const [col, val] of Object.entries(config.listFilters ?? {})) {
      query = query.eq(col, val)
    }

    // Apply query-param filters
    for (const [queryName, column] of Object.entries(config.queryFilters ?? {})) {
      const v = url.searchParams.get(queryName)
      if (v !== null && v !== '') query = query.eq(column, v)
    }

    // Apply query-param like filters (case-insensitive partial match)
    for (const [queryName, column] of Object.entries(config.queryLikeFilters ?? {})) {
      const v = url.searchParams.get(queryName)
      if (v !== null && v !== '') query = query.ilike(column, `%${v}%`)
    }

    // Apply extra filters (always-on neq, gt, etc.)
    for (const f of config.listExtraFilters ?? []) {
      // @ts-expect-error - dynamic method name
      query = query[f.op](f.column, f.value)
    }

    // Order + pagination
    if (config.defaultOrder) {
      query = query
        .order(config.defaultOrder.column, { ascending: config.defaultOrder.ascending })
        .range(offset, offset + pageSize - 1)
    } else {
      query = query.range(offset, offset + pageSize - 1)
    }

    const { data, error, count } = await query
    if (error) {
      // FK violations / check violations are user input errors, not server errors
      if (isClientError(error.message)) {
        return buildError('BAD_REQUEST', error.message)
      }
      return wrapDbError(error)
    }
    return NextResponse.json({
      data: data ?? [],
      total: count ?? 0,
      page,
      pageSize,
    })
  } catch (e) {
    return wrapDbError(e)
  }
}

// ----------------------------------------------------------------------------
// Create (POST)
// ----------------------------------------------------------------------------

export async function handleCreate<T extends string>(
  req: NextRequest,
  config: CrudConfig<T>
): Promise<NextResponse> {
  const session = await requireAuth()
  if (isError(session)) return session

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    return apiError.invalidPayload('Body harus JSON')
  }
  if (!body || typeof body !== 'object') {
    return apiError.invalidPayload()
  }

  // Required fields check
  for (const f of config.requiredCreateFields ?? []) {
    if (body[f] === undefined || body[f] === null || body[f] === '') {
      return apiError.badRequest(`${f} wajib diisi`)
    }
  }

  // Whitelist writable fields
  const allowed = new Set(config.writableFields ?? config.selectFields.split(',').map((s) => s.trim()))
  const insert: Record<string, unknown> = {}
  for (const k of Array.from(allowed)) {
    if (body[k] !== undefined) insert[k] = body[k]
  }

  // Apply defaults
  for (const [k, v] of Object.entries(config.defaults ?? {})) {
    if (insert[k] === undefined) insert[k] = v
  }

  // Enum validation + value aliasing
  for (const [field, allowedValues] of Object.entries(config.enumFields ?? {})) {
    if (insert[field] !== undefined) {
      const v = insert[field] as string
      const aliases = config.enumAliases?.[field] ?? {}
      // Alias incoming value if mapped, e.g. 'normal' -> 'medium'
      if (aliases[v] !== undefined) {
        insert[field] = aliases[v]
      } else if (!allowedValues.includes(v)) {
        return apiError.badRequest(`${field} harus salah satu dari: ${allowedValues.join(', ')}`)
      }
    }
  }

  // Scope-to-user: auto-set user_id if scopeToUser is configured and not provided
  if (config.scopeToUser && !insert.user_id) {
    insert.user_id = session.userId
  }
  if (config.scopeToDivision && !insert.division_id && session.divisionId) {
    insert.division_id = session.divisionId
  }

  try {
    const sb = getServiceClient()
    const { data, error } = await sb
      .from(config.table)
      .insert(insert)
      .select(config.selectFields)
      .single()
    if (error) {
      if (isClientError(error.message)) {
        return buildError('BAD_REQUEST', error.message)
      }
      return wrapDbError(error)
    }
    invalidateCachesFor(config.table)
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return wrapDbError(e)
  }
}

// ----------------------------------------------------------------------------
// Update (PATCH) — for [id]/route.ts
// ----------------------------------------------------------------------------

export async function handleUpdate<T extends string>(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
  config: CrudConfig<T>
): Promise<NextResponse> {
  const session = await requireAuth()
  if (isError(session)) return session

  const { id } = await ctx.params
  if (!id) return apiError.badRequest('id required')

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    return apiError.invalidPayload()
  }

  // Whitelist writable fields
  const allowed = new Set(config.writableFields ?? config.selectFields.split(',').map((s) => s.trim()))
  const updates: Record<string, unknown> = {}
  for (const k of Array.from(allowed)) {
    if (body[k] !== undefined) updates[k] = body[k]
  }
  if (Object.keys(updates).length === 0) {
    return apiError.badRequest('no fields to update')
  }

  // Enum validation
  for (const [field, allowedValues] of Object.entries(config.enumFields ?? {})) {
    if (updates[field] !== undefined && !allowedValues.includes(updates[field] as string)) {
      return apiError.badRequest(`${field} harus salah satu dari: ${allowedValues.join(', ')}`)
    }
  }

  // Auto-touch updated_at
  updates.updated_at = new Date().toISOString()

  try {
    const sb = getServiceClient()
    let query = sb.from(config.table).update(updates).eq('id', id)
    if (config.scopeToUser && session.userId) {
      query = query.eq('user_id', session.userId)
    }
    const { data, error } = await query.select(config.selectFields).single()
    if (error) {
      if (error.code === 'PGRST116') {
        return apiError.notFound()
      }
      if (isClientError(error.message)) {
        return buildError('BAD_REQUEST', error.message)
      }
      return wrapDbError(error)
    }
    invalidateCachesFor(config.table)
    return NextResponse.json(data)
  } catch (e) {
    return wrapDbError(e)
  }
}

// ----------------------------------------------------------------------------
// Delete (DELETE) — for [id]/route.ts
// ----------------------------------------------------------------------------

export async function handleDelete<T extends string>(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
  config: CrudConfig<T>
): Promise<NextResponse> {
  const session = await requireAuth()
  if (isError(session)) return session

  const { id } = await ctx.params
  if (!id) return apiError.badRequest('id required')

  try {
    const sb = getServiceClient()
    let query = sb.from(config.table).delete().eq('id', id)
    if (config.scopeToUser && session.userId) {
      query = query.eq('user_id', session.userId)
    }
    const { error, count } = await query
    if (error) {
      // FK violation: friendly 400 instead of 500
      if (error.message.toLowerCase().includes('foreign key')) {
        return apiError.badRequest('Tidak dapat menghapus data yang masih direferensikan')
      }
      return wrapDbError(error)
    }
    if (count === 0) {
      return apiError.notFound()
    }
    invalidateCachesFor(config.table)
    return NextResponse.json({ ok: true, deleted: count })
  } catch (e) {
    return wrapDbError(e)
  }
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function parsePagination(
  params: URLSearchParams,
  config: CrudConfig
): ParsedPagination {
  const defaultPageSize = config.defaultPageSize ?? 25
  const maxPageSize = config.maxPageSize ?? 200
  const page = Math.max(1, Number(params.get('page')) || 1)
  // Accept pageSize, limit (compat), or fallback to default
  const rawSize =
    params.get('pageSize') ?? params.get('limit') ?? String(defaultPageSize)
  const pageSize = Math.min(Math.max(1, Number(rawSize) || defaultPageSize), maxPageSize)
  return { page, pageSize }
}

/**
 * Detect if a Supabase error message is a user-input error (4xx-worthy)
 * vs a server error (5xx). Wraps this check so route handlers stay clean.
 */
function isClientError(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('foreign key') ||
    m.includes('check constraint') ||
    m.includes('duplicate key') ||
    m.includes('unique constraint') ||
    m.includes('not-null constraint') ||
    m.includes('invalid input syntax') ||
    m.includes('invalid text representation')
  )
}
