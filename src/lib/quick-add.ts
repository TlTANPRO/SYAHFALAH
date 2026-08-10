// lib/quick-add.ts
// Registry of Quick-Add actions accessible from Cmd+K command palette.
// Each entry maps to a table + minimal fields for fast inline creation.

import type { ComponentType } from 'react'

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
  fields: Array<{ name: string; kind: string; placeholder?: string; required?: boolean }>
  /** Default values for new row */
  defaults?: Record<string, unknown>
  /** POST endpoint (defaults to schema.apiBase) */
  endpoint?: string
}

import { CheckSquare, UserPlus, Building2, FileText, MessageSquare, FolderOpen } from 'lucide-react'

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
      { name: 'title', kind: 'text', placeholder: 'Judul tugas...', required: true },
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
      { name: 'customer_name', kind: 'text', placeholder: 'Nama customer...', required: true },
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
      { name: 'name', kind: 'text', placeholder: 'Nama project...', required: true },
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
      { name: 'title', kind: 'text', placeholder: 'Judul SOW...', required: true },
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
      { name: 'content', kind: 'longtext', placeholder: 'Tulis komentar...', required: true },
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
      { name: 'title', kind: 'text', placeholder: 'Judul dokumen...', required: true },
    ],
    defaults: {
      category: 'other',
      visibility: 'private',
      version: 1,
    },
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
