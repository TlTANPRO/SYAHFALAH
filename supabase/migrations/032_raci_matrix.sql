-- 032_raci_matrix.sql
-- Plan audit P0-2 closure — raci/page.tsx had hardcoded RACI matrix.
-- Move it to a DB-backed table so admin can edit without redeploy.

CREATE TABLE IF NOT EXISTS public.raci_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_name text NOT NULL,
  notes text,
  sort_order smallint NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.raci_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raci_task_id uuid NOT NULL REFERENCES public.raci_tasks(id) ON DELETE CASCADE,
  role text NOT NULL,
  raci_value text NOT NULL CHECK (raci_value IN ('R', 'A', 'C', 'I', '—')),
  UNIQUE (raci_task_id, role)
);

CREATE INDEX IF NOT EXISTS raci_assignments_task_idx ON public.raci_assignments (raci_task_id);

-- RLS: read-only.
ALTER TABLE public.raci_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raci_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS raci_tasks_read ON public.raci_tasks;
DROP POLICY IF EXISTS raci_assignments_read ON public.raci_assignments;
CREATE POLICY raci_tasks_read ON public.raci_tasks FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY raci_assignments_read ON public.raci_assignments FOR SELECT TO authenticated, anon USING (true);

-- Seed: insert 10 RACI tasks first, get their IDs, then assign values.
WITH rows AS (
  INSERT INTO public.raci_tasks (task_name, notes, sort_order)
  SELECT * FROM (VALUES
    ('Cari leads dari Meta & TikTok Ads',     'Target 200 leads/bulan untuk Riza'::text,  1::smallint),
    ('Hubungi calon buyer',                    'Response time max 2 jam',                  2),
    ('Booking & jadwal survey',                'Survey oleh Amir/Yudi',                    3),
    ('Proses berkas (KK, KTP, NPWP, dll)',    'Novita kumpulkan',                         4),
    ('Submit berkas ke bank untuk SP3K',       'Max 14 hari proses',                       5),
    ('Penjadwalan akad',                       'Bu Nisya buat akta',                       6),
    ('Pelaksanaan akad',                       'Kantor cabang terkait',                    7),
    ('Komunikasi & konten media pemasaran',    'Foto/video proyek rutin',                  8),
    ('Pembukuan & invoice',                    'Finance issued max 3 hari',                9),
    ('Konstruksi dan serah-terima unit',       null,                                       10)
  ) AS t(task_name, notes, sort_order)
  RETURNING id, sort_order
)
INSERT INTO public.raci_assignments (raci_task_id, role, raci_value)
SELECT rt.id, r.role, r.value
FROM rows rt
JOIN (VALUES
  (1,  'marketing', 'R'),  (1,  'owner', 'A'),  (1,  'kk', 'I'), (1, 'legal', '—'), (1, 'media', 'C'), (1, 'finance', 'I'), (1, 'konstruksi', '—'),
  (2,  'marketing', 'R'),  (2,  'owner', 'A'),  (2,  'kk', 'C'), (2, 'legal', '—'), (2, 'media', '—'),(2, 'finance', '—'),(2, 'konstruksi', '—'),
  (3,  'marketing', 'R'),  (3,  'owner', 'A'),  (3,  'kk', 'I'), (3, 'legal', '—'), (3, 'media', '—'),(3, 'finance', '—'),(3, 'konstruksi', 'I'),
  (4,  'marketing', 'C'),  (4,  'owner', 'A'),  (4,  'kk', 'R'), (4, 'legal', 'C'), (4, 'media', '—'),(4, 'finance', 'I'),(4, 'konstruksi', '—'),
  (5,  'marketing', 'C'),  (5,  'owner', 'A'),  (5,  'kk', 'R'), (5, 'legal', 'C'), (5, 'media', '—'),(5, 'finance', 'I'),(5, 'konstruksi', '—'),
  (6,  'marketing', 'I'),  (6,  'owner', 'A'),  (6,  'kk', 'R'), (6, 'legal', 'R'), (6, 'media', '—'),(6, 'finance', 'I'),(6, 'konstruksi', '—'),
  (7,  'marketing', 'I'),  (7,  'owner', 'A'),  (7,  'kk', 'R'), (7, 'legal', 'I'), (7, 'media', '—'),(7, 'finance', 'I'),(7, 'konstruksi', '—'),
  (8,  'marketing', 'R'),  (8,  'owner', 'A'),  (8,  'kk', 'I'), (8, 'legal', '—'), (8, 'media', 'R'),(8, 'finance', '—'),(8, 'konstruksi', '—'),
  (9,  'marketing', '—'),  (9,  'owner', 'A'),  (9,  'kk', 'I'), (9, 'legal', '—'), (9, 'media', '—'),(9, 'finance', 'R'),(9, 'konstruksi', '—'),
  (10, 'marketing', '—'),  (10, 'owner', 'A'),  (10, 'kk', 'I'), (10, 'legal', '—'),(10, 'media', '—'),(10, 'finance', 'I'),(10, 'konstruksi', 'R')
) AS r(sort_order, role, value) ON r.sort_order = rt.sort_order
ON CONFLICT (raci_task_id, role) DO NOTHING;
