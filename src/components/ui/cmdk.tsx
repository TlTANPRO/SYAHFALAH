// components/ui/cmdk.tsx
// Re-exports of cmdk primitives with shadcn-style classNames.
// Used by Combobox + future CommandPalette variants.

'use client'

import { Command as CommandPrimitive } from 'cmdk'
import { cn } from '@/lib/utils'
import * as React from 'react'

export const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      'flex h-full w-full flex-col overflow-hidden rounded-md bg-[var(--color-surface-3)] text-[var(--color-text-primary)]',
      className
    )}
    {...props}
  />
))
Command.displayName = CommandPrimitive.displayName

export {
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
  CommandGroup,
  CommandSeparator,
} from 'cmdk'
