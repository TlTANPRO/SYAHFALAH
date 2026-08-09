// app/api/attendance/route.ts
// POST create new attendance_logs row.
// Used by DetailSheet in create mode.

import { makePostHandler } from '@/lib/api/generic-crud'

const config = {
  table: 'attendance_logs',
  allowedFields: [
    'user_id',
    'log_date',
    'check_in_at',
    'check_out_at',
    'status',
    'notes',
  ],
}

export const POST = makePostHandler(config)
