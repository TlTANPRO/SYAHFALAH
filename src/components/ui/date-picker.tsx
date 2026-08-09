// components/ui/date-picker.tsx
// Calendar dropdown for date / datetime inputs.
// Uses react-day-picker (already in deps) + shadcn-style trigger button.

'use client'

import * as React from 'react'
import { format, parseISO } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'
import { Calendar as CalendarIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Popover, PopoverTrigger, PopoverContent } from './popover'

interface DatePickerProps {
  value: string | null | undefined
  onChange: (value: string | null) => void
  placeholder?: string
  includeTime?: boolean
  disabled?: boolean
  className?: string
  'aria-label'?: string
  minDate?: Date
  maxDate?: Date
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pilih tanggal',
  includeTime = false,
  disabled = false,
  className,
  'aria-label': ariaLabel,
  minDate,
  maxDate,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const date = value ? parseISO(value) : undefined

  const display = date
    ? format(date, includeTime ? 'd MMM yyyy, HH:mm' : 'd MMM yyyy', { locale: idLocale })
    : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(
            'w-full justify-between gap-2 font-normal',
            !date && 'text-[var(--color-text-tertiary)]',
            className
          )}
        >
          <span className="flex items-center gap-2 truncate">
            <CalendarIcon className="h-3 w-3 opacity-70" />
            <span className="truncate">{display}</span>
          </span>
          {date && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Bersihkan"
              onClick={(e) => {
                e.stopPropagation()
                onChange(null)
              }}
              className="opacity-60 hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <DayPicker
          mode="single"
          selected={date}
          onSelect={(d) => {
            if (!d) {
              onChange(null)
              return
            }
            if (includeTime && value) {
              // Preserve existing time
              const existing = parseISO(value)
              d.setHours(existing.getHours(), existing.getMinutes())
            }
            onChange(d.toISOString())
            if (!includeTime) setOpen(false)
          }}
          disabled={(d) => {
            if (minDate && d < minDate) return true
            if (maxDate && d > maxDate) return true
            return false
          }}
          locale={idLocale}
          classNames={{
            today: 'font-bold text-[var(--color-brand-500)]',
            selected: 'bg-[var(--color-brand-500)] text-[var(--color-primary-foreground)]',
            chevron: 'fill-[var(--color-text-tertiary)]',
          }}
        />
        {includeTime && date && (
          <div className="border-t border-[var(--color-border-default)] p-3 flex items-center gap-2">
            <input
              type="time"
              value={format(date, 'HH:mm')}
              onChange={(e) => {
                const [h, m] = e.target.value.split(':').map(Number)
                const d = new Date(date)
                d.setHours(h, m)
                onChange(d.toISOString())
              }}
              className="px-2 py-1 rounded border border-[var(--color-border-default)] bg-[var(--color-surface-2)] text-[var(--color-text-primary)] text-sm"
              aria-label="Time"
            />
            <Button size="sm" onClick={() => setOpen(false)}>
              Selesai
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
