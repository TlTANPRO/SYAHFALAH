// hooks/index.ts
// Barrel export so consumers can `import { useKpiCascade } from '@/hooks'`
// instead of reaching into individual files.

export * from './useKpiCascade'
export * from './useDashboardData'

// Generic entity hooks (Phase 2 — simplification masterplan)
export { useEntityList, type ListResponse, type UseEntityListOptions } from './useEntityList'
export { useEntityMutation, type EntityMethod, type UseEntityMutationOptions } from './useEntityMutation'
export { useEntityOne, type UseEntityOneOptions } from './useEntityOne'
