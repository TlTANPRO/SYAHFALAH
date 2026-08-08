// hooks/useFocusTrap.ts
// Trap keyboard focus inside a container element (modal, drawer, dropdown).
// Listens for Tab/Shift+Tab and Escape.

'use client'

import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable]',
].join(',')

export interface UseFocusTrapOptions {
  /** Active state — when true, focus is trapped. */
  active?: boolean
  /** Whether to auto-focus the first element on mount. */
  autoFocus?: boolean
  /** Whether to restore focus on unmount. */
  restoreFocus?: boolean
  /** Escape key handler. */
  onEscape?: () => void
}

export function useFocusTrap<T extends HTMLElement = HTMLElement>(
  options: UseFocusTrapOptions = {}
): RefObject<T> {
  const {
    active = true,
    autoFocus = true,
    restoreFocus = true,
    onEscape,
  } = options

  const ref = useRef<T>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!active) return
    const el = ref.current
    if (!el) return

    // Save current focus
    previouslyFocused.current = document.activeElement as HTMLElement | null

    // Find first focusable element
    const focusables = () =>
      Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (n) => !n.hasAttribute('aria-hidden') && n.offsetParent !== null
      )

    if (autoFocus) {
      const first = focusables()[0]
      first?.focus()
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onEscape?.()
        return
      }
      if (e.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    el.addEventListener('keydown', handleKey)
    return () => {
      el.removeEventListener('keydown', handleKey)
      if (restoreFocus && previouslyFocused.current) {
        previouslyFocused.current.focus()
      }
    }
  }, [active, autoFocus, restoreFocus, onEscape])

  return ref
}
