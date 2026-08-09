// components/ui/combobox.tsx
// Searchable dropdown for FK references. Used wherever we need to pick
// a user / cluster / division / etc. by name instead of UUID.
// Inspired by shadcn/ui Command + 21st.dev Combobox patterns.

'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from './popover'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
  CommandGroup,
} from './cmdk'

export interface ComboboxOption {
  value: string | number
  label: string
  description?: string
  group?: string
}

interface ComboboxProps {
  /** Currently selected value (or null) */
  value: string | number | null | undefined
  /** Called when user picks an option */
  onChange: (value: string | number | null) => void
  /** Options list — pass either static or async-fetched */
  options: ComboboxOption[]
  /** Placeholder for the trigger button */
  placeholder?: string
  /** Trigger button label when no value */
  emptyLabel?: string
  /** Allow clearing the selection */
  clearable?: boolean
  /** Loading state while options are fetching */
  loading?: boolean
  /** Search input placeholder */
  searchPlaceholder?: string
  /** Disable the whole combobox */
  disabled?: boolean
  /** Custom trigger render */
  renderTrigger?: (props: {
    display: string
    open: boolean
  }) => React.ReactNode
  /** aria-label for accessibility */
  'aria-label'?: string
  /** Size variant */
  size?: 'sm' | 'default' | 'lg'
  /** Optional className for trigger */
  className?: string
}

export function Combobox({
  value,
  onChange,
  options,
  placeholder = 'Pilih...',
  emptyLabel = '— belum dipilih —',
  clearable = true,
  loading = false,
  searchPlaceholder = 'Cari...',
  disabled = false,
  renderTrigger,
  'aria-label': ariaLabel,
  size = 'default',
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const selected = options.find((o) => o.value === value)
  const display = selected?.label ?? (value ? `(${String(value).slice(0, 8)}…)` : emptyLabel)

  const sizeClasses = {
    sm: 'h-8 text-xs px-2',
    default: 'h-9 px-3',
    lg: 'h-11 px-4 text-base',
  }[size]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {renderTrigger ? (
          renderTrigger({ display, open })
        ) : (
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={ariaLabel}
            disabled={disabled || loading}
            className={cn(
              'w-full justify-between gap-2 font-normal',
              !selected && 'text-[var(--color-text-tertiary)]',
              sizeClasses,
              className
            )}
          >
            <span className="truncate">{loading ? <Loader2 className="h-3 w-3 animate-spin" /> : display}</span>
            <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>Tidak ditemukan.</CommandEmpty>
            {clearable && value && (
              <CommandGroup>
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onChange(null)
                    setOpen(false)
                  }}
                  className="text-[var(--color-text-tertiary)]"
                >
                  — Kosongkan —
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value === value ? null : option.value)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'h-4 w-4 shrink-0',
                      value === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{option.label}</div>
                    {option.description && (
                      <div className="text-xs text-[var(--color-text-tertiary)] truncate">
                        {option.description}
                      </div>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
