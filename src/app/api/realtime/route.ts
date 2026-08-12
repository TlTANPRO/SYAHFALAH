// app/api/realtime/route.ts
// PUSH #3: Server-Sent Events stream for real-time updates.
// Mutations on any tracked entity push events here. Connected clients
// receive notifications and can refetch / refresh data.
//
// Architecture:
// - Client opens EventSource('/api/realtime')
// - Server keeps connection open, pushes events on demand
// - Mutations call notifyEntityChanged() from crud-handler
// - This avoids polling - browser gets push notifications
//
// Trade-off vs polling:
// - Saves HTTP roundtrips
// - Sub-second latency for "your colleague completed task X" notifications
// - Holds 1 connection per active user (acceptable for owner dashboards)

import { NextRequest } from 'next/server'
import { getServerSession } from '@/lib/auth/session'
import { subscribeToMutations, type MutationEvent } from '@/lib/realtime/event-bus'

export const runtime = 'nodejs'  // SSE needs long-lived connection, edge has 30s limit
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Authenticate before opening stream
  const session = await getServerSession()
  if (!session.user) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  const userId = session.user.id
  const userRole = session.user.role
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      
      // Send initial keepalive
      controller.enqueue(encoder.encode(`event: connected\ndata: {"userId":"${userId}"}\n\n`))
      
      // Subscribe to mutations
      const unsubscribe = subscribeToMutations((event: MutationEvent) => {
        // Filter: only send events that matter to this user
        // (e.g., pic_divisi only gets events for their division)
        // For now: send all events tagged with 'morning-brief' or 'dashboard'
        if (!['morning-brief', 'dashboard', 'projects'].includes(event.tag)) return
        
        // Owner: gets all
        // Non-owner: still gets all (they may have shared dashboards)
        const payload = JSON.stringify(event)
        try {
          controller.enqueue(encoder.encode(`event: mutation\ndata: ${payload}\n\n`))
        } catch {
          // Stream closed
        }
      })
      
      // Keepalive: 15s ping to prevent proxy timeout
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`))
        } catch {
          clearInterval(keepalive)
        }
      }, 15_000)
      
      // Cleanup on disconnect
      req.signal.addEventListener('abort', () => {
        unsubscribe()
        clearInterval(keepalive)
        try { controller.close() } catch { /* already closed */ }
      })
    },
  })
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',  // Disable nginx buffering
    },
  })
}