// app/api/kpi-targets/[id]/route.ts
// PATCH + DELETE for individual kpi_targets row.
// Used by DetailSheet (edit + delete).

import { NextRequest, NextResponse } from 'next/server'
import { makePatchHandler, makeDeleteHandler } from '@/lib/api/generic-crud'

const config = {
  table: 'kpi_targets',
  allowedFields: [
    'description',
    'target_value',
    'actual_value',
    'unit',
    'period',
    'kpi_definition_id',
    'user_id',
  ],
}

export const PATCH = makePatchHandler(config)
export const DELETE = makeDeleteHandler(config)
