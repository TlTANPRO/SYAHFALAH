// app/api/clusters/route.ts
// P1-3: Bug #11 fix - create missing API route.
// Clusters are read-mostly (set up by owner). Tiny CRUD endpoint.

import { makeGetHandler, makePostHandler } from '@/lib/api/generic-crud'

const config = {
  table: 'clusters',
  allowedFields: [
    'name', 'code', 'description', 'division_id',
    'region', 'city', 'total_units', 'lead_count',
  ],
  selectFields: 'id, name, code, description, division_id, region, city, total_units, lead_count, created_at, updated_at',
  defaultOrder: { column: 'name', ascending: true },
  defaultPageSize: 100,
  maxPageSize: 500,
  searchFields: ['name', 'code', 'description'],
}

export const GET = makeGetHandler(config)
export const POST = makePostHandler(config)
