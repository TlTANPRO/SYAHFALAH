// app/api/projects/route.ts
// POST create new projects row.
// Used by DetailSheet in create mode.

import { makePostHandler, makeGetHandler } from '@/lib/api/generic-crud'

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
  defaults: (body: Record<string, unknown>, session: { userId: string; role: string; divisionId?: string }) => {
    const overrides: Record<string, unknown> = {}
    if (!body.target_completion_date) {
      const startStr = typeof body.start_date === 'string' ? body.start_date : null
      const start = startStr ? new Date(startStr) : new Date()
      start.setDate(start.getDate() + 90)
      overrides.target_completion_date = start.toISOString().slice(0, 10)
    }
    if (!body.start_date) {
      overrides.start_date = new Date().toISOString().slice(0, 10)
    }
    return { __overrides: overrides }
  },
}

export const POST = makePostHandler(config)

// P1-3: Bug #10 fix - getHandler for list/read via /api/projects.
// Used by owner pages and dashboard loaders.
export const GET = makeGetHandler({
  ...config,
  selectFields: 'id, name, code, cluster_id, cabang_id, project_manager_id, status, start_date, target_completion_date, budget_rupiah, spent_rupiah, total_units, units_completed, created_at, updated_at',
  defaultOrder: { column: 'created_at', ascending: false },
  defaultPageSize: 50,
  maxPageSize: 200,
  searchFields: ['name', 'code'],
})
