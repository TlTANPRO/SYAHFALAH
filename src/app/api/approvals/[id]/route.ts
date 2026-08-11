// app/api/approvals/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { makePatchHandler, makeDeleteHandler } from '@/lib/api/generic-crud'

const config = {
  table: 'approvals',
  allowedFields: ['title', 'description', 'amount', 'kind', 'status'],
}

export const PATCH = makePatchHandler(config)

export const DELETE = makeDeleteHandler(config)
