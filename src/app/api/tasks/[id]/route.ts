// app/api/tasks/[id]/route.ts
// PATCH + DELETE for individual task row.
// P0-1: Role-based WRITE restriction — kepala_kantor is read-only.
//   Only owner/pic_divisi/staff can PATCH/DELETE tasks.

import { NextRequest, NextResponse } from 'next/server'
import { makePatchHandler, makeDeleteHandler } from '@/lib/api/generic-crud'
import { isError, requireAuth } from '@/lib/api/auth-guard'
import { apiError } from '@/lib/api/errors'
import { hasRoleAtLeast } from '@/lib/auth/role-guard'

// P0-1 helper: ensure user has write role.
// InlineEdit (status toggle) goes through main /api/tasks PATCH, this endpoint
// is for full updates via DetailSheet — stricter auth.
async function requireWriteRole(_req: NextRequest): Promise<NextResponse | null> {
  const session = await requireAuth()
  if (isError(session)) return session
  if (session.role === 'kepala_kantor') {
    return apiError.forbidden(`Role kepala_kantor membaca saja — tidak boleh mengubah tasks`)
  }
  return null
}

const config = {
  table: 'tasks',
  allowedFields: [
    'title', 'description', 'status', 'priority', 'type',
    'scheduled_date', 'due_date', 'completed_at',
    'user_id', 'division_id', 'sow_task_id', 'kpi_target_id',
    'parent_task_id', 'estimated_hours', 'actual_hours',
    'is_carry_over', 'sort_order',
  ],
}

// Wrap handlers with role check
async function guardedPatch(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const err = await requireWriteRole(req)
  if (err) return err
  return makePatchHandler(config)(req as any, ctx as any)
}

async function guardedDelete(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const err = await requireWriteRole(req)
  if (err) return err
  return makeDeleteHandler(config)(req as any, ctx as any)
}

export const PATCH = guardedPatch
export const DELETE = guardedDelete
