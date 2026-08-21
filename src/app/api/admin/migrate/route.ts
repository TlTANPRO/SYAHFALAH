import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs20.x';
export const maxDuration = 60;

const EXPECTED_TOKEN = process.env.CRON_SECRET;

export async function POST(req: Request): Promise<Response> {
  try {
    const auth = req.headers.get('authorization');
    if (!EXPECTED_TOKEN || auth !== `Bearer ${EXPECTED_TOKEN}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const url = process.env.DATABASE_URL;
    if (!url) {
      return NextResponse.json(
        { error: 'DATABASE_URL not configured' },
        { status: 503 }
      );
    }

    // pg has native bindings that fail to bundle at module top-level.
    // Dynamic import keeps the import off the cold-start path and lets
    // us surface JSON errors instead of Next's __next_error__ HTML page.
    const pg = (await import('pg').catch((e) => {
      throw new Error('pg import failed: ' + (e?.message ?? String(e)));
    })) as typeof import('pg');
    const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
    try {
      await c.connect();
      // PostgREST ON CONFLICT requires a full UNIQUE constraint, not a
      // partial index. Drop the partial one we tried first, then add a
      // plain UNIQUE constraint so upsert matches.
      await c.query('DROP INDEX IF EXISTS public.uq_tasks_external_id');
      await c.query(
        "ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS uq_tasks_external_id"
      );
      await c.query(
        'ALTER TABLE public.tasks ADD CONSTRAINT uq_tasks_external_id UNIQUE (external_id)'
      );
      const v = await c.query(
        "SELECT conname FROM pg_constraint WHERE conrelid='public.tasks'::regclass AND conname='uq_tasks_external_id'"
      );
      return NextResponse.json({ ok: true, constraintRows: v.rowCount, rows: v.rows });
    } finally {
      await c.end().catch(() => {});
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}