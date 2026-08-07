// src/lib/l10n.ts
// Centralised label map — Bahasa Indonesia first, English fallback via `t(label)`.
// Adding new keys here avoids hard-coded English strings in JSX.

export type Label = keyof typeof ID

export const ID = {
  'All': 'Semua',
  'Loading': 'Memuat…',
  'No data': 'Belum ada data',
  'Search': 'Cari',
  'Create': 'Buat',
  'Edit': 'Ubah',
  'Delete': 'Hapus',
  'Save': 'Simpan',
  'Submit': 'Kirim',
  'Cancel': 'Batal',
  'Confirm': 'Konfirmasi',
  'Update': 'Perbarui',
  'Open': 'Buka',
  'Close': 'Tutup',
  'Settings': 'Pengaturan',
  'Profile': 'Profil',
  'Dashboard': 'Dashboard',
  'Pending': 'Menunggu',
  'Completed': 'Selesai',
  'In Progress': 'Sedang Berjalan',
  'Overdue': 'Terlambat',
  'New': 'Baru',
  'Action': 'Aksi',
  'Actions': 'Aksi-aksi',
  'Back': 'Kembali',
  'Next': 'Lanjut',
  'Previous': 'Sebelumnya',
  'Filter': 'Saring',
  'Clear': 'Reset',
  'Reset': 'Atur Ulang',
  'Optional': 'opsional',
  'Required': 'wajib',
  'Yes': 'Ya',
  'No': 'Tidak',
  'On': 'Aktif',
  'Off': 'Nonaktif',
} as const

/**
 * Translate a hard-coded English label to Bahasa Indonesia.
 * Falls back to the input string if there's no translation.
 *
 * @example t('Create') === 'Buat'
 */
export function t(label: string): string {
  const mapped = (ID as Record<string, string>)[label]
  return mapped ?? label
}
