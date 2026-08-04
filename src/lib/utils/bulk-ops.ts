// lib/utils/bulk-ops.ts
// Helpers for large table operations: chunking + progress reporting.
// The dashboard may have 33k+ tasks; bulk-complete on all of them in a
// single UPDATE would lock the row range. Chunk into 500-row batches.

export interface BulkProgress {
  done: number
  total: number
  failed: number
}

export async function runBatched<T>(
  items: T[],
  batchSize: number,
  worker: (batch: T[]) => Promise<{ success: number; failed: number }>,
  onProgress?: (p: BulkProgress) => void,
): Promise<BulkProgress> {
  const total = items.length
  let done = 0
  let failed = 0
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const result = await worker(batch)
    done += batch.length
    failed += result.failed
    onProgress?.({ done, total, failed })
  }
  return { done, total, failed }
}
