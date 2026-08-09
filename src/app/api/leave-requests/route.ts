// app/api/leave-requests/route.ts
// POST create new leave_requests row.
// Used by DetailSheet in create mode.

import { makePostHandler } from '@/lib/api/generic-crud'

const config = {
  table: 'leave_requests',
  allowedFields: [
    'user_id',
    'start_date',
    'end_date',
    'type',
    'status',
    'reason',
  ],
}

export const POST = makePostHandler(config)
