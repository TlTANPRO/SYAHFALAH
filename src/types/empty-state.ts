// types/empty-state.ts
// Type definitions for per-entity empty state copy.

export interface NoDataCopy {
  eyebrow?: string
  title: string
  description?: string
  action?: {
    label: string
    href?: string
    shortcut?: string
    onClick?: string
  }
}

export interface SearchEmptyCopy {
  title: string
  description?: string
}

export interface ErrorCopy {
  title: string
  description?: string
}

export interface EmptyStateCopy {
  noData?: NoDataCopy
  searchEmpty?: SearchEmptyCopy
  error?: ErrorCopy
}