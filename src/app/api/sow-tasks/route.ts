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
  defaults: (body: Record<string, unknown>, session: { userId: string; role: string; divisionId?: string }) => {
    const overrides: Record<string, unknown> = {}
    const fill: Record<string, unknown> = {}
    if (!body.code) fill.code = `SOW-${Date.now().toString(36).toUpperCase()}`
    // Map invalid enum values to valid ones
    const validPriority = ['low','medium','high','critical']
    overrides.priority = (typeof body.priority === 'string' && validPriority.includes(body.priority)) ? body.priority : 'medium'
    const validStatus = ['planned','in_progress','completed','on_hold','cancelled']
    overrides.status = (typeof body.status === 'string' && validStatus.includes(body.status)) ? body.status : 'planned'
    // division_id is NOT NULL — fall back to first available division if user has none
    if (!body.division_id && session.divisionId) {
      fill.division_id = session.divisionId
    } else if (!body.division_id && session.role === 'owner') {
      // Owner with no division — fall back to Marketing
      fill.division_id = '1a2e6f06-8b25-4df1-880e-c56c96dd5708'
    }
    return { ...fill, __overrides: overrides }
  },
}

export const POST = makePostHandler(config)
