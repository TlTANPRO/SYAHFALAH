// app/api/attendance/[id]/route.ts
// PATCH + DELETE for individual attendance_logs row.
// Used by DetailSheet (edit + delete).

import { NextRequest, NextResponse } from 'next/server'
import { makePatchHandler, makeDeleteHandler } from '@/lib/api/generic-crud'

const config = {
  table: 'attendance_logs',
  allowedFields: [
    'user_id',
    'log_date',
    'check_in_at',
    'check_out_at',
    'status',
    'notes',
  ],
}

export const PATCH = makePatchHandler(config)
export const DELETE = makeDeleteHandler(config)
