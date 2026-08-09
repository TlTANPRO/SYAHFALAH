// components/ui/field-form.tsx
// Auto-form from TableSchema. Renders fields based on FieldSchema.kind.
// Used inside DetailSheet for full edit mode, also used standalone.

'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { Input } from './input'
import { Button } from './button'
import { Combobox, type ComboboxOption } from './combobox'
import { DatePicker } from './date-picker'
import { cn } from '@/lib/utils'
import { getSchema, type FieldSchema, type TableSchema } from '@/lib/schema/registry'

interface FieldFormProps {
  /** Table name — looks up schema */
  table: string
  /** Initial values */
  values: Record<string, unknown>
  /** Submit handler. Return the saved row. */
  onSubmit: (values: Record<string, unknown>) => Promise<void>
  /** Submit button label */
  submitLabel?: string
  /** Cancel callback (renders Cancel button) */
  onCancel?: () => void
  /** Disable form during pending submit */
  loading?: boolean
  /** Field overrides (e.g. hide some fields) */
  fieldFilter?: (field: FieldSchema) => boolean
  /** Form mode: 'create' or 'edit' */
  mode?: 'create' | 'edit'
  /** ClassName for the form */
  className?: string
}

export function FieldForm({
  table,
  values: initialValues,
  onSubmit,
  submitLabel = 'Simpan',
  onCancel,
  loading = false,
  fieldFilter,
  mode = 'edit',
  className,
}: FieldFormProps) {
  const schema = getSchema(table)
  const [values, setValues] = React.useState<Record<string, unknown>>(initialValues)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    setValues(initialValues)
  }, [initialValues])

  if (!schema) {
    return <div className="text-sm text-[var(--color-danger)]">Schema untuk "{table}" tidak ditemukan.</div>
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Validate required fields
    const newErrors: Record<string, string> = {}
    for (const field of schema.fields) {
      if (field.required && (values[field.name] === null || values[field.name] === undefined || values[field.name] === '')) {
        newErrors[field.name] = `${field.label} wajib diisi`
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})
    await onSubmit(values)
  }

  const setValue = (name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const filteredFields = fieldFilter
    ? schema.fields.filter(fieldFilter)
    : schema.fields

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      <div className="grid grid-cols-12 gap-4">
        {filteredFields.map((field) => {
          const colSpan = field.width === 12 ? 'col-span-12' : field.width === 6 ? 'col-span-12 md:col-span-6' : field.width === 4 ? 'col-span-12 md:col-span-4' : field.width === 3 ? 'col-span-6 md:col-span-3' : 'col-span-12'
          return (
            <div key={field.name} className={colSpan}>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                {field.label}
                {field.required && <span className="text-[var(--color-danger)] ml-0.5">*</span>}
              </label>
              <FieldRenderer
                field={field}
                value={values[field.name]}
                onChange={(v) => setValue(field.name, v)}
                error={errors[field.name]}
              />
              {field.help && !errors[field.name] && (
                <p className="text-xs text-[var(--color-text-tertiary)] mt-1">{field.help}</p>
              )}
              {errors[field.name] && (
                <p className="text-xs text-[var(--color-danger)] mt-1" role="alert">{errors[field.name]}</p>
              )}
            </div>
          )
        })}
      </div>

      {(onCancel || true) && (
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border-default)]">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
              Batal
            </Button>
          )}
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
            {submitLabel}
          </Button>
        </div>
      )}
    </form>
  )
}

// ─── Individual field renderers ──────────────────────────────────────────────

interface FieldRendererProps {
  field: FieldSchema
  value: unknown
  onChange: (value: unknown) => void
  error?: string
}

function FieldRenderer({ field, value, onChange, error }: FieldRendererProps) {
  switch (field.kind) {
    case 'text':
    case 'email':
    case 'url':
    case 'phone':
      return (
        <Input
          type={field.kind === 'email' ? 'email' : field.kind === 'url' ? 'url' : field.kind === 'phone' ? 'tel' : 'text'}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          aria-label={field.label}
          aria-invalid={!!error}
        />
      )
    case 'longtext':
      return (
        <textarea
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          aria-label={field.label}
          aria-invalid={!!error}
          className={cn(
            'w-full px-3 py-2 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-2)] text-[var(--color-text-primary)] text-sm resize-y',
            'focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent',
            error && 'border-[var(--color-danger)]'
          )}
        />
      )
    case 'number':
    case 'integer':
      return (
        <Input
          type="number"
          step={field.kind === 'integer' ? '1' : 'any'}
          value={value !== null && value !== undefined ? String(value) : ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          aria-label={field.label}
          aria-invalid={!!error}
        />
      )
    case 'currency':
      return (
        <Input
          type="number"
          step="1000"
          value={value !== null && value !== undefined ? String(value) : ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          aria-label={field.label}
          placeholder="0"
        />
      )
    case 'date':
    case 'datetime':
      return (
        <DatePicker
          value={value as string | null | undefined}
          onChange={onChange}
          includeTime={field.kind === 'datetime'}
          aria-label={field.label}
        />
      )
    case 'select':
      return (
        <Combobox
          value={value as string | null | undefined}
          onChange={(v) => onChange(v)}
          options={field.options ?? []}
          searchPlaceholder={`Cari ${field.label.toLowerCase()}...`}
          aria-label={field.label}
          clearable={!field.required}
        />
      )
    case 'fk':
      return <FKPicker field={field} value={value as string | null | undefined} onChange={onChange} />
    case 'boolean':
      return (
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            aria-label={field.label}
            className="h-4 w-4 rounded border-[var(--color-border-default)] accent-[var(--color-brand-500)]"
          />
          <span className="text-sm text-[var(--color-text-tertiary)]">{value ? 'Ya' : 'Tidak'}</span>
        </label>
      )
    case 'array':
      return (
        <Input
          value={Array.isArray(value) ? value.join(', ') : ''}
          onChange={(e) => {
            const arr = e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
            onChange(arr)
          }}
          placeholder="Pisahkan dengan koma"
          aria-label={field.label}
        />
      )
    default:
      return (
        <Input
          value={value !== null && value !== undefined ? String(value) : ''}
          onChange={(e) => onChange(e.target.value)}
          aria-label={field.label}
        />
      )
  }
}

// FK picker that lazy-fetches options
function FKPicker({ field, value, onChange }: { field: FieldSchema; value: string | number | null | undefined; onChange: (v: string | number | null) => void }) {
  const [options, setOptions] = React.useState<ComboboxOption[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!field.reference) return
    let cancelled = false
    const fetchOptions = async () => {
      try {
        const url = field.reference!.endpoint || `/api/${field.reference!.table}`
        const res = await fetch(`${url}?limit=200&select=${field.reference!.column},${field.reference!.display}`)
        if (!res.ok) throw new Error(`Failed to fetch ${field.reference!.table}`)
        const data = await res.json()
        if (cancelled) return
        const opts = (data.data || data || []).map((row: any) => ({
          value: row[field.reference!.column],
          label: row[field.reference!.display] || '—',
        }))
        setOptions(opts)
      } catch {
        // Fallback: show UUID
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchOptions()
    return () => {
      cancelled = true
    }
  }, [field.reference])

  return (
    <Combobox
      value={value}
      onChange={onChange}
      options={options}
      loading={loading}
      searchPlaceholder={`Cari ${field.label.toLowerCase()}...`}
      aria-label={field.label}
      clearable={!field.required}
    />
  )
}
