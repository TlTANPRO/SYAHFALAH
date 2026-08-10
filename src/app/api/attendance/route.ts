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
  defaults: (body: Record<string, unknown>, session: { userId: string; role: string; divisionId?: string }) => {
    const overrides: Record<string, unknown> = {}
    overrides.user_id = body.user_id ?? session.userId
    overrides.log_date = body.log_date ?? new Date().toISOString().slice(0, 10)
    return { __overrides: overrides }
  },
}

export const POST = makePostHandler(config)
