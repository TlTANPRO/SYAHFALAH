// components/ui/error-state.tsx
// Graceful error state with retry CTA.
// Used as error.tsx boundary or inside pages that fail to fetch.

'use client'

import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ErrorStateProps {
  /** Title — kept short. */
  title?: string
  /** Detailed explanation. */
  description?: string
  /** Reference to the error, e.g. an error code. */
  error?: string
  /** Optional callback overriding default retry. */
  onRetry?: () => void
  /** Show back button. */
  showBack?: boolean
  /** Compact mode. */
  compact?: boolean
}

export function ErrorState({
  title = 'Sesuatu tidak beres',
  description = 'Gagal memuat data. Coba lagi atau kembali ke halaman sebelumnya.',
  error,
  onRetry,
  showBack = true,
  compact = false,
}: ErrorStateProps) {
  const router = useRouter()

  return (
    <div
      className={
        compact
          ? 'rounded-xl border border-[var(--color-danger)]/40 bg-[var(--color-surface-1)] p-6 flex items-start gap-4'
          : 'hero flex items-start gap-4'
      }
      role="alert"
      aria-live="polite"
    >
      <div
        className="h-10 w-10 rounded-md bg-[var(--color-danger)]/10 flex items-center justify-center shrink-0 text-[var(--color-danger)]"
        aria-hidden="true"
      >
        <AlertTriangle className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <p className="eyebrow text-[var(--color-danger)]">Error</p>
        <p className="font-heading text-base font-semibold text-[var(--color-text-primary)]">
          {title}
        </p>
        <p className="text-sm text-[var(--color-text-secondary)] max-w-md">{description}</p>
        {error && (
          <p className="text-xs text-[var(--color-text-tertiary)] font-mono bg-[var(--color-surface-2)] px-2 py-1 rounded inline-block mt-1">
            {error}
          </p>
        )}
        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={onRetry ?? (() => router.refresh())}
            className="btn"
            data-variant="outline"
            data-size="sm"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Coba lagi
          </button>
          {showBack && (
            <button
              onClick={() => router.back()}
              className="btn"
              data-variant="ghost"
              data-size="sm"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Kembali
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
