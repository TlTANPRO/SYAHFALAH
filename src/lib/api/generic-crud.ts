// lib/api/generic-crud.ts
// Helper to create PATCH/DELETE routes for arbitrary tables with whitelist.
// Returns NextResponse objects — wraps auth, error handling, JSON.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'

/**
 * Filter incoming fields based on user's role + schema permissions.
 * Returns only fields the user is allowed to write.
 */
function filterFieldsByRole(
  schemaName: string,
  userRole: string,
  requested: Record<string, unknown>,
  fallbackWhitelist: readonly string[]
): Record<string, unknown> {
  const schema = getSchema(schemaName)
  const filtered: Record<string, unknown> = {}

  // If schema found, use field-level permissions
  if (schema) {
    for (const [key, value] of Object.entries(requested)) {
      // First check if field exists in schema
      const field = schema.fields.find((f) => f.name === key)
      if (!field) continue

      // Check role-based access
      const access = checkFieldAccess(field, userRole)
      if (access.writable) {
        filtered[key] = value
      }
    }
    return filtered
  }

  // Fallback: use static whitelist
  for (const key of fallbackWhitelist) {
    if (key in requested) filtered[key] = requested[key]
  }
  return filtered
}

import { getSchema, checkFieldAccess } from '@/lib/schema/registry'

/**
 * Log a CRUD action to api_audit_log (best-effort).
 * Failures silently dropped so audit never blocks the main operation.
 */
async function logAudit(
  sb: any, // generic Supabase client (type varies by table)
  userId: string,
  table: string,
  rowId: string,
  action: 'INSERT' | 'UPDATE' | 'DELETE',
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null
): Promise<void> {
  try {
    // api_audit_log is optional (table may not exist yet). Cast to any to
    // bypass strict table-name inference for not-yet-migrated table.
    await (sb.from('api_audit_log') as any).insert({
      user_id: userId,
      table_name: table,
      row_id: rowId,
      action,
      before: before ?? null,
      after: after ?? null,
    })
  } catch {
    // intentional no-op — table may not exist
  }
}



export interface CrudConfig {
  /** DB table name */
  table: string
  /** Whitelist of fields allowed for PATCH (fallback when no schema or no permission set) */
  allowedFields: readonly string[]
  /**
   * Optional: enable role-based field-level permissions from schema registry.
   * Defaults to true. When enabled, fields are filtered by:
   * 1. Field existence in schema
   * 2. User role permission (checkFieldAccess)
   * Falls back to allowedFields whitelist if schema not found.
   */
  useFieldPermissions?: boolean
  /**
   * Optional default values applied on POST when not provided by client.
   * Useful for NOT NULL DB columns that should auto-fill from server (e.g.
   * start_date, target_completion_date, code, author_id from session, etc.)
   */
  defaults?: (body: Record<string, unknown>, session: { userId: string; role: string }) => Record<string, unknown>
  /** P1-3: GET list support */
  selectFields?: string
  defaultOrder?: { column: string; ascending?: boolean }
  defaultPageSize?: number
  maxPageSize?: number
  searchFields?: readonly string[]
  queryFilters?: Record<string, string>
  enums?: Record<string, readonly string[]>
}

/**
 * Generic PATCH handler. Reads id from route params, body from request.
 * Whitelists fields, returns updated row or error.
 */
export function makePatchHandler(cfg: CrudConfig) {
  return async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    try {
      const cookieStore = await cookies()
      const accessToken = cookieStore.get('access_token')?.value
      if (!accessToken) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
      const payload = await verifyAccessToken(accessToken)
      if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })

      const { id } = await ctx.params
      const body = await req.json().catch(() => ({}))

      // Filter fields by role permissions
      const filtered = (cfg.useFieldPermissions ?? true)
        ? filterFieldsByRole(cfg.table, payload.role, body, cfg.allowedFields)
        : (() => {
            const f: Record<string, unknown> = {}
            for (const key of cfg.allowedFields) {
              if (key in body) f[key] = body[key]
            }
            return f
          })()

      if (Object.keys(filtered).length === 0) {
        return NextResponse.json({ 
          error: (cfg.useFieldPermissions ?? true) 
            ? 'tidak ada field yang boleh diubah untuk role ini' 
            : 'no valid fields to update' 
        }, { status: 400 })
      }

      const serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { data, error } = await serviceClient
        .from(cfg.table)
        .update(filtered)
        .eq('id', id)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      
      // Audit log — fire-and-forget
      await logAudit(serviceClient, payload.userId, cfg.table, id, 'UPDATE', null, data)
      
      return NextResponse.json({ data })
    } catch (err: any) {
      return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
    }
  }
}

/**
 * Generic DELETE handler. Soft-delete by default would be better but we
 * do hard-delete since RLS + business rules are upstream.
 */
export function makeDeleteHandler(cfg: CrudConfig) {
  return async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    try {
      const cookieStore = await cookies()
      const accessToken = cookieStore.get('access_token')?.value
      if (!accessToken) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
      const payload = await verifyAccessToken(accessToken)
      if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })

      const { id } = await ctx.params

      const serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { error } = await serviceClient.from(cfg.table).delete().eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      
      // Audit log
      await logAudit(serviceClient, payload.userId, cfg.table, id, 'DELETE', null, null)
      
      return NextResponse.json({ data: { id, deleted: true } })
    } catch (err: any) {
      return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
    }
  }
}

/**
 * Generic POST handler for "create new" rows. Whitelists fields.
 * Use when table doesn't already have a POST endpoint.
 */
export function makePostHandler(cfg: CrudConfig) {
  return async function POST(req: NextRequest) {
    try {
      const cookieStore = await cookies()
      const accessToken = cookieStore.get('access_token')?.value
      if (!accessToken) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
      const payload = await verifyAccessToken(accessToken)
      if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })

      const body = await req.json().catch(() => ({}))
      const filtered = (cfg.useFieldPermissions ?? true)
        ? filterFieldsByRole(cfg.table, payload.role, body, cfg.allowedFields)
        : (() => {
            const f: Record<string, unknown> = {}
            for (const key of cfg.allowedFields) {
              if (key in body) f[key] = body[key]
            }
            return f
          })()

      // Apply defaults. Two-tier:
      // 1. Filled values (set by defaults() if body field is empty) — fill in only.
      // 2. Override values (mapped values from invalid enum) — replace body value.
      if (cfg.defaults) {
        const session = { userId: payload.userId, role: payload.role, divisionId: payload.divisionId }
        const result = cfg.defaults(filtered, session) || {}
        const overrides = (result as any).__overrides || {}
        for (const [k, v] of Object.entries(result)) {
          if (k === '__overrides') continue
          if (filtered[k] === undefined || filtered[k] === null || filtered[k] === '') {
            filtered[k] = v
          }
        }
        // Apply overrides (e.g. invalid enum → valid enum)
        for (const [k, v] of Object.entries(overrides)) {
          filtered[k] = v
        }
      }

      if (Object.keys(filtered).length === 0) {
        return NextResponse.json({ 
          error: (cfg.useFieldPermissions ?? true) 
            ? 'tidak ada field yang boleh diisi untuk role ini' 
            : 'no valid fields' 
        }, { status: 400 })
      }

      const serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { data, error } = await serviceClient
        .from(cfg.table)
        .insert(filtered)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      
      // Audit log
      await logAudit(serviceClient, payload.userId, cfg.table, String(data?.id ?? ''), 'INSERT', null, data)
      
      return NextResponse.json({ data }, { status: 201 })
    } catch (err: any) {
      return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
    }
  }
}


// P1-3: Generic GET (list) handler.
// Mirrors crud-handler.handleList for the get-side of generic CRUD.
export function makeGetHandler(cfg: CrudConfig) {
  return async function GET(req: NextRequest) {
    try {
      const cookieStore = await cookies()
      const accessToken = cookieStore.get('access_token')?.value
      if (!accessToken) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
      const payload = await verifyAccessToken(accessToken)
      if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })

      const url = req.nextUrl
      const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
      const pageSize = Math.min(
        Math.max(1, Number(url.searchParams.get('pageSize')) || cfg.defaultPageSize || 50),
        cfg.maxPageSize || 200
      )
      const offset = (page - 1) * pageSize
      const orderColumn = url.searchParams.get('orderBy') || cfg.defaultOrder?.column || 'created_at'
      const ascending = (url.searchParams.get('ascending') ?? 'false') === 'true'

      const serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      let query = serviceClient
        .from(cfg.table)
        .select(cfg.selectFields || '*', { count: 'exact' })
        .order(orderColumn, { ascending })
        .range(offset, offset + pageSize - 1)

      // Search across filterFields
      const q = url.searchParams.get('q')?.trim()
      if (q && cfg.searchFields?.length) {
        const orClause = cfg.searchFields.map((f) => `${f}.ilike.%${q}%`).join(',')
        query = query.or(orClause)
      }

      // Apply queryFilters from URL params
      if (cfg.queryFilters) {
        for (const [param, column] of Object.entries(cfg.queryFilters)) {
          const v = url.searchParams.get(param)
          if (v != null) query = query.eq(column, v)
        }
      }

      const { data, error, count } = await query
      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          return NextResponse.json({ data: [], total: 0, page, pageSize })
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        data: data ?? [],
        total: count ?? 0,
        page,
        pageSize,
      })
    } catch (err: any) {
      return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
    }
  }
}
