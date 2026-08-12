// lib/realtime/event-bus.ts
// PUSH #3: In-memory pub/sub for Server-Sent Events.
// When a mutation happens (handleCreate/Update/Delete in crud-handler),
// notifyEntityChanged() pushes an event to all subscribed SSE clients.

export interface MutationEvent {
  entity: string
  action: 'create' | 'update' | 'delete'
  tag: string  // cache tag that was invalidated
  timestamp: number
  userId?: string
}

type Listener = (event: MutationEvent) => void

class EventBus {
  private listeners: Set<Listener> = new Set()
  
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
  
  publish(event: MutationEvent): void {
    const listeners = Array.from(this.listeners)
    for (const listener of listeners) {
      try {
        listener(event)
      } catch {
        this.listeners.delete(listener)
      }
    }
  }
  
  // For monitoring / health check
  size(): number {
    return this.listeners.size
  }
}

// Singleton across the server lifetime
const globalBus = (globalThis as any).__syahfalah_event_bus ?? new EventBus()
;(globalThis as any).__syahfalah_event_bus = globalBus

export function subscribeToMutations(listener: Listener): () => void {
  return globalBus.subscribe(listener)
}

export function notifyEntityChanged(event: MutationEvent): void {
  globalBus.publish(event)
}