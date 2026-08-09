// app/api/documents/[id]/route.ts
// PATCH + DELETE for individual documents row.
// Used by DetailSheet (edit + delete).

import { NextRequest, NextResponse } from 'next/server'
import { makePatchHandler, makeDeleteHandler } from '@/lib/api/generic-crud'

const config = {
  table: 'documents',
  allowedFields: [
    'title',
    'category',
    'description',
    'file_url',
    'visibility',
    'division_id',
    'tags',
    'version',
  ],
}

export const PATCH = makePatchHandler(config)
export const DELETE = makeDeleteHandler(config)
