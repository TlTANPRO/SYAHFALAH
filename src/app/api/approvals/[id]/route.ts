// app/api/approvals/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { makePatchHandler } from '@/lib/api/generic-crud'

const config = {
  table: 'approvals',
  allowedFields: ['title', 'description', 'amount', 'kind', 'status'],
}

export const PATCH = makePatchHandler(config)
