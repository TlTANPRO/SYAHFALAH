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
  defaults: (body: Record<string, unknown>) => {
    const overrides: Record<string, unknown> = {}
    // Map invalid visibility values to nearest enum
    const validVisibility = ['all', 'owner_only', 'kk_and_owner', 'pic_and_up']
    const vis = typeof body.visibility === 'string' ? body.visibility : null
    overrides.visibility = (vis && validVisibility.includes(vis)) ? vis : 'pic_and_up'
    return { __overrides: overrides }
  },
}

export const POST = makePostHandler(config)
