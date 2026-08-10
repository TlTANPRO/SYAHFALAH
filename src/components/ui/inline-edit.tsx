// components/ui/inline-edit.tsx
// Universal click-to-edit field. Click on text → becomes input.
// Save on Enter / blur, cancel on Escape. Optimistic + rollback.
// Renders: span (idle) → input/select (editing) → saving spinner → span.

'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from './input'

export type InlineEditType = 'text' | 'number' | 'date' | 'textarea' | 'select'

export interface InlineEditProps {
  /** Current value (controlled) */
  value: string | number | null | undefined
  /** Called when user saves a new value */
  onSave: (newValue: string | number) => Promise<void> | void
  /** Field type for input rendering */
  type?: InlineEditType
  /** For select type: available options */
  options?: Array<{ value: string | number; label: string }>
  /** Validation function — return error message or null */
  validate?: (value: string | number) => string | null
  /** Placeholder text when empty */
  placeholder?: string
  /** Disabled state */
  disabled?: boolean
  /** Show read-only mode (no edit affordance) */
  readOnly?: boolean
  /** Display formatter for the value */
  format?: (value: string | number) => React.ReactNode
  /** aria-label */
  'aria-label'?: string
  /** Class for the trigger span */
  className?: string
  /** Class for the input field */
  inputClassName?: string
  /** Empty placeholder */
  emptyText?: string
  /** Auto-save on blur (default true) */
  autoSave?: boolean
}

export function InlineEdit({
  value,
  onSave,
  type = 'text',
  options,
  validate,
  placeholder,
  disabled = false,
  readOnly = false,
  format,
  'aria-label': ariaLabel,
  className,
  inputClassName,
  emptyText = '—',
  autoSave = true,
}: InlineEditProps) {
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState<string | number>(
    value ?? (type === 'number' ? 0 : '')
  )
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      if (type === 'text') inputRef.current.select()
    }
  }, [editing, type])

  React.useEffect(() => {
    if (!editing) setDraft(value ?? (type === 'number' ? 0 : ''))
  }, [value, editing, type])

  const startEdit = () => {
    if (disabled || readOnly || saving) return
    setEditing(true)
    setError(null)
  }

  const cancel = () => {
    setEditing(false)
    setDraft(value ?? (type === 'number' ? 0 : ''))
    setError(null)
  }

  const save = async () => {
    if (saving) return
    if (String(draft) === String(value)) {
      setEditing(false)
      return
    }
    if (validate) {
      const err = validate(draft)
      if (err) {
        setError(err)
        return
      }
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(draft)
      setEditing(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal menyimpan'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      save()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
    }
  }

  const displayValue = format
    ? format(value as string | number)
    : value === null || value === undefined || value === ''
      ? emptyText
      : String(value)

  // Read-only or disabled display
  if (readOnly || (disabled && !editing)) {
    return (
      <>
        <span
          className={cn(
            'text-sm',
            !value && 'text-[var(--color-text-tertiary)]',
            className
          )}
          aria-label={ariaLabel}
        >
          {displayValue}
        </span>
        {/* aria-live region for screen reader announcements */}
        <span className="sr-only" role="status" aria-live="polite">
          {saving ? 'Menyimpan...' : error ? `Gagal menyimpan: ${error}` : ''}
        </span>
      </>
    )
  }

  if (editing) {
    return (
      <span className="inline-flex flex-col gap-1">
        {type === 'select' && options ? (
          <select
            value={String(draft)}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={autoSave ? save : undefined}
            onKeyDown={onKeyDown}
            disabled={saving}
            className={cn(
              'px-2 py-1 rounded border border-[var(--color-brand-500)] bg-[var(--color-surface-2)] text-[var(--color-text-primary)] text-sm',
              'focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]',
              inputClassName
            )}
            aria-label={ariaLabel}
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : type === 'textarea' ? (
          <textarea
            value={String(draft)}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={autoSave ? save : undefined}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                save()
              } else if (e.key === 'Escape') {
                e.preventDefault()
                cancel()
              }
            }}
            disabled={saving}
            rows={3}
            className={cn(
              'px-2 py-1 rounded border border-[var(--color-brand-500)] bg-[var(--color-surface-2)] text-[var(--color-text-primary)] text-sm resize-y',
              'focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]',
              inputClassName
            )}
            aria-label={ariaLabel}
          />
        ) : (
          <Input
            ref={inputRef as any}
            type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
            value={String(draft)}
            onChange={(e) =>
              setDraft(type === 'number' ? Number(e.target.value) : e.target.value)
            }
            onBlur={autoSave ? save : undefined}
            onKeyDown={onKeyDown}
            disabled={saving}
            placeholder={placeholder}
            className={cn(
              'h-8 text-sm',
              'border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]',
              inputClassName
            )}
            aria-label={ariaLabel}
          />
        )}
        {saving && (
          <span className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)]">
            <Loader2 className="h-3 w-3 animate-spin" /> Menyimpan…
          </span>
        )}
        {error && (
          <span className="text-xs text-[var(--color-danger)]" role="alert">
            {error}
          </span>
        )}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      disabled={disabled || saving}
      className={cn(
        'inline-flex items-center gap-1 text-left rounded px-1 -mx-1',
        'hover:bg-[var(--color-surface-2)] hover:ring-1 hover:ring-[var(--color-border-default)]',
        'transition-colors cursor-text',
        'disabled:cursor-not-allowed disabled:opacity-50',
        !value && 'text-[var(--color-text-tertiary)]',
        className
      )}
      aria-label={`Edit: ${ariaLabel || placeholder || 'field'}`}
      title="Klik untuk edit"
    >
      {displayValue}
    </button>
  )
}
