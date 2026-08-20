import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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
      await c.query(
        'CREATE UNIQUE INDEX IF NOT EXISTS uq_tasks_external_id ON public.tasks (external_id) WHERE external_id IS NOT NULL'
      );
      const v = await c.query(
        "SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename='tasks' AND indexname='uq_tasks_external_id'"
      );
      return NextResponse.json({ ok: true, indexRows: v.rowCount, rows: v.rows });
    } finally {
      await c.end().catch(() => {});
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}