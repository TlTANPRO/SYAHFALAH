// @ts-nocheck
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
  cacheHits: Record<string, number>
  cacheMisses: Record<string, number>
  mutations: {
    entity: string
    action: string
    durationMs: number
    timestamp: number
  }[]
  pageLoads: Record<string, number>
  sseConnections: number
  windowStart: number
  persistentStorage: boolean  // indicates if Supabase writes are succeeding
}

import { createClient } from '@supabase/supabase-js'

class MetricsTracker {
  private cacheHits: Map<string, number> = new Map()
  private cacheMisses: Map<string, number> = new Map()
  private pageLoads: Map<string, number> = new Map()
  private sseConnections = 0
  private windowMs = 60 * 60 * 1000

  // Lazily-initialized Supabase client for persistent aggregation
  // If table doesn't exist (migration not run), insert will silently fail
  // and we fall back to in-memory only.
  private supa: ReturnType<typeof createClient> | null = null
  private supaAvailable = false

  private getSupa(): ReturnType<typeof createClient> | null {
    if (this.supa) return this.supa
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return null
    this.supa = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
    return this.supa
  }

  // Fire-and-forget. Don't block the request path.
  private writeMetric(metric: {
    metric_type: 'mutation' | 'cache_hit' | 'cache_miss' | 'page_load' | 'sse_connect' | 'sse_disconnect'
    entity?: string
    action?: string
    duration_ms?: number
    user_id?: string
    route?: string
    metadata?: Record<string, unknown>
  }): void {
    const sb = this.getSupa()
    if (!sb) return
    (sb.from('perf_metrics') as any).insert(metric)
      .then(({ error }) => {
        if (error && !this.supaAvailable) {
          // Only log once — if table doesn't exist, suppress further errors
          console.warn('[perf-tracker] perf_metrics unavailable:', error.code || error.message)
          this.supaAvailable = false  // explicit: don't spam logs
        } else if (!error) {
          this.supaAvailable = true
        }
      })
      .catch(() => { /* never throw from analytics */ })
  }

  recordCacheHit(route: string): void {
    this.cacheHits.set(route, (this.cacheHits.get(route) ?? 0) + 1)
    this.writeMetric({ metric_type: 'cache_hit', route })
  }

  recordCacheMiss(route: string): void {
    this.cacheMisses.set(route, (this.cacheMisses.get(route) ?? 0) + 1)
    this.writeMetric({ metric_type: 'cache_miss', route })
  }

  recordPageLoad(route: string, userId?: string): void {
    this.pageLoads.set(route, (this.pageLoads.get(route) ?? 0) + 1)
    this.writeMetric({ metric_type: 'page_load', route, user_id: userId })
  }

  recordMutation(entity: string, action: string, durationMs: number, userId?: string): void {
    this.writeMetric({
      metric_type: 'mutation',
      entity,
      action,
      duration_ms: durationMs,
      user_id: userId,
    })
  }

  recordSSE(action: 'connect' | 'disconnect', userId?: string): void {
    this.writeMetric({
      metric_type: action === 'connect' ? 'sse_connect' : 'sse_disconnect',
      user_id: userId,
    })
  }

  setSSEConnections(n: number): void {
    this.sseConnections = n
  }

  snapshot(): MetricsSnapshot {
    const now = Date.now()
    return {
      cacheHits: Object.fromEntries(this.cacheHits.entries()),
      cacheMisses: Object.fromEntries(this.cacheMisses.entries()),
      mutations: [],  // Now stored in Supabase, see /api/analytics/historical
      pageLoads: Object.fromEntries(this.pageLoads.entries()),
      sseConnections: this.sseConnections,
      windowStart: now - this.windowMs,
      persistentStorage: this.supaAvailable,
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