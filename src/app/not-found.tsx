// app/not-found.tsx — 404 page (root-level only, full app shell renders inside).
// Renders for non-existent routes. Server component.

import Link from 'next/link'
import { FileSearch, Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <FileSearch className="mx-auto h-12 w-12 text-[var(--color-text-tertiary)]" />
        <p className="text-6xl font-heading font-bold tabular-nums text-[var(--color-brand-500)] mt-4">404</p>
        <h1 className="display-lg mt-2">Halaman Tidak Ditemukan</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-2">
          Tautan ini tidak aktif atau halaman sudah dipindahkan. Coba kembali ke beranda atau dashboard pribadi.
        </p>
        <div className="flex items-center justify-center gap-3 mt-6">
          <Link href="/"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-[var(--color-border-default)] hover:border-[var(--color-brand-500)] text-sm font-medium">
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Link>
          <Link href="/personal/tasks"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-[var(--color-brand-500)] text-white text-sm font-medium hover:bg-[var(--color-brand-600)]">
            <Home className="h-4 w-4" /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
