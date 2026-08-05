// components/ui/toast-container.tsx
// Stacked toast container dengan aria-live announcement. Reads from
// uiStore (state-level toasts) and renders them as a stack in the
// bottom-right corner. Each toast fade-in / fade-out + dismiss on click.

'use client'

import { CheckCircle2, AlertCircle, Info, X, AlertTriangle, XCircle } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'

const ICON_BY_TYPE = {
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
  destructive: XCircle,
  default: Info,
} as const

const COLOR_BY_TYPE = {
  success: 'border-[var(--color-success)]/40 bg-[var(--color-success)]/10',
  warning: 'border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10',
  info: 'border-[var(--color-brand-500)]/40 bg-[var(--color-brand-500)]/10',
  destructive: 'border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10',
  default: 'border-[var(--color-border-default)] bg-[var(--color-surface-1)]',
} as const

const ICON_COLOR = {
  success: 'text-[var(--color-success)]',
  warning: 'text-[var(--color-warning)]',
  info: 'text-[var(--color-brand-500)]',
  destructive: 'text-[var(--color-danger)]',
  default: 'text-[var(--color-text-tertiary)]',
} as const

export function ToastContainer() {
  const toasts = useUIStore(s => s.toasts)
  const removeToast = useUIStore(s => s.removeToast)

  if (toasts.length === 0) return null

  return (
    <>
      {/* a11y: aria-live region announces toast contents to screen readers */}
      <div
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        aria-atomic="false"
        className="sr-only"
      >
        {toasts.map(t => `${t.title}${t.message ? ': ' + t.message : ''}`).join('\n')}
      </div>

      <div
        role="region"
        aria-label="Toasts"
        className="fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map(t => {
          const Icon = ICON_BY_TYPE[t.type] ?? ICON_BY_TYPE.default
          const bg = COLOR_BY_TYPE[t.type] ?? COLOR_BY_TYPE.default
          const fg = ICON_COLOR[t.type] ?? ICON_COLOR.default
          return (
            <div
              key={t.id}
              role="alert"
              className={`pointer-events-auto rounded-lg border ${bg} backdrop-blur-md px-4 py-3 shadow-lg motion-safe:animate-in motion-safe:slide-in-from-right-4 motion-safe:duration-200`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`h-4 w-4 ${fg} flex-shrink-0 mt-0.5`} aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">
                    {t.title}
                  </p>
                  {t.message && (
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 break-words">
                      {t.message}
                    </p>
                  )}
                  {t.action && (
                    <button
                      type="button"
                      onClick={() => {
                        t.action?.onClick()
                        removeToast(t.id)
                      }}
                      className="mt-2 text-xs font-medium text-[var(--color-brand-500)] hover:underline"
                    >
                      {t.action.label}
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(t.id)}
                  className="p-1 rounded text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] transition-colors flex-shrink-0"
                  aria-label="Dismiss notification"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
