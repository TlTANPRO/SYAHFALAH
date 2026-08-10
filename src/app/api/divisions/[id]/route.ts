// app/api/divisions/[id]/route.ts
// PATCH + DELETE for individual division row.

import { NextRequest, NextResponse } from 'next/server'
import { makePatchHandler, makeDeleteHandler } from '@/lib/api/generic-crud'

const config = {
  table: 'divisions',
  allowedFields: ['name', 'description', 'code', 'is_active'],
}

export const PATCH = makePatchHandler(config)
export const DELETE = makeDeleteHandler(config)
