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
  defaults: (body: Record<string, unknown>, session: { userId: string; role: string; divisionId?: string }) => {
    const overrides: Record<string, unknown> = {
      author_id: session.userId,  // NOT NULL — server-derived
    }
    // reference_type has check constraint, set default
    if (!body.reference_type) {
      overrides.reference_type = 'task'
    }
    // reference_id is NOT NULL — for QuickAdd without context, use placeholder (00000...)
    if (!body.reference_id) {
      overrides.reference_id = '00000000-0000-0000-0000-000000000000'
    }
    return { __overrides: overrides }
  },
}

export const POST = makePostHandler(config)
