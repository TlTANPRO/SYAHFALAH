// app/api/realtime/route.ts
// HARD #2: SSE endpoint with connection cap, persistent analytics.
// Streams mutation events to subscribed clients.

import { NextRequest } from 'next/server'
import { getServerSession } from '@/lib/auth/session'
import { subscribeToMutations, type MutationEvent } from '@/lib/realtime/event-bus'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// HARD #2: Connection cap. Max 3 concurrent per user (covers multi-tab).
const MAX_CONN_PER_USER = 3
const activeConnections: Map<string, number> = new Map()

function acquireConnection(userId: string): boolean {
  const current = activeConnections.get(userId) ?? 0
  if (current >= MAX_CONN_PER_USER) return false
  activeConnections.set(userId, current + 1)
  return true
}

function releaseConnection(userId: string): void {
  const current = activeConnections.get(userId) ?? 0
  if (current <= 1) {
    activeConnections.delete(userId)
  } else {
    activeConnections.set(userId, current - 1)
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession()
  if (!session.user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const userId = session.user.id

  if (!acquireConnection(userId)) {
    return new Response(JSON.stringify({
      error: 'too_many_connections',
      message: `Maksimal ${MAX_CONN_PER_USER} koneksi realtime per user. Tutup tab lain dulu.`,
    }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      controller.enqueue(encoder.encode(`event: connected\ndata: {"userId":"${userId}"}\n\n`))

      const unsubscribe = subscribeToMutations((event: MutationEvent) => {
        if (!['morning-brief', 'dashboard', 'projects'].includes(event.tag)) return
        const payload = JSON.stringify(event)
        try {
          controller.enqueue(encoder.encode(`event: mutation\ndata: ${payload}\n\n`))
        } catch {
          // stream closed
        }
      })

      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`))
        } catch {
          clearInterval(keepalive)
        }
      }, 15_000)

      req.signal.addEventListener('abort', () => {
        unsubscribe()
        clearInterval(keepalive)
        releaseConnection(userId)
        try { controller.close() } catch { /* already closed */ }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
