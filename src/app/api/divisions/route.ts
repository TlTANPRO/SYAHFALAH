// app/api/divisions/route.ts
// P1-3: Bug #11 fix - create missing API route.
// Divisions are read-mostly (set up by owner). Used by /divisi/[id] pages.

import { makeGetHandler, makePostHandler } from '@/lib/api/generic-crud'

const config = {
  table: 'divisions',
  allowedFields: [
    'name', 'code', 'description', 'region', 'head_user_id',
    'cluster_count', 'staff_count',
  ],
  selectFields: 'id, name, code, description, region, head_user_id, cluster_count, staff_count, created_at, updated_at',
  defaultOrder: { column: 'name', ascending: true },
  defaultPageSize: 100,
  maxPageSize: 500,
  searchFields: ['name', 'code', 'description'],
}

export const GET = makeGetHandler(config)
export const POST = makePostHandler(config)
