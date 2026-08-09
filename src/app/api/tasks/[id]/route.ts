// app/api/tasks/[id]/route.ts
// PATCH + DELETE for individual task row.
// Used by DetailSheet (edit + delete) AND InlineEdit (title/status).

import { NextRequest, NextResponse } from 'next/server'
import { makePatchHandler, makeDeleteHandler } from '@/lib/api/generic-crud'

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

export const PATCH = makePatchHandler(config)
export const DELETE = makeDeleteHandler(config)
