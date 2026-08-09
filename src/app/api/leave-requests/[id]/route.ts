// app/api/leave-requests/[id]/route.ts
// PATCH + DELETE for individual leave_requests row.
// Used by DetailSheet (edit + delete).

import { NextRequest, NextResponse } from 'next/server'
import { makePatchHandler, makeDeleteHandler } from '@/lib/api/generic-crud'

const config = {
  table: 'leave_requests',
  allowedFields: [
    'user_id',
    'start_date',
    'end_date',
    'type',
    'status',
    'reason',
  ],
}

export const PATCH = makePatchHandler(config)
export const DELETE = makeDeleteHandler(config)
