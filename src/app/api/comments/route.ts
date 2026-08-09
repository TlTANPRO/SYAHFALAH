// app/api/comments/route.ts
// POST create new comments row.
// Used by DetailSheet in create mode.

import { makePostHandler } from '@/lib/api/generic-crud'

const config = {
  table: 'comments',
  allowedFields: [
    'content',
    'reference_id',
    'reference_type',
    'parent_comment_id',
    'mentions',
  ],
}

export const POST = makePostHandler(config)
