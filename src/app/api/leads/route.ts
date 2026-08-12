// app/api/leads/route.ts
// P1-3: Bug #11 fix - create missing API route.
// Leads come from marketing page. Previously 404 - now CRUD endpoints.

import { NextRequest } from 'next/server'
import { makeGetHandler, makePostHandler } from '@/lib/api/generic-crud'

const config = {
  table: 'leads',
  allowedFields: [
    'customer_name', 'customer_phone', 'customer_email',
    'source', 'cluster_id', 'assigned_to_id', 'division_id',
    'estimated_value_rupiah', 'currency', 'stage', 'score',
    'notes', 'last_contacted_at', 'next_followup_at',
  ],
  selectFields: 'id, customer_name, customer_phone, customer_email, source, cluster_id, assigned_to_id, division_id, estimated_value_rupiah, currency, stage, score, notes, last_contacted_at, next_followup_at, created_at, updated_at',
  defaultOrder: { column: 'created_at', ascending: false },
  defaultPageSize: 50,
  maxPageSize: 200,
  searchFields: ['customer_name', 'customer_phone', 'customer_email', 'notes'],
  enums: {
    stage: ['new', 'contacted', 'qualified', 'proposal', 'closing', 'closed', 'batal'],
    source: ['referral', 'website', 'walk_in', 'social_media', 'advertising', 'other'],
  },
}

export const GET = makeGetHandler(config)
export const POST = makePostHandler(config)
