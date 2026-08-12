// lib/analytics/error-logger.ts
// HARD #4: Structured error logger.
// Captures 5xx errors, RBAC denials, and suspicious activity.
// Logs to stderr (always) + optionally to perf_metrics (mutation_error metric).
//
// Error budget concept:
// - 99% of mutations should succeed
// - 5xx errors above 1% rate trigger auto-rollback considerations
// - This logger enables post-hoc analysis via /api/analytics/historical

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical'

interface ErrorContext {
  route?: string
  method?: string
  userId?: string
  entity?: string
  action?: 'create' | 'update' | 'delete' | 'list' | 'auth'
  statusCode?: number
  durationMs?: number
  metadata?: Record<string, unknown>
}

class ErrorLogger {
  // Rolling count: last hour, for in-process anomaly detection
  private recentErrors: { timestamp: number; severity: ErrorSeverity; message: string }[] = []
  private windowMs = 60 * 60 * 1000
  private maxEntries = 1000
  
  private record(severity: ErrorSeverity, message: string, ctx?: ErrorContext): void {
    const entry = {
      timestamp: Date.now(),
      severity,
      message,
      ...(ctx ?? {}),
    }
    this.recentErrors.push(entry)
    // Trim
    const cutoff = Date.now() - this.windowMs
    if (this.recentErrors.length > this.maxEntries) {
      this.recentErrors = this.recentErrors.filter(e => e.timestamp > cutoff).slice(-this.maxEntries)
    }
    
    // Always log to stderr
    const logLine = JSON.stringify({
      level: severity,
      msg: message,
      ts: new Date().toISOString(),
      ...(ctx ?? {}),
    })
    if (severity === 'critical' || severity === 'error') {
      console.error(logLine)
    } else {
      console.warn(logLine)
    }
    
    // Also push to perf_metrics if possible
    // Use dynamic import to avoid bundling supabase in non-server contexts
    if (ctx?.statusCode && ctx.statusCode >= 500) {
      try {
        // Fire-and-forget metric write
        import('@/lib/analytics/perf-tracker').then(({ perfTracker }) => {
          perfTracker.recordMutation(
            ctx.entity ?? 'unknown',
            ctx.action ?? 'list',
            ctx.durationMs ?? 0
          )
        }).catch(() => { /* analytics not critical */ })
      } catch { /* ignore */ }
    }
  }
  
  info(message: string, ctx?: ErrorContext): void {
    this.record('info', message, ctx)
  }
  warning(message: string, ctx?: ErrorContext): void {
    this.record('warning', message, ctx)
  }
  error(message: string, ctx?: ErrorContext): void {
    this.record('error', message, ctx)
  }
  critical(message: string, ctx?: ErrorContext): void {
    this.record('critical', message, ctx)
  }
  
  // Returns recent error count by severity (last hour, in-memory only)
  snapshot() {
    const cutoff = Date.now() - this.windowMs
    const recent = this.recentErrors.filter(e => e.timestamp > cutoff)
    return {
      total: recent.length,
      by_severity: {
        info: recent.filter(e => e.severity === 'info').length,
        warning: recent.filter(e => e.severity === 'warning').length,
        error: recent.filter(e => e.severity === 'error').length,
        critical: recent.filter(e => e.severity === 'critical').length,
      },
      recent_samples: recent.slice(-10),
    }
  }
}

const globalLogger = (globalThis as any).__syahfalah_error_logger ?? new ErrorLogger()
;(globalThis as any).__syahfalah_error_logger = globalLogger

export const errorLogger = globalLogger

// Convenience wrapper for API routes
export function withErrorLogging<T extends (...args: any[]) => Promise<Response>>(
  fn: T,
  context: Pick<ErrorContext, 'route' | 'method' | 'entity' | 'action'>
): T {
  return (async (...args: Parameters<T>) => {
    const start = Date.now()
    try {
      const response = await fn(...args)
      const durationMs = Date.now() - start
      const status = response.status
      if (status >= 500) {
        errorLogger.error(`${context.route} ${status}`, {
          ...context,
          statusCode: status,
          durationMs,
        })
      } else if (status >= 400) {
        errorLogger.warning(`${context.route} ${status}`, {
          ...context,
          statusCode: status,
          durationMs,
        })
      }
      return response
    } catch (e: any) {
      errorLogger.critical(`${context.route} uncaught`, {
        ...context,
        metadata: { error: String(e?.message ?? e) },
        durationMs: Date.now() - start,
      })
      throw e
    }
  }) as T
}
