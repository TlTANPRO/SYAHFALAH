// app/api/users/[id]/route.ts
// PATCH + DELETE for individual users row.
// Used by DetailSheet (edit + delete).

import { NextRequest, NextResponse } from 'next/server'
import { makePatchHandler, makeDeleteHandler } from '@/lib/api/generic-crud'

const config = {
  table: 'users',
  allowedFields: [
    'full_name',
    'email',
    'phone',
    'pin',
    'role',
    'division_id',
    'is_active',
  ],
}

export const PATCH = makePatchHandler(config)
export const DELETE = makeDeleteHandler(config)
