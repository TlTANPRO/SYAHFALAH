// lib/quick-add.ts
// Registry of Quick-Add actions accessible from Cmd+K command palette.
// Each entry maps to a table + minimal fields for fast inline creation.

import type { ComponentType } from 'react'

export interface QuickAddField {
  name: string
  kind: string
  placeholder?: string
  required?: boolean
  /**
   * When true, this field is eligible for AI suggestions. As the user
   * types, the dialog will call /api/ai/suggest-field?entity=...&field=...
   * and render up to 3 clickable suggestions beside the input.
   *
   * The AI is opt-in: suggestions never block form submission. If the
   * endpoint is slow, fails, or returns no results, the user can still
   * type and submit normally.
   */
  aiSuggestion?: boolean
}

export interface QuickAddAction {
  /** Unique ID */
  id: string
  /** Display label in command palette */
  label: string
  /** Optional hint below label */
  hint?: string
  /** Keyboard shortcut letter (a-z) */
  shortcut?: string
  /** Group for command palette */
  group: 'Buat Cepat' | 'Navigasi'
  /** Icon component (lucide-react) */
  icon: ComponentType<{ className?: string }>
  /** Table to insert into */
  table: string
  /** Minimal fields for inline form */
  fields: QuickAddField[]
  /** Default values for new row */
  defaults?: Record<string, unknown>
  /** POST endpoint (defaults to schema.apiBase) */
  endpoint?: string
}

import {
  CheckSquare,
  UserPlus,
  Building2,
  FileText,
  MessageSquare,
  FolderOpen,
  ClipboardCheck,
  Calendar,
  Palmtree,
  Wrench,
  ShoppingCart,
  Truck,
  Package,
} from 'lucide-react'

export const QUICK_ADD_ACTIONS: QuickAddAction[] = [
  {
    id: 'new-task',
    label: 'Tambah Task',
    hint: 'Buat tugas baru untuk Anda',
    shortcut: 't',
    group: 'Buat Cepat',
    icon: CheckSquare,
    table: 'tasks',
    fields: [
      { name: 'title', kind: 'text', placeholder: 'Judul tugas...', required: true, aiSuggestion: true },
    ],
    defaults: {
      status: 'pending',
      priority: 'normal',
      scheduled_date: new Date().toISOString().slice(0, 10),
    },
  },
  {
    id: 'new-lead',
    label: 'Tambah Lead',
    hint: 'Catat prospek baru',
    shortcut: 'l',
    group: 'Buat Cepat',
    icon: UserPlus,
    table: 'leads',
    fields: [
      { name: 'customer_name', kind: 'text', placeholder: 'Nama customer...', required: true, aiSuggestion: true },
      { name: 'customer_phone', kind: 'text', placeholder: 'No telepon (opsional)' },
    ],
    defaults: {
      source: 'walk_in',
      stage: 'new',
    },
    endpoint: '/api/marketing/leads',
  },
  {
    id: 'new-project',
    label: 'Tambah Project',
    hint: 'Daftarkan project baru',
    shortcut: 'p',
    group: 'Buat Cepat',
    icon: Building2,
    table: 'projects',
    fields: [
      { name: 'name', kind: 'text', placeholder: 'Nama project...', required: true, aiSuggestion: true },
    ],
    defaults: {
      status: 'planning',
      total_units: 0,
      units_completed: 0,
      start_date: new Date().toISOString().slice(0, 10),
    },
  },
  {
    id: 'new-sow-task',
    label: 'Tambah SOW Task',
    hint: 'Tambah item SOW',
    shortcut: 's',
    group: 'Buat Cepat',
    icon: FileText,
    table: 'sow_tasks',
    fields: [
      { name: 'title', kind: 'text', placeholder: 'Judul SOW...', required: true, aiSuggestion: true },
    ],
    defaults: {
      status: 'pending',
      priority: 'normal',
      progress: 0,
    },
  },
  {
    id: 'new-comment',
    label: 'Tambah Comment',
    hint: 'Tambahkan catatan baru',
    shortcut: 'c',
    group: 'Buat Cepat',
    icon: MessageSquare,
    table: 'comments',
    fields: [
      { name: 'content', kind: 'longtext', placeholder: 'Tulis komentar...', required: true, aiSuggestion: true },
    ],
    endpoint: '/api/comments',
  },
  {
    id: 'new-document',
    label: 'Tambah Dokumen',
    hint: 'Daftarkan dokumen baru',
    shortcut: 'd',
    group: 'Buat Cepat',
    icon: FolderOpen,
    table: 'documents',
    fields: [
      { name: 'title', kind: 'text', placeholder: 'Judul dokumen...', required: true, aiSuggestion: true },
    ],
    defaults: {
      category: 'other',
      visibility: 'private',
      version: 1,
    },
  },
  {
    id: 'new-approval',
    label: 'Tambah Approval',
    hint: 'Ajukan approval budget/kontrak',
    shortcut: 'a',
    group: 'Buat Cepat',
    icon: ClipboardCheck,
    table: 'approvals',
    fields: [
      { name: 'title', kind: 'text', placeholder: 'Judul approval...', required: true, aiSuggestion: true },
      { name: 'description', kind: 'longtext', placeholder: 'Detail (opsional)', aiSuggestion: true },
    ],
    defaults: { status: 'pending', type: 'budget' },
  },
  {
    id: 'new-attendance',
    label: 'Absen Hari Ini',
    hint: 'Catat kehadiran hari ini',
    shortcut: 'h',
    group: 'Buat Cepat',
    icon: Calendar,
    table: 'attendance_logs',
    fields: [],
    defaults: { status: 'present', log_date: new Date().toISOString().slice(0, 10) },
  },
  {
    id: 'new-leave',
    label: 'Ajukan Cuti',
    hint: 'Cuti tahunan, sakit, atau personal',
    shortcut: 'i',
    group: 'Buat Cepat',
    icon: Palmtree,
    table: 'leave_requests',
    fields: [
      { name: 'start_date', kind: 'date', placeholder: 'Tanggal mulai', required: true },
      { name: 'end_date', kind: 'date', placeholder: 'Tanggal selesai', required: true },
      { name: 'reason', kind: 'longtext', placeholder: 'Alasan cuti...', required: true },
    ],
    defaults: { type: 'annual', status: 'pending' },
  },
  {
    id: 'new-supplier',
    label: 'Tambah Supplier',
    hint: 'Daftarkan supplier/vendor baru',
    shortcut: 's',
    group: 'Buat Cepat',
    icon: Truck,
    table: 'suppliers',
    fields: [
      { name: 'name', kind: 'text', placeholder: 'Nama supplier...', required: true, aiSuggestion: true },
      { name: 'contact_name', kind: 'text', placeholder: 'Contact person (opsional)' },
      { name: 'phone', kind: 'text', placeholder: 'No telepon (opsional)' },
    ],
    defaults: { is_active: true },
    endpoint: '/api/purchasing/suppliers',
  },
  {
    id: 'new-material',
    label: 'Tambah Material',
    hint: 'Daftar material/inventaris baru',
    shortcut: 'm',
    group: 'Buat Cepat',
    icon: Package,
    table: 'materials',
    fields: [
      { name: 'name', kind: 'text', placeholder: 'Nama material...', required: true, aiSuggestion: true },
      { name: 'unit', kind: 'text', placeholder: 'Satuan (mis. sak, kg, m³)', required: true },
      { name: 'standard_price_rupiah', kind: 'number', placeholder: 'Harga satuan (opsional)' },
    ],
    endpoint: '/api/purchasing/materials',
  },
  {
    id: 'new-purchase-request',
    label: 'Tambah Purchase Request',
    hint: 'Ajukan PR untuk item/supplier',
    shortcut: 'r',
    group: 'Buat Cepat',
    icon: ShoppingCart,
    table: 'purchase_requests',
    fields: [
      { name: 'title', kind: 'text', placeholder: 'Judul PR...', required: true, aiSuggestion: true },
      { name: 'description', kind: 'longtext', placeholder: 'Deskripsi (opsional)', aiSuggestion: true },
      { name: 'needed_by', kind: 'date', placeholder: 'Tanggal dibutuhkan (opsional)' },
    ],
    defaults: { status: 'pending' },
    endpoint: '/api/purchasing/purchase_requests',
  },
  {
    id: 'new-maintenance-ticket',
    label: 'Tambah Tiket Maintenance',
    hint: 'Laporkan kerusakan rumah/unit',
    shortcut: 'w',
    group: 'Buat Cepat',
    icon: Wrench,
    table: 'maintenance_tickets',
    fields: [
      { name: 'title', kind: 'text', placeholder: 'Judul tiket...', required: true, aiSuggestion: true },
      { name: 'description', kind: 'longtext', placeholder: 'Detail kerusakan (opsional)', aiSuggestion: true },
    ],
    defaults: { status: 'open', priority: 'medium' },
    endpoint: '/api/maintenance/maintenance_tickets',
  },

]

/**
 * Submit a quick-add entry. Returns the inserted row or throws on error.
 */
export async function submitQuickAdd(action: QuickAddAction, values: Record<string, unknown>) {
  const body = { ...(action.defaults ?? {}), ...values }
  const url = action.endpoint ?? `/api/${action.table.replace(/_/g, '-')}`
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  const json = await res.json()
  return json.data ?? json
}

/**
 * Fetch AI field suggestions. Returns up to 3 suggestion strings, or an
 * empty array if the endpoint is unavailable / returns nothing.
 *
 * Contract: POST /api/ai/suggest-field
 *   body: { entity: string, field: string, partial?: string, context?: object }
 *   returns: { suggestions: string[], source: 'pattern' | 'llm' | 'hybrid', ... }
 *
 * This helper is fire-and-forget safe — callers should always treat an
 * empty array as "no suggestions" and never block UI on the result.
 */
export interface SuggestFieldOptions {
  entity: string
  field: string
  partial?: string
  context?: Record<string, unknown>
  /** AbortSignal to cancel stale requests */
  signal?: AbortSignal
}

export interface SuggestFieldResult {
  suggestions: string[]
  source: 'pattern' | 'llm' | 'hybrid' | 'error' | 'unavailable'
}

export async function suggestFieldValues(opts: SuggestFieldOptions): Promise<SuggestFieldResult> {
  try {
    const res = await fetch('/api/ai/suggest-field', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity: opts.entity,
        field: opts.field,
        partial: opts.partial ?? '',
        context: opts.context ?? {},
      }),
      signal: opts.signal,
    })
    if (!res.ok) {
      return { suggestions: [], source: 'error' }
    }
    const json = (await res.json().catch(() => ({}))) as {
      suggestions?: unknown
      source?: 'pattern' | 'llm' | 'hybrid'
    }
    const suggestions = Array.isArray(json.suggestions)
      ? (json.suggestions.filter((s) => typeof s === 'string') as string[]).slice(0, 3)
      : []
    return { suggestions, source: json.source ?? 'pattern' }
  } catch {
    return { suggestions: [], source: 'unavailable' }
  }
}
