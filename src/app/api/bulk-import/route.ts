// src/app/api/bulk-import/route.ts
// CSV / JSON bulk-import endpoint.
// POST { entity: 'leads'|'customers'|..., format: 'csv'|'json', data: string|array }
// Auth-gated; uses service role to bypass RLS for admin bulk imports.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { getSchema } from '@/lib/schema/registry'

// Whitelist of entities that support bulk import
const ALLOWED_ENTITIES = new Set([
  'leads', 'customers', 'projects', 'tasks', 'sow_tasks',
  'suppliers', 'materials', 'purchase_requests', 'purchase_orders',
  'attendance_logs', 'leave_requests', 'kpi_targets', 'comments',
])

// Default values / NOT NULL fillers per entity (server-side)
function buildDefaults(entity: string, session: { userId: string; role: string; divisionId?: string }): Record<string, unknown> {
  const now = new Date().toISOString().slice(0, 10)
  switch (entity) {
    case 'tasks':
      return { user_id: session.userId, status: 'pending', priority: 'medium', scheduled_date: now, type: 'ad_hoc' }
    case 'projects': {
      const start = new Date()
      const end = new Date(start.getTime() + 90 * 86400 * 1000)
      return {
        start_date: now,
        target_completion_date: end.toISOString().slice(0, 10),
        total_units: 0,
        units_completed: 0,
        status: 'planning',
      }
    }
    case 'sow_tasks':
      return {
        code: `SOW-${Date.now().toString(36).toUpperCase()}`,
        status: 'planned',
        priority: 'medium',
        division_id: session.divisionId || '1a2e6f06-8b25-4df1-880e-c56c96dd5708',
      }
    case 'attendance_logs':
      return { user_id: session.userId, log_date: now, status: 'present' }
    case 'leave_requests':
      return { user_id: session.userId, status: 'pending', type: 'annual' }
    case 'kpi_targets':
      return { unit: 'unit', period: 'monthly' }
    case 'comments':
      return { author_id: session.userId, reference_type: 'task', reference_id: '00000000-0000-0000-0000-000000000000' }
    case 'leads':
      return { source: 'walk_in', stage: 'new', code: `LEAD-${Date.now().toString(36).toUpperCase()}` }
    case 'purchase_requests':
      return { status: 'pending' }
    case 'purchase_orders':
      return { status: 'draft' }
    case 'maintenance_tickets':
      return { status: 'open' }
    default:
      return {}
  }
}

// Map invalid enum values to valid ones
function mapInvalidEnums(entity: string, row: Record<string, unknown>): Record<string, unknown> {
  const overrides: Record<string, unknown> = {}
  
  if (entity === 'tasks' || entity === 'sow_tasks') {
    const validPriority = ['low', 'medium', 'high', 'critical']
    if (row.priority && !validPriority.includes(String(row.priority))) {
      overrides.priority = 'medium'
    }
  }
  if (entity === 'tasks') {
    const validStatus = ['pending', 'in_progress', 'completed', 'overdue', 'cancelled']
    if (row.status && !validStatus.includes(String(row.status))) {
      overrides.status = 'pending'
    }
  }
  if (entity === 'sow_tasks') {
    const validStatus = ['planned', 'in_progress', 'completed', 'on_hold', 'cancelled']
    if (row.status && !validStatus.includes(String(row.status))) {
      overrides.status = 'planned'
    }
  }
  if (entity === 'leave_requests') {
    const validTypes = ['annual', 'sick', 'personal', 'maternity', 'paternity', 'unpaid']
    if (row.type && !validTypes.includes(String(row.type))) {
      overrides.type = 'annual'
    }
  }
  if (entity === 'documents') {
    const validVis = ['all', 'owner_only', 'kk_and_owner', 'pic_and_up']
    if (row.visibility && !validVis.includes(String(row.visibility))) {
      overrides.visibility = 'pic_and_up'
    }
  }
  
  return overrides
}

// CSV parser (minimal: handles quoted fields, no escaped quotes inside quoted)
function parseCSV(text: string): Array<Record<string, string>> {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length === 0) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map(line => {
    const fields = line.split(',').map(f => f.trim().replace(/^"|"$/g, ''))
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = fields[i] ?? '' })
    return row
  })
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value
    if (!accessToken) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const payload = await verifyAccessToken(accessToken)
    if (!payload) return NextResponse.json({ error: 'invalid session' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { entity, format = 'json', data } = body as { entity?: string; format?: 'csv' | 'json'; data?: string | unknown[] }
    
    if (!entity || !ALLOWED_ENTITIES.has(entity)) {
      return NextResponse.json({ error: `entity '${entity}' not supported. Allowed: ${[...ALLOWED_ENTITIES].join(', ')}` }, { status: 400 })
    }
    
    let rows: Array<Record<string, unknown>>
    if (format === 'csv') {
      if (typeof data !== 'string') return NextResponse.json({ error: 'CSV format requires data as string' }, { status: 400 })
      rows = parseCSV(data) as Array<Record<string, unknown>>
    } else {
      if (!Array.isArray(data)) return NextResponse.json({ error: 'JSON format requires data as array' }, { status: 400 })
      rows = data as Array<Record<string, unknown>>
    }
    
    if (rows.length === 0) {
      return NextResponse.json({ error: 'empty data array' }, { status: 400 })
    }
    if (rows.length > 500) {
      return NextResponse.json({ error: 'max 500 rows per import' }, { status: 400 })
    }
    
    const session = { userId: payload.userId, role: payload.role, divisionId: payload.divisionId }
    const defaults = buildDefaults(entity, session)
    
    // Apply defaults + enum overrides to each row
    const enrichedRows = rows.map(row => {
      const out: Record<string, unknown> = { ...defaults, ...row }
      const overrides = mapInvalidEnums(entity, out)
      return { ...out, ...overrides }
    })
    
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Insert in chunks of 100 to avoid payload limits
    const results = { inserted: 0, errors: [] as Array<{ row: number; error: string }> }
    for (let i = 0; i < enrichedRows.length; i += 100) {
      const chunk = enrichedRows.slice(i, i + 100)
      const { data: inserted, error } = await serviceClient
        .from(entity)
        .insert(chunk)
        .select('id')
      
      if (error) {
        results.errors.push({ row: i, error: error.message })
      } else if (inserted) {
        results.inserted += inserted.length
      }
    }
    
    return NextResponse.json({
      entity,
      total: enrichedRows.length,
      inserted: results.inserted,
      failed: results.errors.length,
      errors: results.errors.slice(0, 5),  // first 5 errors only
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal' }, { status: 500 })
  }
}