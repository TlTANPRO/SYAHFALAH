// app/api/projects/[id]/route.ts
// PATCH + DELETE for individual projects row.
// Used by DetailSheet (edit + delete).

import { NextRequest, NextResponse } from 'next/server'
import { makePatchHandler, makeDeleteHandler } from '@/lib/api/generic-crud'

const config = {
  table: 'projects',
  allowedFields: [
    'name',
    'code',
    'cluster_id',
    'cabang_id',
    'project_manager_id',
    'status',
    'start_date',
    'target_completion_date',
    'budget_rupiah',
    'spent_rupiah',
    'total_units',
    'units_completed',
  ],
}

export const PATCH = makePatchHandler(config)
export const DELETE = makeDeleteHandler(config)
