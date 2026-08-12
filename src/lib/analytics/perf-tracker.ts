// lib/analytics/perf-tracker.ts
// PUSH #4: Lightweight analytics for cache, mutation latency, page loads.
//
// IMPORTANT LIMITATION: Vercel deploys to multiple serverless workers.
// The globalThis singleton only persists within one worker's lifetime.
// For accurate cross-request analytics, this should be backed by Supabase.
// The endpoint /api/analytics currently shows "real" metrics for one request
// lifecycle, not aggregated across all workers.


// Tracks server-side metrics in memory + writes to /api/analytics/log periodically.
//
// Metrics collected:
// - cache_hits / cache_misses per page
// - mutation latency (ms from request start to response)
// - page load count per route
// - active SSE connections
//
// Query via: GET /api/analytics → returns current snapshot

interface MetricsSnapshot {
  // Cache effectiveness
  cacheHits: Record<string, number>
  cacheMisses: Record<string, number>
  
  // Mutation performance
  mutations: {
    entity: string
    action: string
    durationMs: number
    timestamp: number
  }[]
  
  // Page load counts (per route)
  pageLoads: Record<string, number>
  
  // Active SSE connections
  sseConnections: number
  
  // Window: last 1 hour metrics
  windowStart: number
}

class MetricsTracker {
  private cacheHits: Map<string, number> = new Map()
  private cacheMisses: Map<string, number> = new Map()
  private mutations: MetricsSnapshot['mutations'] = []
  private pageLoads: Map<string, number> = new Map()
  private sseConnections = 0
  private maxMutations = 100  // keep last 100
  private windowMs = 60 * 60 * 1000  // 1 hour
  
  recordCacheHit(route: string): void {
    this.cacheHits.set(route, (this.cacheHits.get(route) ?? 0) + 1)
  }
  
  recordCacheMiss(route: string): void {
    this.cacheMisses.set(route, (this.cacheMisses.get(route) ?? 0) + 1)
  }
  
  recordPageLoad(route: string): void {
    this.pageLoads.set(route, (this.pageLoads.get(route) ?? 0) + 1)
  }
  
  recordMutation(entity: string, action: string, durationMs: number): void {
    this.mutations.push({ entity, action, durationMs, timestamp: Date.now() })
    // Trim old entries
    const cutoff = Date.now() - this.windowMs
    this.mutations = this.mutations.filter(m => m.timestamp > cutoff).slice(-this.maxMutations)
  }
  
  setSSEConnections(n: number): void {
    this.sseConnections = n
  }
  
  snapshot(): MetricsSnapshot {
    const now = Date.now()
    const cutoff = now - this.windowMs
    
    // Aggregate hit rates
    const hits = Object.fromEntries(this.cacheHits.entries())
    const misses = Object.fromEntries(this.cacheMisses.entries())
    
    // Aggregate page loads in window
    const recentMutations = this.mutations.filter(m => m.timestamp > cutoff)
    const avgMutationLatency = recentMutations.length > 0
      ? recentMutations.reduce((sum, m) => sum + m.durationMs, 0) / recentMutations.length
      : 0
    
    return {
      cacheHits: hits,
      cacheMisses: misses,
      mutations: this.mutations.slice(-20),  // last 20 for inspection
      pageLoads: Object.fromEntries(this.pageLoads.entries()),
      sseConnections: this.sseConnections,
      windowStart: now - this.windowMs,
    }
  }
}

// Singleton
const globalTracker = (globalThis as any).__syahfalah_metrics ?? new MetricsTracker()
;(globalThis as any).__syahfalah_metrics = globalTracker

export const perfTracker = globalTracker

// Time a mutation. Returns the duration and also records it.
export async function timeMutation<T>(
  entity: string,
  action: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now()
  try {
    return await fn()
  } finally {
    const durationMs = Math.round(performance.now() - start)
    perfTracker.recordMutation(entity, action, durationMs)
  }
}