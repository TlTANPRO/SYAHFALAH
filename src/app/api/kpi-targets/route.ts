// app/api/kpi-targets/route.ts
// POST create new kpi_targets row.
// Used by DetailSheet in create mode.

import { makePostHandler } from '@/lib/api/generic-crud'

const config = {
  table: 'kpi_targets',
  allowedFields: [
    'description',
    'target_value',
    'actual_value',
    'unit',
    'period',
    'kpi_definition_id',
    'user_id',
  ],
}

export const POST = makePostHandler(config)
