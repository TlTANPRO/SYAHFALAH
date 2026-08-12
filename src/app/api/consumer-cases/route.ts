// app/api/consumer-cases/route.ts
// P1-3: Bug #11 fix - create missing API route.
// Consumer cases table (formerly "konsumen").

import { makeGetHandler, makePostHandler } from '@/lib/api/generic-crud'

const config = {
  table: 'consumer_cases',
  allowedFields: [
    'customer_name', 'customer_phone', 'customer_email', 'customer_address',
    'cluster_id', 'assigned_to_id', 'division_id', 'unit_id', 'project_id',
    'case_type', 'status', 'priority', 'description', 'resolution_notes',
    'reported_at', 'resolved_at', 'sla_due_at',
  ],
  selectFields: 'id, customer_name, customer_phone, customer_email, customer_address, cluster_id, assigned_to_id, division_id, unit_id, project_id, case_type, status, priority, description, resolution_notes, reported_at, resolved_at, sla_due_at, created_at, updated_at',
  defaultOrder: { column: 'reported_at', ascending: false },
  defaultPageSize: 50,
  maxPageSize: 200,
  searchFields: ['customer_name', 'customer_phone', 'customer_email', 'description'],
  enums: {
    status: ['open', 'in_progress', 'pending_customer', 'resolved', 'closed', 'cancelled'],
    priority: ['low', 'medium', 'high', 'critical'],
    case_type: ['complaint', 'inquiry', 'request', 'maintenance', 'warranty'],
  },
}

export const GET = makeGetHandler(config)
export const POST = makePostHandler(config)
