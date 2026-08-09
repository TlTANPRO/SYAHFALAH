// app/api/comments/[id]/route.ts
// PATCH + DELETE for individual comments row.
// Used by DetailSheet (edit + delete).

import { NextRequest, NextResponse } from 'next/server'
import { makePatchHandler, makeDeleteHandler } from '@/lib/api/generic-crud'

const config = {
  table: 'comments',
  allowedFields: [
    'content',
    'reference_id',
    'reference_type',
    'parent_comment_id',
    'mentions',
  ],
}

export const PATCH = makePatchHandler(config)
export const DELETE = makeDeleteHandler(config)
