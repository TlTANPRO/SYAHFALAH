// app/api/tasks/route.ts
// Server-side proxy for personal/tasks. JWT-gated. Filters by user_id
// (not assignee_id — schema uses user_id since migration 011).

import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { handleList, handleCreate, handleUpdate, type CrudConfig } from '@/lib/api/crud-handler'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { isError, requireAuth } from '@/lib/api/auth-guard'
import { buildError, apiError } from '@/lib/api/errors'

const TASKS_CONFIG: CrudConfig<'tasks'> = {
  entity: 'tasks',
  table: 'tasks',
  selectFields: 'id, title, description, status, priority, scheduled_date, due_date, completed_at, user_id, division_id, sow_task_id, kpi_target_id, parent_task_id, is_carry_over, estimated_hours, actual_hours, sort_order, created_at, updated_at',
  defaultOrder: { column: 'priority', ascending: false },
  defaultPageSize: 50,
  maxPageSize: 200,
  scopeToUser: true, // default behavior: only show user's own tasks
  queryFilters: {
    status: 'status',
    scheduled_date: 'scheduled_date',
  },
  enumFields: {
    status: ['pending', 'in_progress', 'completed', 'overdue', 'cancelled'],
    priority: ['low', 'medium', 'high', 'critical'],
  },
  requiredCreateFields: ['title'],
  defaults: {
    status: 'pending',
    priority: 'medium',
    scheduled_date: new Date().toISOString().slice(0, 10),
    type: 'ad_hoc',
  },
  writableFields: ['title', 'description', 'status', 'priority', 'scheduled_date', 'due_date',
    'division_id', 'sow_task_id', 'kpi_target_id', 'parent_task_id',
    'is_carry_over', 'estimated_hours', 'actual_hours', 'sort_order'],
}

export async function GET(req: NextRequest) {
  // ?mine=false means "show everyone's tasks" - we need to override scopeToUser
  const onlyMine = req.nextUrl.searchParams.get('mine') !== 'false'
  if (!onlyMine) {
    // Create a temporary config without scopeToUser
    return handleList(req, { ...TASKS_CONFIG, scopeToUser: false })
  }
  return handleList(req, TASKS_CONFIG)
}

export async function POST(req: NextRequest) {
  return handleCreate(req, TASKS_CONFIG)
}

// PATCH keeps custom completed_at logic on status=completed.
// For general field updates we delegate to handleUpdate.
export async function PATCH(req: NextRequest) {
  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    return apiError.invalidPayload()
  }

  // Custom case: only status field → also touch completed_at
  if (body.status && Object.keys(body).filter((k) => k !== 'id' && k !== 'status').length === 0) {
    const session = await requireAuth()
    if (isError(session)) return session
    const id = body.id as string | undefined
    if (!id) return apiError.badRequest('id required')

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const updates: Record<string, unknown> = {
      status: body.status,
      updated_at: new Date().toISOString(),
    }
    if (body.status === 'done' || body.status === 'completed') {
      updates.completed_at = new Date().toISOString()
    }
    const { data, error } = await sb
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .eq('user_id', session.userId)
      .select('id, status, completed_at, updated_at')
      .single()
    if (error) return buildError('INTERNAL', error.message)
    return NextResponse.json(data)
  }

  // Otherwise delegate to generic update
  return handleUpdate(req, { params: Promise.resolve({ id: body.id as string }) }, TASKS_CONFIG)
}