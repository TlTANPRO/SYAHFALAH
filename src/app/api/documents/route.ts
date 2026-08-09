// app/api/documents/route.ts
// POST create new documents row.
// Used by DetailSheet in create mode.

import { makePostHandler } from '@/lib/api/generic-crud'

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

export const POST = makePostHandler(config)
