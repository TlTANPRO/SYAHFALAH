// app/api/sow-tasks/route.ts
// POST create new sow_tasks row.
// Used by DetailSheet in create mode.

import { makePostHandler } from '@/lib/api/generic-crud'

const config = {
  table: 'sow_tasks',
  allowedFields: [
    'title',
    'description',
    'code',
    'division_id',
    'pic_user_id',
    'status',
    'priority',
    'start_date',
    'end_date',
    'estimated_hours',
    'actual_hours',
    'progress',
    'tags',
    'dependencies',
  ],
}

export const POST = makePostHandler(config)
