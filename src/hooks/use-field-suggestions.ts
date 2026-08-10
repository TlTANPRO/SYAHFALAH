// src/hooks/use-field-suggestions.ts
// Fetch AI field suggestions for InlineEdit / FieldForm autocomplete.

'use client'

import * as React from 'react'

interface Options {
  /** Entity name (e.g., 'tasks', 'projects', 'users') */
  entity: string
  /** Field name (e.g., 'status', 'priority') */
  field: string
  /** Current partial value to filter suggestions */
  partial?: string
  /** Disable fetching (e.g., when field doesn't support suggestions) */
  enabled?: boolean
}

export function useFieldSuggestions({ entity, field, partial = '', enabled = true }: Options) {
  const [suggestions, setSuggestions] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (!enabled || !entity || !field) {
      setSuggestions([])
      return
    }
    
    // Debounce to avoid spamming API
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/ai/suggest-field', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ entity, field, partial }),
        })
        if (res.ok) {
          const body = await res.json()
          setSuggestions(Array.isArray(body.suggestions) ? body.suggestions : [])
        } else {
          setSuggestions([])
        }
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [entity, field, partial, enabled])

  return { suggestions, loading }
}
