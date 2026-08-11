// lib/empty-state-copy.ts
// Per-entity empty state messages (Indonesian + actionable).
// 3 archetypes: no-data (fresh), search-empty (no results), error (failed query).

import type { EmptyStateCopy } from '@/types/empty-state'

export const EMPTY_STATE_COPY: Record<string, EmptyStateCopy> = {
  // Marketing
  leads: {
    noData: {
      eyebrow: 'Marketing',
      title: 'Belum ada leads',
      description: 'Catat prospek pertama Anda dari Instagram, Facebook, TikTok, atau walk-in. Data lead disimpan untuk pipeline closing.',
      action: { label: 'Tambah Lead', shortcut: 'Cmd+Shift+K → L' },
    },
    searchEmpty: {
      title: 'Tidak ada leads yang cocok',
      description: 'Coba kata kunci lain atau hapus filter untuk melihat semua prospek.',
    },
  },
  customers: {
    noData: {
      eyebrow: 'Marketing',
      title: 'Belum ada customer',
      description: 'Customer adalah leads yang sudah closing atau dalam proses pembelian. Tambahkan customer pertama Anda.',
      action: { label: 'Tambah Customer', shortcut: 'Cmd+Shift+K' },
    },
    searchEmpty: {
      title: 'Tidak ada customer yang cocok',
    },
  },
  projects: {
    noData: {
      eyebrow: 'Proyek',
      title: 'Belum ada proyek',
      description: 'Daftarkan proyek konstruksi pertama Anda. Lacak progress unit, budget, dan timeline di sini.',
      action: { label: 'Tambah Proyek', shortcut: 'Cmd+Shift+K → P' },
    },
    searchEmpty: {
      title: 'Tidak ada proyek yang cocok',
    },
  },
  tasks: {
    noData: {
      eyebrow: 'Personal',
      title: 'Belum ada tugas',
      description: 'Tugas harian Anda muncul di sini. Buat tugas pertama dan mulai produktif.',
      action: { label: 'Tambah Tugas', shortcut: 'Cmd+Shift+K → T' },
    },
    searchEmpty: {
      title: 'Tidak ada tugas yang cocok',
    },
  },
  sow_tasks: {
    noData: {
      eyebrow: 'SOW',
      title: 'Belum ada SOW',
      description: 'Scope of Work (SOW) mendefinisikan detail pekerjaan. Tambahkan SOW untuk setiap proyek.',
      action: { label: 'Tambah SOW', shortcut: 'Cmd+Shift+K → S' },
    },
    searchEmpty: {
      title: 'Tidak ada SOW yang cocok',
    },
  },
  approvals: {
    noData: {
      eyebrow: 'Approval',
      title: 'Belum ada approval',
      description: 'Permintaan approval muncul di sini. Pak Ardian akan review dan approve via WA atau dashboard.',
    },
    searchEmpty: {
      title: 'Tidak ada approval yang cocok',
    },
  },
  maintenance_tickets: {
    noData: {
      eyebrow: 'Maintenance',
      title: 'Tidak ada tiket maintenance',
      description: 'Semua unit rumah dalam kondisi baik. Jika ada kerusakan, catat tiket di sini.',
      action: { label: 'Tambah Tiket', shortcut: 'Cmd+Shift+K' },
    },
    searchEmpty: {
      title: 'Tidak ada tiket yang cocok',
    },
  },
  purchase_requests: {
    noData: {
      eyebrow: 'Purchasing',
      title: 'Belum ada purchase request',
      description: 'PR (Purchase Request) adalah permintaan barang/jasa. Ajukan PR untuk supplier tertentu.',
    },
    searchEmpty: {
      title: 'Tidak ada PR yang cocok',
    },
  },
  purchase_orders: {
    noData: {
      eyebrow: 'Purchasing',
      title: 'Belum ada PO',
      description: 'PO (Purchase Order) dibuat setelah PR disetujui. Lacak status PO di sini.',
    },
    searchEmpty: {
      title: 'Tidak ada PO yang cocok',
    },
  },
  suppliers: {
    noData: {
      eyebrow: 'Purchasing',
      title: 'Belum ada supplier',
      description: 'Tambahkan supplier material, kontraktor, atau vendor jasa. Data ini digunakan untuk PR/PO.',
      action: { label: 'Tambah Supplier' },
    },
    searchEmpty: {
      title: 'Tidak ada supplier yang cocok',
    },
  },
  materials: {
    noData: {
      eyebrow: 'Purchasing',
      title: 'Belum ada material',
      description: 'Daftar material konstruksi dan inventaris. Track stok dan harga di sini.',
      action: { label: 'Tambah Material' },
    },
    searchEmpty: {
      title: 'Tidak ada material yang cocok',
    },
  },
  attendance_logs: {
    noData: {
      eyebrow: 'Kehadiran',
      title: 'Belum ada catatan absensi',
      description: 'Catatan absensi akan muncul setelah Anda check-in hari ini.',
    },
    searchEmpty: {
      title: 'Tidak ada catatan absensi pada periode ini',
    },
  },
  leave_requests: {
    noData: {
      eyebrow: 'Cuti',
      title: 'Belum ada permintaan cuti',
      description: 'Ajukan cuti melalui form di sini. Atasan akan menerima notifikasi.',
      action: { label: 'Ajukan Cuti' },
    },
    searchEmpty: {
      title: 'Tidak ada cuti yang cocok',
    },
  },
  documents: {
    noData: {
      eyebrow: 'Dokumen',
      title: 'Belum ada dokumen',
      description: 'Upload SOP, kontrak, laporan, atau template. Dokumen tersimpan di sini.',
      action: { label: 'Upload Dokumen' },
    },
    searchEmpty: {
      title: 'Tidak ada dokumen yang cocok',
    },
  },
  comments: {
    noData: {
      title: 'Belum ada komentar',
      description: 'Tambahkan komentar untuk diskusi atau catatan. Mention user dengan @nama.',
    },
    searchEmpty: {
      title: 'Tidak ada komentar yang cocok',
    },
  },
  kpi_targets: {
    noData: {
      eyebrow: 'KPI',
      title: 'Belum ada target KPI',
      description: 'Target KPI personal/divisi/perusahaan. Track progress bulanan dan tahunan di sini.',
    },
    searchEmpty: {
      title: 'Tidak ada KPI yang cocok',
    },
  },
  // Error fallback
  default: {
    error: {
      title: 'Terjadi kesalahan',
      description: 'Gagal memuat data. Coba refresh halaman atau hubungi admin jika masalah berlanjut.',
    },
  },
}

export function getEmptyStateCopy(entity: string, variant: 'noData' | 'searchEmpty' | 'error' = 'noData') {
  const e = EMPTY_STATE_COPY[entity] ?? EMPTY_STATE_COPY.default
  if (variant === 'error') {
    return e.error ?? EMPTY_STATE_COPY.default.error
  }
  return variant === 'searchEmpty'
    ? (e.searchEmpty ?? { title: 'Tidak ada hasil' })
    : e.noData ?? { title: 'Belum ada data' }
}