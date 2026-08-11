// app/api/reports/route.ts
// Server-side list for owner reports page (per-division summary cards).

import { NextRequest } from 'next/server'
import { handleList, type CrudConfig } from '@/lib/api/crud-handler'

const REPORTS_CONFIG: CrudConfig<'reports'> = {
  entity: 'reports',
  table: 'divisions',
  selectFields: 'id, name, description, created_at',
  defaultOrder: { column: 'name', ascending: true },
  defaultPageSize: 12,
  maxPageSize: 50,
  queryLikeFilters: {
    q: 'name', // ?q=foo searches name LIKE '%foo%'
  },
  listExtraFilters: [
    { column: 'name', op: 'neq', value: 'Test Seed' },
  ],
}

export async function GET(req: NextRequest) {
  return handleList(req, REPORTS_CONFIG)
}