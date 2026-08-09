// lib/api/generic-crud.ts
// Helper to create PATCH/DELETE routes for arbitrary tables with whitelist.
// Returns NextResponse objects — wraps auth, error handling, JSON.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'

export interface CrudConfig {
  /** DB table name */
  table: string
  /** Whitelist of fields allowed for PATCH */
  allowedFields: readonly string[]
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

      const filtered: Record<string, unknown> = {}
      for (const key of cfg.allowedFields) {
        if (key in body) filtered[key] = body[key]
      }

      if (Object.keys(filtered).length === 0) {
        return NextResponse.json({ error: 'no valid fields to update' }, { status: 400 })
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
      const filtered: Record<string, unknown> = {}
      for (const key of cfg.allowedFields) {
        if (key in body) filtered[key] = body[key]
      }

      if (Object.keys(filtered).length === 0) {
        return NextResponse.json({ error: 'no valid fields' }, { status: 400 })
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
      return NextResponse.json({ data }, { status: 201 })
    } catch (err: any) {
      return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
    }
  }
}
