// app/api/projects/route.ts
// POST create new projects row.
// Used by DetailSheet in create mode.

import { makePostHandler } from '@/lib/api/generic-crud'

const config = {
  table: 'projects',
  allowedFields: [
    'name',
    'code',
    'cluster_id',
    'cabang_id',
    'project_manager_id',
    'status',
    'start_date',
    'target_completion_date',
    'budget_rupiah',
    'spent_rupiah',
    'total_units',
    'units_completed',
  ],
}

export const POST = makePostHandler(config)
