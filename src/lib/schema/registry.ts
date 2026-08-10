// lib/schema/registry.ts
// Table schema metadata for auto-form generation.
// Maps DB column → form field type + UI hints.

export type FieldKind =
  | 'text'
  | 'longtext'    // textarea
  | 'richtext'    // future: markdown editor
  | 'number'
  | 'integer'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'select'      // enum / fixed options
  | 'fk'          // foreign key reference
  | 'array'       // text[] / uuid[]
  | 'json'
  | 'email'
  | 'phone'
  | 'url'
  | 'currency'
  | 'hidden'

export type AccessLevel = 'r' | 'rw' | 'none'

export type FieldPermissions = Partial<Record<string, AccessLevel>>

export interface FieldSchema {
  /** DB column name */
  name: string
  /** Form field type */
  kind: FieldKind
  /**
   * Field-level permissions by role.
   * Keys are roles: 'owner' | 'kepala_kantor' | 'pic_divisi' | 'staff' | 'system'.
   * Values: 'r' (read-only), 'rw' (read-write), 'none' (hidden).
   * If a role is not listed, defaults to 'rw' for owner/kepala_kantor, 'r' for others.
   */
  permissions?: FieldPermissions
  /** Required (NOT NULL + no default) */
  required?: boolean
  /** UI label (Indonesian) */
  label: string
  /** Help text shown below input */
  help?: string
  /** For select kind: allowed values */
  options?: Array<{ value: string | number; label: string }>
  /** For fk kind: target table + display column */
  reference?: {
    table: string
    column: string       // PK of target
    display: string      // column to show in dropdown
    endpoint?: string    // optional explicit GET endpoint
  }
  /** For array kind: element kind */
  arrayOf?: 'text' | 'uuid' | 'number'
  /** Default value if null/undefined */
  defaultValue?: unknown
  /** Whether to show in detail sheet */
  showInSheet?: boolean
  /** Whether to show inline in list */
  showInline?: boolean
  /** Display width (1-12 grid columns) */
  width?: number
  /** Sort order within sheet */
  order?: number
}

export interface TableSchema {
  /** Table name in DB */
  table: string
  /** Human label */
  label: string
  /** Plural label */
  pluralLabel: string
  /** Primary key column */
  primaryKey: string
  /** Field definitions */
  fields: FieldSchema[]
  /** Tabs for detail sheet (groups of fields) */
  tabs?: Array<{ id: string; label: string; fields: string[] }>
  /** Default API endpoint base (without /id) */
  apiBase: string
}

// ─── Tables ─────────────────────────────────────────────────────────────────

export const SCHEMAS: Record<string, TableSchema> = {
  leads: {
    table: 'leads',
    label: 'Lead',
    pluralLabel: 'Leads',
    primaryKey: 'id',
    apiBase: '/api/marketing/leads',
    tabs: [
      {
        id: 'overview',
        label: 'Overview',
        fields: ['customer_name', 'customer_phone', 'source', 'cluster_id', 'estimated_value_rupiah', 'notes'],
      },
      {
        id: 'pipeline',
        label: 'Pipeline',
        fields: ['stage', 'score', 'contacted_at', 'surveyed_at', 'booked_at', 'closing_at', 'batal_at', 'batal_reason'],
      },
      {
        id: 'assignment',
        label: 'Assignment',
        fields: ['assigned_to_id', 'code'],
      },
    ],
    fields: [
      { name: 'customer_name', kind: 'text', required: true, label: 'Nama Customer', showInline: true, order: 1, width: 8 },
      { name: 'customer_phone', kind: 'phone', label: 'Telepon', order: 2, width: 4 },
      { name: 'source', kind: 'select', label: 'Sumber', required: true, showInline: true, order: 3, width: 4,
        options: [
          { value: 'walk_in', label: 'Walk-in' },
          { value: 'website', label: 'Website' },
          { value: 'referral', label: 'Referral' },
          { value: 'social_media', label: 'Social Media' },
          { value: 'agent', label: 'Agen' },
          { value: 'exhibition', label: 'Exhibition' },
        ],
      },
      { name: 'cluster_id', kind: 'fk', label: 'Cluster', reference: { table: 'clusters', column: 'id', display: 'name' }, order: 4, width: 4 },
      { name: 'estimated_value_rupiah', kind: 'currency', label: 'Estimasi Nilai', order: 5, width: 4 },
      { name: 'notes', kind: 'longtext', label: 'Catatan', order: 6, width: 12 },
      { name: 'stage', kind: 'select', label: 'Stage', required: true, showInline: true, order: 7, width: 4,
        options: [
          { value: 'new', label: 'Baru' },
          { value: 'contacted', label: 'Dihubungi' },
          { value: 'surveyed', label: 'Disurvey' },
          { value: 'booked', label: 'Booking' },
          { value: 'closing', label: 'Closing' },
          { value: 'closed', label: 'Closed' },
          { value: 'batal', label: 'Batal' },
        ],
      },
      { name: 'score', kind: 'integer', label: 'Skor (0-100)', order: 8, width: 3 },
      { name: 'contacted_at', kind: 'datetime', label: 'Tgl Dihubungi', order: 9, width: 6 },
      { name: 'surveyed_at', kind: 'datetime', label: 'Tgl Survey', order: 10, width: 6 },
      { name: 'booked_at', kind: 'datetime', label: 'Tgl Booking', order: 11, width: 6 },
      { name: 'closing_at', kind: 'datetime', label: 'Tgl Closing', order: 12, width: 6 },
      { name: 'batal_at', kind: 'datetime', label: 'Tgl Batal', order: 13, width: 6 },
      { name: 'batal_reason', kind: 'text', label: 'Alasan Batal', order: 14, width: 6 },
      { name: 'assigned_to_id', kind: 'fk', label: 'PIC', reference: { table: 'users', column: 'id', display: 'full_name' }, order: 15, width: 6 },
      { name: 'code', kind: 'text', label: 'Kode', order: 16, width: 6 },
    ],
  },

  tasks: {
    table: 'tasks',
    label: 'Task',
    pluralLabel: 'Tasks',
    primaryKey: 'id',
    apiBase: '/api/tasks',
    tabs: [
      { id: 'overview', label: 'Overview', fields: ['title', 'description', 'status', 'priority', 'scheduled_date', 'due_date'] },
      { id: 'effort', label: 'Effort', fields: ['estimated_hours', 'actual_hours'] },
      { id: 'relations', label: 'Relations', fields: ['user_id', 'division_id', 'sow_task_id', 'kpi_target_id', 'parent_task_id'] },
    ],
    fields: [
      { name: 'title', kind: 'text', required: true, label: 'Judul', showInline: true, order: 1, width: 8,
        permissions: { staff: 'rw', pic_divisi: 'rw', kepala_kantor: 'rw', owner: 'rw' } },
      { name: 'description', kind: 'longtext', label: 'Deskripsi', order: 2, width: 12 },
      { name: 'status', kind: 'select', label: 'Status', required: true, showInline: true, order: 3, width: 4,
        options: [
          { value: 'pending', label: 'Pending' },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'completed', label: 'Completed' },
          { value: 'cancelled', label: 'Cancelled' },
          { value: 'overdue', label: 'Overdue' },
        ],
      },
      { name: 'priority', kind: 'select', label: 'Prioritas', showInline: true, order: 4, width: 4,
        options: [
          { value: 'low', label: 'Rendah' },
          { value: 'normal', label: 'Normal' },
          { value: 'high', label: 'Tinggi' },
          { value: 'urgent', label: 'Mendesak' },
        ],
      },
      { name: 'scheduled_date', kind: 'date', label: 'Tanggal', showInline: true, order: 5, width: 4 },
      { name: 'due_date', kind: 'datetime', label: 'Deadline', order: 6, width: 4 },
      { name: 'estimated_hours', kind: 'number', label: 'Estimasi Jam', order: 7, width: 4 },
      { name: 'actual_hours', kind: 'number', label: 'Jam Aktual', order: 8, width: 4 },
      { name: 'user_id', kind: 'fk', label: 'PIC', required: true, reference: { table: 'users', column: 'id', display: 'full_name' }, order: 9, width: 6 },
      { name: 'division_id', kind: 'fk', label: 'Divisi', reference: { table: 'divisions', column: 'id', display: 'name' }, order: 10, width: 6 },
      { name: 'sow_task_id', kind: 'fk', label: 'SOW Task', reference: { table: 'sow_tasks', column: 'id', display: 'title' }, order: 11, width: 6 },
      { name: 'kpi_target_id', kind: 'fk', label: 'KPI Target', reference: { table: 'kpi_targets', column: 'id', display: 'description' }, order: 12, width: 6 },
      { name: 'parent_task_id', kind: 'fk', label: 'Parent Task', reference: { table: 'tasks', column: 'id', display: 'title' }, order: 13, width: 6 },
    ],
  },

  projects: {
    table: 'projects',
    label: 'Project',
    pluralLabel: 'Projects',
    primaryKey: 'id',
    apiBase: '/api/projects/projects',
    tabs: [
      { id: 'overview', label: 'Overview', fields: ['name', 'code', 'cluster_id', 'cabang_id', 'project_manager_id', 'status'] },
      { id: 'timeline', label: 'Timeline', fields: ['start_date', 'target_completion_date'] },
      { id: 'budget', label: 'Budget', fields: ['budget_rupiah', 'spent_rupiah', 'total_units', 'units_completed'] },
    ],
    fields: [
      { name: 'name', kind: 'text', required: true, label: 'Nama', showInline: true, order: 1, width: 8 },
      { name: 'code', kind: 'text', label: 'Kode', showInline: true, order: 2, width: 4 },
      { name: 'cluster_id', kind: 'fk', label: 'Cluster', reference: { table: 'clusters', column: 'id', display: 'name' }, order: 3, width: 6 },
      { name: 'cabang_id', kind: 'fk', label: 'Cabang', reference: { table: 'cabangs', column: 'id', display: 'name' }, order: 4, width: 6 },
      { name: 'project_manager_id', kind: 'fk', label: 'PM', reference: { table: 'users', column: 'id', display: 'full_name' }, order: 5, width: 6 },
      { name: 'status', kind: 'select', label: 'Status', showInline: true, order: 6, width: 4,
        options: [
          { value: 'planning', label: 'Planning' },
          { value: 'in_progress', label: 'Berjalan' },
          { value: 'on_hold', label: 'Ditunda' },
          { value: 'completed', label: 'Selesai' },
          { value: 'cancelled', label: 'Dibatalkan' },
        ],
      },
      { name: 'start_date', kind: 'date', label: 'Mulai', showInline: true, order: 7, width: 4 },
      { name: 'target_completion_date', kind: 'date', label: 'Target Selesai', order: 8, width: 4 },
      { name: 'budget_rupiah', kind: 'currency', label: 'Anggaran', order: 9, width: 6 },
      { name: 'spent_rupiah', kind: 'currency', label: 'Terpakai', order: 10, width: 6 },
      { name: 'total_units', kind: 'integer', label: 'Total Unit', order: 11, width: 6 },
      { name: 'units_completed', kind: 'integer', label: 'Unit Selesai', order: 12, width: 6 },
    ],
  },

  sow_tasks: {
    table: 'sow_tasks',
    label: 'SOW Task',
    pluralLabel: 'SOW Tasks',
    primaryKey: 'id',
    apiBase: '/api/sow-tasks',
    tabs: [
      { id: 'overview', label: 'Overview', fields: ['title', 'code', 'description', 'division_id', 'pic_user_id', 'status'] },
      { id: 'timeline', label: 'Timeline', fields: ['start_date', 'end_date', 'estimated_hours', 'actual_hours'] },
      { id: 'progress', label: 'Progress', fields: ['priority', 'progress', 'tags', 'dependencies'] },
    ],
    fields: [
      { name: 'title', kind: 'text', required: true, label: 'Judul', showInline: true, order: 1, width: 8 },
      { name: 'code', kind: 'text', label: 'Kode', showInline: true, order: 2, width: 4 },
      { name: 'description', kind: 'longtext', label: 'Deskripsi', order: 3, width: 12 },
      { name: 'division_id', kind: 'fk', label: 'Divisi', required: true, reference: { table: 'divisions', column: 'id', display: 'name' }, order: 4, width: 6 },
      { name: 'pic_user_id', kind: 'fk', label: 'PIC', reference: { table: 'users', column: 'id', display: 'full_name' }, order: 5, width: 6 },
      { name: 'status', kind: 'select', label: 'Status', showInline: true, order: 6, width: 4,
        options: [
          { value: 'pending', label: 'Pending' },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'completed', label: 'Completed' },
          { value: 'cancelled', label: 'Cancelled' },
        ],
      },
      { name: 'start_date', kind: 'date', label: 'Mulai', order: 7, width: 4 },
      { name: 'end_date', kind: 'date', label: 'Selesai', order: 8, width: 4 },
      { name: 'estimated_hours', kind: 'number', label: 'Estimasi Jam', order: 9, width: 4 },
      { name: 'actual_hours', kind: 'number', label: 'Jam Aktual', order: 10, width: 4 },
      { name: 'priority', kind: 'select', label: 'Prioritas', showInline: true, order: 11, width: 4,
        options: [
          { value: 'low', label: 'Rendah' },
          { value: 'normal', label: 'Normal' },
          { value: 'high', label: 'Tinggi' },
          { value: 'urgent', label: 'Mendesak' },
        ],
      },
      { name: 'progress', kind: 'integer', label: 'Progress (%)', showInline: true, order: 12, width: 4 },
      { name: 'tags', kind: 'array', arrayOf: 'text', label: 'Tags', order: 13, width: 6 },
      { name: 'dependencies', kind: 'array', arrayOf: 'uuid', label: 'Dependencies', order: 14, width: 6 },
    ],
  },

  comments: {
    table: 'comments',
    label: 'Comment',
    pluralLabel: 'Comments',
    primaryKey: 'id',
    apiBase: '/api/comments',
    fields: [
      { name: 'content', kind: 'longtext', required: true, label: 'Komentar', order: 1, width: 12 },
      { name: 'reference_id', kind: 'text', required: true, label: 'Ref ID', order: 2, width: 6 },
      { name: 'reference_type', kind: 'text', required: true, label: 'Ref Type', order: 3, width: 6 },
    ],
  },

  users: {
    table: 'users',
    label: 'User',
    pluralLabel: 'Users',
    primaryKey: 'id',
    apiBase: '/api/users',
    tabs: [
      { id: 'profile', label: 'Profil', fields: ['full_name', 'email', 'phone', 'pin'] },
      { id: 'role', label: 'Role & Division', fields: ['role', 'division_id', 'is_active'] },
    ],
    fields: [
      { name: 'full_name', kind: 'text', required: true, label: 'Nama Lengkap', showInline: true, order: 1, width: 8 },
      { name: 'email', kind: 'email', label: 'Email', order: 2, width: 6 },
      { name: 'phone', kind: 'phone', label: 'No HP', order: 3, width: 6 },
      { name: 'pin', kind: 'text', label: 'PIN (4 digit)', order: 4, width: 4,
        permissions: { staff: 'none', pic_divisi: 'none', kepala_kantor: 'none' } },
      { name: 'role', kind: 'select', label: 'Role', required: true, showInline: true, order: 5, width: 4,
        permissions: { staff: 'none', pic_divisi: 'none', kepala_kantor: 'none' },
        options: [
          { value: 'owner', label: 'Owner' },
          { value: 'kepala_kantor', label: 'Kepala Kantor' },
          { value: 'pic_divisi', label: 'PIC Divisi' },
          { value: 'staff', label: 'Staff' },
        ],
      },
      { name: 'division_id', kind: 'fk', label: 'Divisi', reference: { table: 'divisions', column: 'id', display: 'name' }, order: 6, width: 6 },
      { name: 'is_active', kind: 'boolean', label: 'Aktif', showInline: true, order: 7, width: 3 },
    ],
  },

  kpi_targets: {
    table: 'kpi_targets',
    label: 'KPI Target',
    pluralLabel: 'KPI Targets',
    primaryKey: 'id',
    apiBase: '/api/kpi-targets',
    fields: [
      { name: 'description', kind: 'text', required: true, label: 'Deskripsi', showInline: true, order: 1, width: 8 },
      { name: 'target_value', kind: 'number', label: 'Target', showInline: true, order: 2, width: 4 },
      { name: 'actual_value', kind: 'number', label: 'Aktual', showInline: true, order: 3, width: 4 },
      { name: 'unit', kind: 'text', label: 'Unit', order: 4, width: 4 },
      { name: 'period', kind: 'text', label: 'Periode', order: 5, width: 4 },
      { name: 'kpi_definition_id', kind: 'fk', label: 'KPI Def', reference: { table: 'kpi_definitions', column: 'id', display: 'name' }, order: 6, width: 6 },
      { name: 'user_id', kind: 'fk', label: 'PIC', reference: { table: 'users', column: 'id', display: 'full_name' }, order: 7, width: 6 },
    ],
  },

  documents: {
    table: 'documents',
    label: 'Dokumen',
    pluralLabel: 'Dokumen',
    primaryKey: 'id',
    apiBase: '/api/documents',
    fields: [
      { name: 'title', kind: 'text', required: true, label: 'Judul', showInline: true, order: 1, width: 8 },
      { name: 'category', kind: 'select', label: 'Kategori', required: true, order: 2, width: 4,
        options: [
          { value: 'contract', label: 'Kontrak' },
          { value: 'invoice', label: 'Invoice' },
          { value: 'report', label: 'Laporan' },
          { value: 'policy', label: 'Kebijakan' },
          { value: 'other', label: 'Lainnya' },
        ],
      },
      { name: 'description', kind: 'longtext', label: 'Deskripsi', order: 3, width: 12 },
      { name: 'file_url', kind: 'url', label: 'URL File', order: 4, width: 6 },
      { name: 'visibility', kind: 'select', label: 'Visibilitas', required: true, order: 5, width: 4,
        options: [
          { value: 'public', label: 'Public' },
          { value: 'private', label: 'Private' },
          { value: 'division', label: 'Division' },
        ],
      },
      { name: 'division_id', kind: 'fk', label: 'Divisi', reference: { table: 'divisions', column: 'id', display: 'name' }, order: 6, width: 4 },
      { name: 'tags', kind: 'array', arrayOf: 'text', label: 'Tags', order: 7, width: 6 },
    ],
  },

  attendance_logs: {
    table: 'attendance_logs',
    label: 'Absensi',
    pluralLabel: 'Absensi',
    primaryKey: 'id',
    apiBase: '/api/attendance',
    fields: [
      { name: 'user_id', kind: 'fk', label: 'Karyawan', required: true, reference: { table: 'users', column: 'id', display: 'full_name' }, order: 1, width: 6 },
      { name: 'log_date', kind: 'date', label: 'Tanggal', required: true, showInline: true, order: 2, width: 4 },
      { name: 'check_in_at', kind: 'datetime', label: 'Jam Masuk', order: 3, width: 4 },
      { name: 'check_out_at', kind: 'datetime', label: 'Jam Keluar', order: 4, width: 4 },
      { name: 'status', kind: 'select', label: 'Status', showInline: true, order: 5, width: 4,
        options: [
          { value: 'present', label: 'Hadir' },
          { value: 'late', label: 'Terlambat' },
          { value: 'absent', label: 'Tidak Hadir' },
          { value: 'leave', label: 'Cuti' },
        ],
      },
      { name: 'notes', kind: 'longtext', label: 'Catatan', order: 6, width: 12 },
    ],
  },

  leave_requests: {
    table: 'leave_requests',
    label: 'Pengajuan Cuti',
    pluralLabel: 'Cuti',
    primaryKey: 'id',
    apiBase: '/api/leave-requests',
    fields: [
      { name: 'user_id', kind: 'fk', label: 'Karyawan', required: true, reference: { table: 'users', column: 'id', display: 'full_name' }, order: 1, width: 6 },
      { name: 'start_date', kind: 'date', label: 'Mulai', required: true, showInline: true, order: 2, width: 4 },
      { name: 'end_date', kind: 'date', label: 'Selesai', required: true, showInline: true, order: 3, width: 4 },
      { name: 'type', kind: 'select', label: 'Tipe', required: true, showInline: true, order: 4, width: 4,
        options: [
          { value: 'annual', label: 'Tahunan' },
          { value: 'sick', label: 'Sakit' },
          { value: 'personal', label: 'Pribadi' },
          { value: 'maternity', label: 'Melahirkan' },
        ],
      },
      { name: 'status', kind: 'select', label: 'Status', showInline: true, order: 5, width: 4,
        options: [
          { value: 'pending', label: 'Pending' },
          { value: 'approved', label: 'Disetujui' },
          { value: 'rejected', label: 'Ditolak' },
        ],
      },
      { name: 'reason', kind: 'longtext', label: 'Alasan', order: 6, width: 12 },
    ],
  },
    suppliers: {
    table: 'suppliers',
    label: 'Supplier',
    pluralLabel: 'Suppliers',
    primaryKey: 'id',
    apiBase: '/api/purchasing/suppliers',
    tabs: [
      { id: 'overview', label: 'Overview', fields: ['code', 'name', 'contact_name', 'phone', 'email', 'is_active'] },
      { id: 'detail', label: 'Detail', fields: ['address', 'npwp', 'bank_account', 'notes'] },
    ],
    fields: [
      { name: 'code', kind: 'text', label: 'Kode', showInline: true, order: 1, width: 4,
        permissions: { staff: 'rw', pic_divisi: 'rw', kepala_kantor: 'rw', owner: 'rw' } },
      { name: 'name', kind: 'text', required: true, label: 'Nama', showInline: true, order: 2, width: 8,
        permissions: { staff: 'rw', pic_divisi: 'rw', kepala_kantor: 'rw', owner: 'rw' } },
      { name: 'contact_name', kind: 'text', label: 'Contact Person', order: 3, width: 6,
        permissions: { staff: 'rw', pic_divisi: 'rw', kepala_kantor: 'rw', owner: 'rw' } },
      { name: 'phone', kind: 'phone', label: 'Telepon', order: 4, width: 6,
        permissions: { staff: 'rw', pic_divisi: 'rw', kepala_kantor: 'rw', owner: 'rw' } },
      { name: 'email', kind: 'email', label: 'Email', order: 5, width: 6,
        permissions: { staff: 'rw', pic_divisi: 'rw', kepala_kantor: 'rw', owner: 'rw' } },
      { name: 'address', kind: 'longtext', label: 'Alamat', order: 6, width: 12 },
      { name: 'npwp', kind: 'text', label: 'NPWP', order: 7, width: 6 },
      { name: 'bank_account', kind: 'text', label: 'Rekening', order: 8, width: 6 },
      { name: 'notes', kind: 'longtext', label: 'Catatan', order: 9, width: 12 },
      { name: 'is_active', kind: 'boolean', label: 'Aktif', showInline: true, order: 10, width: 4,
        permissions: { staff: 'r', pic_divisi: 'rw', kepala_kantor: 'rw', owner: 'rw' } },
    ],
  },
  materials: {
    table: 'materials',
    label: 'Material',
    pluralLabel: 'Materials',
    primaryKey: 'id',
    apiBase: '/api/purchasing/materials',
    tabs: [
      { id: 'overview', label: 'Overview', fields: ['code', 'name', 'unit', 'category', 'standard_price_rupiah'] },
      { id: 'detail', label: 'Detail', fields: ['description', 'is_active'] },
    ],
    fields: [
      { name: 'code', kind: 'text', label: 'Kode', showInline: true, order: 1, width: 4,
        permissions: { staff: 'rw', pic_divisi: 'rw', kepala_kantor: 'rw', owner: 'rw' } },
      { name: 'name', kind: 'text', required: true, label: 'Nama', showInline: true, order: 2, width: 6,
        permissions: { staff: 'rw', pic_divisi: 'rw', kepala_kantor: 'rw', owner: 'rw' } },
      { name: 'category', kind: 'text', label: 'Kategori', showInline: true, order: 3, width: 4 },
      { name: 'unit', kind: 'text', label: 'Unit', required: true, showInline: true, order: 4, width: 4 },
      { name: 'standard_price_rupiah', kind: 'currency', label: 'Harga Standar', order: 5, width: 4,
        permissions: { staff: 'r', pic_divisi: 'rw', kepala_kantor: 'rw', owner: 'rw' } },
      { name: 'description', kind: 'longtext', label: 'Deskripsi', order: 6, width: 12 },
      { name: 'is_active', kind: 'boolean', label: 'Aktif', showInline: true, order: 7, width: 4,
        permissions: { staff: 'r', pic_divisi: 'rw', kepala_kantor: 'rw', owner: 'rw' } },
    ],
  },
  purchase_requests: {
    table: 'purchase_requests',
    label: 'PR',
    pluralLabel: 'Purchase Requests',
    primaryKey: 'id',
    apiBase: '/api/purchasing/purchase_requests',
    tabs: [
      { id: 'overview', label: 'Overview', fields: ['code', 'title', 'status', 'requester_id', 'project_id', 'needed_by'] },
      { id: 'approval', label: 'Approval', fields: ['approver_id', 'approved_at'] },
      { id: 'detail', label: 'Detail', fields: ['description', 'notes'] },
    ],
    fields: [
      { name: 'code', kind: 'text', label: 'Kode', showInline: true, order: 1, width: 4 },
      { name: 'title', kind: 'text', required: true, label: 'Judul', showInline: true, order: 2, width: 8,
        permissions: { staff: 'rw', pic_divisi: 'rw', kepala_kantor: 'rw', owner: 'rw' } },
      { name: 'status', kind: 'select', label: 'Status', required: true, showInline: true, order: 3, width: 4,
        options: [
          { value: 'pending', label: 'Pending' },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' },
          { value: 'fulfilled', label: 'Fulfilled' },
        ],
        permissions: { staff: 'r', pic_divisi: 'rw', kepala_kantor: 'rw', owner: 'rw' } },
      { name: 'requester_id', kind: 'fk', label: 'Requester', required: true, reference: { table: 'users', column: 'id', display: 'full_name' }, order: 4, width: 6 },
      { name: 'project_id', kind: 'fk', label: 'Project', reference: { table: 'projects', column: 'id', display: 'name' }, order: 5, width: 6 },
      { name: 'needed_by', kind: 'date', label: 'Dibutuhkan', order: 6, width: 4 },
      { name: 'approver_id', kind: 'fk', label: 'Approver', reference: { table: 'users', column: 'id', display: 'full_name' }, order: 7, width: 6 },
      { name: 'approved_at', kind: 'datetime', label: 'Approved At', order: 8, width: 6 },
      { name: 'description', kind: 'longtext', label: 'Deskripsi', order: 9, width: 12 },
      { name: 'notes', kind: 'longtext', label: 'Catatan', order: 10, width: 12 },
    ],
  },
  purchase_orders: {
    table: 'purchase_orders',
    label: 'PO',
    pluralLabel: 'Purchase Orders',
    primaryKey: 'id',
    apiBase: '/api/purchasing/purchase_orders',
    tabs: [
      { id: 'overview', label: 'Overview', fields: ['code', 'status', 'request_id', 'supplier_id', 'project_id', 'total_rupiah'] },
      { id: 'dates', label: 'Tanggal', fields: ['order_date', 'expected_date', 'received_date'] },
      { id: 'detail', label: 'Detail', fields: ['notes'] },
    ],
    fields: [
      { name: 'code', kind: 'text', label: 'Kode', showInline: true, order: 1, width: 4 },
      { name: 'status', kind: 'select', label: 'Status', required: true, showInline: true, order: 2, width: 4,
        options: [
          { value: 'draft', label: 'Draft' },
          { value: 'sent', label: 'Sent' },
          { value: 'received', label: 'Received' },
          { value: 'cancelled', label: 'Cancelled' },
        ],
        permissions: { staff: 'r', pic_divisi: 'rw', kepala_kantor: 'rw', owner: 'rw' } },
      { name: 'request_id', kind: 'fk', label: 'PR', reference: { table: 'purchase_requests', column: 'id', display: 'title' }, order: 3, width: 6 },
      { name: 'supplier_id', kind: 'fk', label: 'Supplier', reference: { table: 'suppliers', column: 'id', display: 'name' }, order: 4, width: 6 },
      { name: 'project_id', kind: 'fk', label: 'Project', reference: { table: 'projects', column: 'id', display: 'name' }, order: 5, width: 6 },
      { name: 'total_rupiah', kind: 'currency', label: 'Total', order: 6, width: 4,
        permissions: { staff: 'r', pic_divisi: 'rw', kepala_kantor: 'rw', owner: 'rw' } },
      { name: 'order_date', kind: 'date', label: 'Tanggal Order', order: 7, width: 4 },
      { name: 'expected_date', kind: 'date', label: 'Expected', order: 8, width: 4 },
      { name: 'received_date', kind: 'date', label: 'Received', order: 9, width: 4 },
      { name: 'notes', kind: 'longtext', label: 'Catatan', order: 10, width: 12 },
    ],
  },
  maintenance_tickets: {
    table: 'maintenance_tickets',
    label: 'Ticket',
    pluralLabel: 'Tickets',
    primaryKey: 'id',
    apiBase: '/api/maintenance/maintenance_tickets',
    tabs: [
      { id: 'overview', label: 'Overview', fields: ['code', 'title', 'status', 'priority', 'category', 'cost_rupiah'] },
      { id: 'assign', label: 'Penugasan', fields: ['reported_by_id', 'assigned_to_id', 'customer_id', 'project_id'] },
      { id: 'detail', label: 'Detail', fields: ['description', 'notes', 'reported_at', 'resolved_at'] },
    ],
    fields: [
      { name: 'code', kind: 'text', label: 'Kode', showInline: true, order: 1, width: 4 },
      { name: 'title', kind: 'text', required: true, label: 'Judul', showInline: true, order: 2, width: 8,
        permissions: { staff: 'rw', pic_divisi: 'rw', kepala_kantor: 'rw', owner: 'rw' } },
      { name: 'status', kind: 'select', label: 'Status', required: true, showInline: true, order: 3, width: 4,
        options: [
          { value: 'open', label: 'Open' },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'resolved', label: 'Resolved' },
          { value: 'closed', label: 'Closed' },
          { value: 'cancelled', label: 'Cancelled' },
        ],
        permissions: { staff: 'rw', pic_divisi: 'rw', kepala_kantor: 'rw', owner: 'rw' } },
      { name: 'priority', kind: 'select', label: 'Prioritas', showInline: true, order: 4, width: 4,
        options: [
          { value: 'low', label: 'Rendah' },
          { value: 'normal', label: 'Normal' },
          { value: 'high', label: 'Tinggi' },
          { value: 'urgent', label: 'Mendesak' },
        ],
        permissions: { staff: 'rw', pic_divisi: 'rw', kepala_kantor: 'rw', owner: 'rw' } },
      { name: 'category', kind: 'text', label: 'Kategori', showInline: true, order: 5, width: 4 },
      { name: 'cost_rupiah', kind: 'currency', label: 'Biaya', order: 6, width: 4,
        permissions: { staff: 'r', pic_divisi: 'rw', kepala_kantor: 'rw', owner: 'rw' } },
      { name: 'reported_by_id', kind: 'fk', label: 'Dilaporkan', reference: { table: 'users', column: 'id', display: 'full_name' }, order: 7, width: 6 },
      { name: 'assigned_to_id', kind: 'fk', label: 'Ditugaskan', reference: { table: 'users', column: 'id', display: 'full_name' }, order: 8, width: 6 },
      { name: 'customer_id', kind: 'fk', label: 'Customer', reference: { table: 'customers', column: 'id', display: 'name' }, order: 9, width: 6 },
      { name: 'project_id', kind: 'fk', label: 'Project', reference: { table: 'projects', column: 'id', display: 'name' }, order: 10, width: 6 },
      { name: 'house_unit_id', kind: 'fk', label: 'Unit Rumah', order: 11, width: 6 },
      { name: 'description', kind: 'longtext', label: 'Deskripsi', order: 12, width: 12 },
      { name: 'notes', kind: 'longtext', label: 'Catatan', order: 13, width: 12 },
      { name: 'reported_at', kind: 'datetime', label: 'Waktu Lapor', order: 14, width: 6 },
      { name: 'resolved_at', kind: 'datetime', label: 'Waktu Selesai', order: 15, width: 6 },
    ],
  },
  maintenance_logs: {
    table: 'maintenance_logs',
    label: 'Log',
    pluralLabel: 'Maintenance Logs',
    primaryKey: 'id',
    apiBase: '/api/maintenance/maintenance_logs',
    tabs: [
      { id: 'overview', label: 'Overview', fields: ['ticket_id', 'actor_id', 'action', 'from_status', 'to_status'] },
      { id: 'detail', label: 'Detail', fields: ['message', 'created_at'] },
    ],
    fields: [
      { name: 'ticket_id', kind: 'fk', label: 'Ticket', required: true, reference: { table: 'maintenance_tickets', column: 'id', display: 'title' }, order: 1, width: 6 },
      { name: 'actor_id', kind: 'fk', label: 'Actor', reference: { table: 'users', column: 'id', display: 'full_name' }, order: 2, width: 6 },
      { name: 'action', kind: 'text', label: 'Action', showInline: true, order: 3, width: 4 },
      { name: 'from_status', kind: 'text', label: 'From', showInline: true, order: 4, width: 4 },
      { name: 'to_status', kind: 'text', label: 'To', showInline: true, order: 5, width: 4 },
      { name: 'message', kind: 'longtext', label: 'Pesan', order: 6, width: 12 },
      { name: 'created_at', kind: 'datetime', label: 'Waktu', order: 7, width: 6 },
    ],
  },
  approvals: {
    table: 'approvals',
    label: 'Approval',
    pluralLabel: 'Approvals',
    primaryKey: 'id',
    apiBase: '/api/approvals',
    tabs: [
      { id: 'overview', label: 'Overview', fields: ['title', 'kind', 'status', 'amount', 'requester_id', 'approver_id'] },
      { id: 'decision', label: 'Decision', fields: ['decided_at', 'decision_note'] },
      { id: 'detail', label: 'Detail', fields: ['description'] },
    ],
    fields: [
      { name: 'title', kind: 'text', required: true, label: 'Judul', showInline: true, order: 1, width: 8,
        permissions: { staff: 'rw', pic_divisi: 'rw', kepala_kantor: 'rw', owner: 'rw' } },
      { name: 'kind', kind: 'select', label: 'Jenis', required: true, showInline: true, order: 2, width: 4,
        options: [
          { value: 'spending', label: 'Spending' },
          { value: 'contract', label: 'Kontrak' },
          { value: 'leave', label: 'Cuti' },
          { value: 'target', label: 'Target' },
          { value: 'other', label: 'Lainnya' },
        ],
        permissions: { staff: 'r', pic_divisi: 'rw', kepala_kantor: 'rw', owner: 'rw' } },
      { name: 'status', kind: 'select', label: 'Status', required: true, showInline: true, order: 3, width: 4,
        options: [
          { value: 'pending', label: 'Pending' },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' },
        ],
        permissions: { staff: 'r', pic_divisi: 'rw', kepala_kantor: 'rw', owner: 'rw' } },
      { name: 'amount', kind: 'currency', label: 'Jumlah', order: 4, width: 4,
        permissions: { staff: 'r', pic_divisi: 'rw', kepala_kantor: 'rw', owner: 'rw' } },
      { name: 'requester_id', kind: 'fk', label: 'Requester', required: true, reference: { table: 'users', column: 'id', display: 'full_name' }, order: 5, width: 6 },
      { name: 'approver_id', kind: 'fk', label: 'Approver', reference: { table: 'users', column: 'id', display: 'full_name' }, order: 6, width: 6 },
      { name: 'decided_at', kind: 'datetime', label: 'Waktu Keputusan', order: 7, width: 6 },
      { name: 'decision_note', kind: 'longtext', label: 'Catatan Keputusan', order: 8, width: 12 },
      { name: 'description', kind: 'longtext', label: 'Deskripsi', order: 9, width: 12 },
    ],
  },
  divisions: {
    table: 'divisions',
    label: 'Divisi',
    pluralLabel: 'Divisions',
    primaryKey: 'id',
    apiBase: '/api/divisions',
    tabs: [
      { id: 'overview', label: 'Overview', fields: ['code', 'name', 'is_active', 'sort_order'] },
      { id: 'detail', label: 'Detail', fields: ['description', 'parent_id', 'head_user_id'] },
    ],
    fields: [
      { name: 'code', kind: 'text', label: 'Kode', showInline: true, order: 1, width: 4,
        permissions: { pic_divisi: 'rw', kepala_kantor: 'rw', owner: 'rw' } },
      { name: 'name', kind: 'text', required: true, label: 'Nama', showInline: true, order: 2, width: 8,
        permissions: { pic_divisi: 'rw', kepala_kantor: 'rw', owner: 'rw' } },
      { name: 'description', kind: 'longtext', label: 'Deskripsi', order: 3, width: 12 },
      { name: 'is_active', kind: 'boolean', label: 'Aktif', showInline: true, order: 4, width: 4,
        permissions: { kepala_kantor: 'rw', owner: 'rw' } },
      { name: 'sort_order', kind: 'integer', label: 'Sort Order', order: 5, width: 4,
        permissions: { kepala_kantor: 'rw', owner: 'rw' } },
      { name: 'parent_id', kind: 'fk', label: 'Parent', reference: { table: 'divisions', column: 'id', display: 'name' }, order: 6, width: 6 },
      { name: 'head_user_id', kind: 'fk', label: 'Kepala Divisi', reference: { table: 'users', column: 'id', display: 'full_name' }, order: 7, width: 6 },
    ],
  }

}

export function getSchema(table: string): TableSchema | null {
  return SCHEMAS[table] || null
}

/**
 * Check if a field can be read/written by the given role.
 * Returns: { readable, writable }
 */
export function checkFieldAccess(
  field: FieldSchema,
  role: string
): { readable: boolean; writable: boolean } {
  const explicit = field.permissions?.[role]
  if (explicit === 'none') return { readable: false, writable: false }
  if (explicit === 'r') return { readable: true, writable: false }
  if (explicit === 'rw') return { readable: true, writable: true }

  // Default: owner + kepala_kantor have full access, others read-only
  if (role === 'owner' || role === 'kepala_kantor') {
    return { readable: true, writable: true }
  }
  return { readable: true, writable: false }
}

/**
 * Filter a list of fields by current user's read access.
 */
export function filterReadableFields(
  fields: FieldSchema[],
  role: string
): FieldSchema[] {
  return fields.filter((f) => checkFieldAccess(f, role).readable)
}

/**
 * Filter a list of fields by current user's write access (editable in form).
 */
export function filterWritableFields(
  fields: FieldSchema[],
  role: string
): FieldSchema[] {
  return fields.filter((f) => checkFieldAccess(f, role).writable)
}
