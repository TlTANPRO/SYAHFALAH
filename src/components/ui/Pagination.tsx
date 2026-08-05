// components/ui/Pagination.tsx
// Server-friendly pagination control. Works with server-side pagination
// (Supabase .range()) OR client-side with useState if data is already in memory.

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({ page, pageSize, total, onPageChange, className }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  const pages = generatePageList(page, totalPages)

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-3',
        className
      )}
    >
      <div className="text-xs text-[var(--color-text-tertiary)]">
        {total === 0 ? (
          'Tidak ada data'
        ) : (
          <>
            <span className="font-medium text-[var(--color-text-secondary)]">{start}–{end}</span>
            {' '}
            dari <span className="font-medium text-[var(--color-text-secondary)]">{total}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-1">
        <PageBtn
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
          aria-label="Halaman pertama"
        >
          <ChevronsLeft className="h-4 w-4" />
        </PageBtn>
        <PageBtn
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft className="h-4 w-4" />
        </PageBtn>

        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`g${i}`} className="px-2 text-xs text-[var(--color-text-tertiary)]">…</span>
          ) : (
            <PageBtn
              key={p}
              active={p === page}
              onClick={() => onPageChange(p)}
              aria-label={`Halaman ${p}`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </PageBtn>
          )
        )}

        <PageBtn
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Halaman berikutnya"
        >
          <ChevronRight className="h-4 w-4" />
        </PageBtn>
        <PageBtn
          disabled={page >= totalPages}
          onClick={() => onPageChange(totalPages)}
          aria-label="Halaman terakhir"
        >
          <ChevronsRight className="h-4 w-4" />
        </PageBtn>
      </div>
    </nav>
  )
}

interface PageBtnProps {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  active?: boolean
  ['aria-label']: string
  ['aria-current']?: 'page'
}

function PageBtn({ children, onClick, disabled, active, ...aria }: PageBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      {...aria}
      className={cn(
        'inline-flex items-center justify-center min-w-[44px] min-h-[44px] px-3 rounded-md text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]',
        active
          ? 'bg-[var(--color-brand-500)] text-[var(--color-primary-foreground)]'
          : 'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]',
        disabled && 'opacity-40 pointer-events-none'
      )}
    >
      {children}
    </button>
  )
}

function generatePageList(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const out: (number | '…')[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  if (start > 2) out.push('…')
  for (let i = start; i <= end; i++) out.push(i)
  if (end < total - 1) out.push('…')
  out.push(total)
  return out
}
