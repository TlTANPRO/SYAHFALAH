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
  defaults: (body: Record<string, unknown>, session: { userId: string; role: string; divisionId?: string }) => {
    const overrides: Record<string, unknown> = {
      user_id: body.user_id ?? session.userId,
      status: body.status ?? 'pending',
    }
    const validTypes = ['annual','sick','personal','maternity','paternity','unpaid']
    overrides.type = (typeof body.type === 'string' && validTypes.includes(body.type)) ? body.type : 'annual'
    return { __overrides: overrides }
  },
}

export const POST = makePostHandler(config)
