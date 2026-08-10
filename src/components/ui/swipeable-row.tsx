// src/components/ui/swipeable-row.tsx
// Touch-friendly row with swipe-to-reveal actions.
// Swipe right → primary action (edit), swipe left → secondary (delete).

'use client'

import * as React from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SwipeAction {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  variant?: 'default' | 'destructive'
  onTrigger: () => void | Promise<void>
}

interface Props {
  children: React.ReactNode
  /** Swipe right to reveal (default: Edit) */
  rightAction?: SwipeAction
  /** Swipe left to reveal (default: Delete) */
  leftAction?: SwipeAction
  className?: string
}

const THRESHOLD = 80 // px to trigger action
const MAX_TRANSLATE = 96 // px max swipe distance

export function SwipeableRow({
  children,
  rightAction,
  leftAction,
  className,
}: Props) {
  const [startX, setStartX] = React.useState<number | null>(null)
  const [deltaX, setDeltaX] = React.useState(0)
  const [swiping, setSwiping] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX)
    setSwiping(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startX === null) return
    const dx = e.touches[0].clientX - startX
    // Clamp to MAX_TRANSLATE
    const clamped = Math.max(-MAX_TRANSLATE, Math.min(MAX_TRANSLATE, dx))
    setDeltaX(clamped)
  }

  const handleTouchEnd = async () => {
    if (startX === null) return
    
    // Trigger action if past threshold
    if (deltaX > THRESHOLD && rightAction) {
      await rightAction.onTrigger()
    } else if (deltaX < -THRESHOLD && leftAction) {
      await leftAction.onTrigger()
    }
    
    // Reset
    setStartX(null)
    setDeltaX(0)
    setSwiping(false)
  }

  // Background color based on swipe direction
  const bgColor = deltaX > 20 
    ? 'bg-[var(--color-brand-500)]' 
    : deltaX < -20 
      ? 'bg-[var(--color-danger)]'
      : 'bg-transparent'

  return (
    <div className={cn('relative overflow-hidden', className)} ref={containerRef}>
      {/* Background action indicator */}
      {swiping && (Math.abs(deltaX) > 20) && (
        <div className={cn(
          'absolute inset-y-0 flex items-center px-4 text-white font-medium text-sm pointer-events-none',
          deltaX > 0 ? 'left-0' : 'right-0',
          bgColor
        )}>
          {deltaX > 0 && rightAction && (
            <>
              <rightAction.icon className="h-4 w-4 mr-1.5" />
              {rightAction.label}
            </>
          )}
          {deltaX < 0 && leftAction && (
            <>
              <leftAction.icon className="h-4 w-4 mr-1.5" />
              {leftAction.label}
            </>
          )}
        </div>
      )}
      
      {/* Foreground content with transform */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: swiping ? `translateX(${deltaX}px)` : 'translateX(0)',
          transition: swiping ? 'none' : 'transform 200ms cubic-bezier(.26,.75,.38,.45)',
        }}
        className="relative"
      >
        {children}
      </div>
    </div>
  )
}

// Helper: pre-configured row with Edit (right) + Delete (left) actions
export function EditableRow({
  children,
  onEdit,
  onDelete,
  className,
}: {
  children: React.ReactNode
  onEdit: () => void
  onDelete?: () => void | Promise<void>
  className?: string
}) {
  return (
    <SwipeableRow
      className={className}
      rightAction={{
        id: 'edit',
        label: 'Edit',
        icon: Pencil,
        onTrigger: onEdit,
      }}
      leftAction={onDelete ? {
        id: 'delete',
        label: 'Hapus',
        icon: Trash2,
        variant: 'destructive',
        onTrigger: onDelete,
      } : undefined}
    >
      {children}
    </SwipeableRow>
  )
}
