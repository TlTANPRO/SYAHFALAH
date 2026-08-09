// app/api/sow-tasks/[id]/route.ts
// PATCH + DELETE for individual sow_tasks row.
// Used by DetailSheet (edit + delete).

import { NextRequest, NextResponse } from 'next/server'
import { makePatchHandler, makeDeleteHandler } from '@/lib/api/generic-crud'

const config = {
  table: 'sow_tasks',
  allowedFields: [
    'title',
    'description',
    'code',
    'division_id',
    'pic_user_id',
    'status',
    'priority',
    'start_date',
    'end_date',
    'estimated_hours',
    'actual_hours',
    'progress',
    'tags',
    'dependencies',
  ],
}

export const PATCH = makePatchHandler(config)
export const DELETE = makeDeleteHandler(config)
