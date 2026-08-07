// src/lib/offline/sync-queue.ts
// Plan C Phase 4 — Client-side helper for the offline-first mobile PWA.
//
// Behavior:
//   - When the user does a mutation while online, this helper still sends
//     it directly to the server (optimistic, low latency).
//   - When the user does a mutation while offline, we stash it in
//     IndexedDB under `offline-queue` (object store).
//   - When the connection returns, we drain the store and POST a batch
//     to /api/sync/process.
//
// All targets must be in the server allowlist (tasks, attendance_logs,
// leads, maintenance_logs). Otherwise the call fails fast with a clear
// error.
//
// No third-party IDB library; uses the built-in IndexedDB to keep
// bundle size small (the rest of the app is JSDOM-clean).

export type SyncMutation = {
  client_op_id: string
  target_table: 'tasks' | 'attendance_logs' | 'leads' | 'maintenance_logs' | string
  operation: 'insert' | 'update' | 'delete'
  payload?: Record<string, unknown>
  dedup_key?: string
  created_at: number
  sync_status: 'pending' | 'syncing' | 'applied' | 'failed' | 'rejected'
  last_error?: string
}

const DB_NAME = 'syahfalah-offline'
const DB_VERSION = 1
const STORE_QUEUE = 'sync-queue'

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined'
}

function uuidv7Like(): string {
  // We don't need real UUIDv7, just a globally unique enough string for
  // dedup keys. crypto.randomUUID is fine.
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        const store = db.createObjectStore(STORE_QUEUE, { keyPath: 'client_op_id' })
        store.createIndex('sync_status', 'sync_status', { unique: false })
        store.createIndex('created_at', 'created_at', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function withStore<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => Promise<T> | T): Promise<T> {
  const db = await openDB()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, mode)
    const store = tx.objectStore(STORE_QUEUE)
    let result: T
    Promise.resolve(fn(store)).then((r) => {
      result = r
    }).catch((e) => {
      reject(e)
    })
    tx.oncomplete = () => resolve(result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

// Stash a mutation in IDB and try to ship it. If `navigator.onLine`
// is true OR we get a network response, the server is hit directly. If
// offline, we save to IDB and rely on the next online tick to drain.
export async function enqueueMutation(m: Omit<SyncMutation, 'client_op_id' | 'created_at' | 'sync_status'> & { client_op_id?: string }): Promise<SyncMutation> {
  if (!isBrowser()) {
    // SSR noop
    return { ...m, client_op_id: m.client_op_id ?? uuidv7Like(), created_at: Date.now(), sync_status: 'applied' } as SyncMutation
  }
  const full: SyncMutation = {
    ...m,
    client_op_id: m.client_op_id ?? uuidv7Like(),
    created_at: Date.now(),
    sync_status: 'pending',
  }
  await withStore('readwrite', (s) => {
    return new Promise<void>((resolve, reject) => {
      const r = s.put(full)
      r.onsuccess = () => resolve()
      r.onerror = () => reject(r.error)
    })
  })
  // Try to drain immediately if online.
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    void drainQueue().catch(() => { /* swallow */ })
  }
  return full
}

async function readAll(): Promise<SyncMutation[]> {
  return withStore<SyncMutation[]>('readonly', (s) => {
    return new Promise((resolve, reject) => {
      const r = s.getAll()
      r.onsuccess = () => resolve((r.result ?? []) as SyncMutation[])
      r.onerror = () => reject(r.error)
    })
  })
}

// Drain the queue: read everything pending, batch-POST to the server,
// then update each row's status from the server's response.
export async function drainQueue(): Promise<{ applied: number; failed: number; duplicates: number }> {
  if (!isBrowser()) return { applied: 0, failed: 0, duplicates: 0 }
  const items = (await readAll()).filter((m) => m.sync_status === 'pending' || m.sync_status === 'failed')
  if (items.length === 0) return { applied: 0, failed: 0, duplicates: 0 }

  // Mark as syncing so a parallel drain call won't double-send.
  await withStore('readwrite', (s) => {
    return Promise.all(items.map((m) => new Promise<void>((resolve) => {
      const next = { ...m, sync_status: 'syncing' as const }
      const r = s.put(next)
      r.onsuccess = () => resolve()
      r.onerror = () => resolve()
    })))
  })

  let res: Response
  try {
    res = await fetch('/api/sync/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        mutations: items.map(({ created_at, sync_status, last_error, ...rest }) => rest),
      }),
    })
  } catch (e) {
    // Restore pending status if the network call failed wholesale.
    await withStore('readwrite', (s) => {
      return Promise.all(items.map((m) => new Promise<void>((resolve) => {
        const r = s.put({ ...m, sync_status: 'pending' as const })
        r.onsuccess = () => resolve()
        r.onerror = () => resolve()
      })))
    })
    return { applied: 0, failed: 0, duplicates: 0 }
  }

  if (res.status === 401) {
    // Session expired — drop the queue so user gets a clean re-login.
    await clearQueue()
    return { applied: 0, failed: 0, duplicates: 0 }
  }

  const data = await res.json().catch(() => ({ results: [] })) as { results?: Array<{ client_op_id: string; status: string; id?: string; error?: string }> }

  let applied = 0
  let failed = 0
  let duplicates = 0

  await withStore('readwrite', (s) => {
    return Promise.all((data.results ?? []).map((r) => new Promise<void>((resolve) => {
      const nextStatus: SyncMutation['sync_status'] =
        r.status === 'completed' ? 'applied' :
        r.status === 'duplicate' ? 'applied' :
        'failed'
      if (nextStatus === 'applied') applied++
      else if (r.status === 'duplicate') duplicates++
      else failed++
      const tx = s.put({
        client_op_id: r.client_op_id,
        target_table: '',
        operation: 'insert',
        created_at: Date.now(),
        sync_status: nextStatus,
        last_error: r.error ?? null,
      })
      tx.onsuccess = () => resolve()
      tx.onerror = () => resolve()
    })))
  })

  return { applied, failed, duplicates }
}

export async function clearQueue(): Promise<void> {
  if (!isBrowser()) return
  await withStore('readwrite', (s) => {
    return new Promise<void>((resolve, reject) => {
      const r = s.clear()
      r.onsuccess = () => resolve()
      r.onerror = () => reject(r.error)
    })
  })
}

export async function queueSize(): Promise<number> {
  if (!isBrowser()) return 0
  return withStore<number>('readonly', (s) => {
    return new Promise((resolve, reject) => {
      const r = s.count()
      r.onsuccess = () => resolve(r.result ?? 0)
      r.onerror = () => reject(r.error)
    })
  })
}

// Subscribe to online/offline transitions. Returns an unsubscribe fn.
export function attachAutoSync(onDrain?: (result: { applied: number; failed: number; duplicates: number }) => void): () => void {
  if (!isBrowser() || typeof window === 'undefined') return () => undefined
  const onlineHandler = () => {
    void drainQueue().then((res) => onDrain?.(res))
  }
  window.addEventListener('online', onlineHandler)
  // Also drain once on attach in case we boot online while a queue exists.
  if (navigator.onLine) {
    void drainQueue().then((res) => onDrain?.(res))
  }
  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', onlineHandler)
    }
  }
}

// Helper: same shape as fetch — returns a real server response when
// online, but if offline, stashes the mutation in IDB and returns a
// fake 202 response so the caller can show "queued" UX. Lets pages
// build mutations the same way regardless of connectivity.
export async function offlineAwareMutation(
  path: string,
  init: RequestInit & { offlineMutation?: Omit<SyncMutation, 'client_op_id' | 'created_at' | 'sync_status'> & { client_op_id?: string } },
): Promise<Response> {
  if (!isBrowser() || !init.offlineMutation) {
    return fetch(path, init)
  }
  if (navigator.onLine) {
    try {
      const r = await fetch(path, init)
      if (r.ok) return r
    } catch {
      // fall through to offline
    }
  }
  await enqueueMutation(init.offlineMutation)
  return new Response(JSON.stringify({ queued: true, offline: true }), {
    status: 202,
    headers: { 'Content-Type': 'application/json' },
  })
}
