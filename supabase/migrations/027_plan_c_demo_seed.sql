-- 027_plan_c_demo_seed.sql
-- Plan C Phase 2-3 — Demo content for empty tables.
-- Idempotent (uses NOT EXISTS to skip if already seeded).
-- Seed is realistic Indonesian property-developer data, not random lorem.
-- This migration is safe to re-run (INSERTs wrapped in existence checks).

BEGIN;

-- ============================================================================
-- 1. CUSTOMERS (5) — derived from existing leads
-- ============================================================================
INSERT INTO public.customers (id, code, full_name, phone, email, ktp_number, address, notes)
SELECT
  gen_random_uuid(),
  'CUST-' || LPAD(row_number() OVER ()::text, 4, '0'),
  l.customer_name,
  l.customer_phone,
  lower(replace(l.customer_name, ' ', '.')) || '@gmail.com',
  '32' || LPAD((random() * 999999999999)::bigint::text, 12, '0'),
  'Jl. ' || (ARRAY['Merdeka', 'Sudirman', 'Diponegoro', 'Gajah Mada', 'Cendrawasih'])[1 + (row_number() OVER () % 5)] || ' No. ' || (10 + row_number() OVER ()) || ', ' || (ARRAY['Makassar', 'Surabaya', 'Jakarta', 'Bandung', 'Yogyakarta'])[1 + (row_number() OVER () % 5)],
  'Customer dari lead ' || l.code
FROM public.leads l
WHERE l.customer_name IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.customers c WHERE c.full_name = l.customer_name)
ORDER BY l.created_at
LIMIT 8;

-- ============================================================================
-- 2. BOOKINGS (4) — for leads in 'booked' or 'closing' stage
-- ============================================================================
INSERT INTO public.bookings (lead_id, customer_id, cluster_id, booking_date, booking_fee, status, booking_letter_no, notes)
SELECT
  l.id,
  (SELECT c.id FROM public.customers c WHERE c.full_name = l.customer_name LIMIT 1),
  (SELECT id FROM public.clusters ORDER BY random() LIMIT 1),
  COALESCE(l.booked_at::date, ((now() - (random() * interval '60 days'))::date)),
  10000000 + (random() * 90000000)::numeric(14,2),
  CASE l.stage
    WHEN 'closing' THEN 'confirmed'
    WHEN 'booked'  THEN 'confirmed'
    ELSE 'pending'
  END,
  'BK-' || LPAD(row_number() OVER ()::text, 5, '0'),
  'Booking fee untuk ' || l.customer_name
FROM public.leads l
WHERE l.stage IN ('booked', 'closing')
  AND l.booked_at IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.bookings b WHERE b.lead_id = l.id)
ORDER BY l.created_at DESC
LIMIT 5;

-- ============================================================================
-- 3. SURVEYS (6) — for leads past 'new' stage
-- ============================================================================
INSERT INTO public.surveys (lead_id, cluster_id, scheduled_date, completed_date, result, notes)
SELECT
  l.id,
  (SELECT id FROM public.clusters ORDER BY random() LIMIT 1),
  ((l.created_at::date + interval '5 days')::date),
  ((l.created_at::date + interval '10 days')::date),
  CASE l.stage
    WHEN 'closing' THEN 'interested'
    WHEN 'booked'  THEN 'interested'
    ELSE 'pending'
  END,
  'Survey lokasi unit ' || l.code
FROM public.leads l
WHERE l.stage IN ('contacted', 'surveyed', 'booked', 'closing')
  AND NOT EXISTS (SELECT 1 FROM public.surveys s WHERE s.lead_id = l.id)
ORDER BY l.created_at DESC
LIMIT 6;

-- ============================================================================
-- 4. SP3K (3) — linked to bookings
-- ============================================================================
INSERT INTO public.sp3k (booking_id, customer_id, sla_deadline, status, reviewer_id, reviewed_at, review_note, created_at)
SELECT
  b.id,
  b.customer_id,
  (b.booking_date + interval '14 days')::date,
  CASE (row_number() OVER () % 3)
    WHEN 0 THEN 'approved'
    WHEN 1 THEN 'pending'
    ELSE 'pending'
  END,
  (SELECT id FROM public.users WHERE role = 'owner' LIMIT 1),
  CASE WHEN (row_number() OVER () % 3) = 0 THEN (now() - interval '1 day')::timestamptz ELSE NULL END,
  'SP3K untuk booking ' || b.booking_letter_no,
  b.created_at
FROM public.bookings b
WHERE b.status = 'confirmed'
  AND NOT EXISTS (SELECT 1 FROM public.sp3k sp WHERE sp.booking_id = b.id)
ORDER BY b.created_at DESC
LIMIT 3;

-- ============================================================================
-- 5. AKAD (2) — for approved SP3K
-- ============================================================================
INSERT INTO public.akad (sp3k_id, customer_id, scheduled_date, notary_name, notary_fee, status, notes)
SELECT
  sp.id,
  sp.customer_id,
  (now() + (random() * interval '30 days'))::date,
  (ARRAY['Notaris Andi Saputra, S.H.', 'Notaris Budi Hartono, S.H.', 'Notaris Citra Dewi, S.H.'])[1 + (row_number() OVER () % 3)]::text,
  2500000,
  CASE (row_number() OVER () % 2) WHEN 0 THEN 'scheduled' ELSE 'signed' END,
  'Akad kredit untuk SP3K ' || sp.id::text
FROM public.sp3k sp
WHERE sp.status = 'approved'
  AND NOT EXISTS (SELECT 1 FROM public.akad a WHERE a.sp3k_id = sp.id)
LIMIT 2;

-- ============================================================================
-- 6. BLOCKS (8) — for first 3 projects
-- ============================================================================
INSERT INTO public.blocks (project_id, name, code, total_units, description, sort_order)
SELECT
  p.id,
  'Blok ' || chr(65 + (row_number() OVER ())::int % 6),  -- A-F
  'BLK-' || LPAD(row_number() OVER ()::text, 3, '0'),
  (20 + (row_number() OVER () * 4)::int) % 40 + 20,
  'Blok ' || chr(65 + (row_number() OVER ())::int % 6) || ' — ' || p.name,
  row_number() OVER ()
FROM public.projects p
WHERE NOT EXISTS (SELECT 1 FROM public.blocks b WHERE b.project_id = p.id)
ORDER BY p.created_at
LIMIT 8;

-- ============================================================================
-- 7. HOUSE_UNITS (24) — 3 per block, varied status
-- ============================================================================
INSERT INTO public.house_units (block_id, unit_number, type, size_m2, price_rupiah, status)
SELECT
  b.id,
  LPAD((gs.n)::text, 3, '0'),
  (ARRAY['36/72', '45/90', '54/108', '70/120'])[1 + (gs.n % 4)]::text,
  (ARRAY[36, 45, 54, 70])[1 + (gs.n % 4)],
  ((ARRAY[450000000, 600000000, 750000000, 950000000])[1 + (gs.n % 4)] + (random() * 50000000)::int)::numeric(14,2),
  (ARRAY['available', 'available', 'booked', 'sold'])[1 + ((b.sort_order + gs.n) % 4)]::text
FROM public.blocks b
CROSS JOIN LATERAL generate_series(1, 3) AS gs(n)
WHERE NOT EXISTS (SELECT 1 FROM public.house_units hu WHERE hu.block_id = b.id)
LIMIT 24;

-- ============================================================================
-- 8. SUPPLIERS (6) — realistic property developer suppliers
-- ============================================================================
INSERT INTO public.suppliers (name, code, contact_name, phone, email, address, is_active)
SELECT
  name, code, contact, phone, email, address, true
FROM (VALUES
  ('PT Semen Tiga Roda', 'SUP-001', 'Bp. Hendro', '031-5551234', 'sales@tigaroda.co.id', 'Jl. Industri 12, Gresik'),
  ('CV Besi Baja Nusantara', 'SUP-002', 'Bp. Sutrisno', '031-5555678', 'order@bbn.co.id', 'Jl. Raya Buduran 8, Sidoarjo'),
  ('Toko Bangunan Jaya', 'SUP-003', 'Bp. Hartono', '031-5559012', 'jaya.bangunan@gmail.com', 'Jl. Mayjend Sungkono 45, Surabaya'),
  ('PT Keramik Indah', 'SUP-004', 'Ibu Lina', '031-5553456', 'order@keramikindah.co.id', 'Jl. Rungkut Industri 22, Surabaya'),
  ('CV Cat Warna Sejati', 'SUP-005', 'Bp. Wibowo', '031-5557890', 'warna.sejati@gmail.com', 'Jl. Jemursari 17, Surabaya'),
  ('PT Pintu Aluminium Makmur', 'SUP-006', 'Bp. Surya', '031-5552345', 'sales@almakmur.co.id', 'Jl. Rungkut Megah 5, Surabaya')
) AS v(name, code, contact, phone, email, address)
WHERE NOT EXISTS (SELECT 1 FROM public.suppliers s WHERE s.code = v.code);

-- ============================================================================
-- 9. MATERIALS (10) — common construction materials with realistic prices
-- ============================================================================
INSERT INTO public.materials (name, code, category, unit, standard_price_rupiah, is_active)
SELECT
  name, code, category, unit, price, true
FROM (VALUES
  ('Semen Portland 50kg',  'MAT-001', 'semen',    'sak',   65000),
  ('Pasir Cor',            'MAT-002', 'pasir',    'm3',    280000),
  ('Batu Split',           'MAT-003', 'batu',     'm3',    350000),
  ('Besi Beton 10mm',      'MAT-004', 'besi',     'lonjor',75000),
  ('Besi Beton 12mm',      'MAT-005', 'besi',     'lonjor',105000),
  ('Bata Merah Press',     'MAT-006', 'bata',     'pcs',   1200),
  ('Keramik 30x30',        'MAT-007', 'keramik',  'dus',   65000),
  ('Cat Tembok 5kg',       'MAT-008', 'cat',      'kaleng',125000),
  ('Paku 5cm',             'MAT-009', 'paku',     'kg',    22000),
  ('Pintu Aluminium',      'MAT-010', 'pintu',    'unit',  850000)
) AS v(name, code, category, unit, price)
WHERE NOT EXISTS (SELECT 1 FROM public.materials m WHERE m.code = v.code);

-- ============================================================================
-- 10. PURCHASE_REQUESTS (4)
-- ============================================================================
INSERT INTO public.purchase_requests (code, project_id, requester_id, title, description, needed_by, status, approver_id, approved_at, notes)
SELECT
  v.code,
  (SELECT id FROM public.projects ORDER BY random() LIMIT 1),
  (SELECT id FROM public.users WHERE role = 'pic_divisi' LIMIT 1),
  v.title,
  v.description,
  (now() + (random() * interval '14 days'))::date,
  v.status,
  (SELECT id FROM public.users WHERE full_name = 'Pak Ardian' LIMIT 1),
  CASE WHEN v.status IN ('approved', 'completed') THEN now() - interval '2 days' ELSE NULL END,
  v.notes
FROM (VALUES
  ('PR-2026-001', 'pending',  'Besi Beton 12mm',   'Besi beton 12mm untuk kolom lantai 2', 'Butuh 200 lonjor dalam 7 hari'),
  ('PR-2026-002', 'approved', 'Semen 200 sak',     'Semen 200 sak untuk pekerjaan struktur', 'Stok semen menipis, urgent'),
  ('PR-2026-003', 'pending',  'Keramik 30x30',     'Keramik 30x30 untuk lantai 30 unit', 'Pengerjaan lantai sudah dimulai'),
  ('PR-2026-004', 'pending',  'Cat Tembok 5kg',    'Cat tembok 50 kaleng untuk finishing', 'Tahap akhir finishing cluster B')
) AS v(code, status, title, description, notes)
WHERE NOT EXISTS (SELECT 1 FROM public.purchase_requests pr WHERE pr.code = v.code);

-- ============================================================================
-- 11. PURCHASE_ORDERS (3)
-- ============================================================================
INSERT INTO public.purchase_orders (code, request_id, supplier_id, project_id, total_rupiah, status, order_date, expected_date, notes)
SELECT
  v.code,
  (SELECT id FROM public.purchase_requests ORDER BY created_at LIMIT 1 OFFSET (v.idx - 1)),
  (SELECT id FROM public.suppliers ORDER BY random() LIMIT 1),
  (SELECT id FROM public.projects ORDER BY random() LIMIT 1),
  v.total,
  v.status,
  now() - interval '3 days',
  (now() + interval '7 days')::date,
  v.notes
FROM (VALUES
  (1, 'PO-2026-001', 'sent',      13500000, 'PO untuk semen + besi kolom'),
  (2, 'PO-2026-002', 'confirmed',  9700000,  'PO untuk keramik batch 1'),
  (3, 'PO-2026-003', 'draft',      6000000,  'PO untuk finishing cat')
) AS v(idx, code, status, total, notes)
WHERE NOT EXISTS (SELECT 1 FROM public.purchase_orders po WHERE po.code = v.code);

-- ============================================================================
-- 12. MAINTENANCE_TICKETS (5) — realistic post-handover complaints
-- ============================================================================
INSERT INTO public.maintenance_tickets (code, title, description, reported_by_id, assigned_to_id, priority, status, category, reported_at)
SELECT
  v.code,
  v.title,
  v.description,
  (SELECT id FROM public.users WHERE role = 'owner' LIMIT 1),
  (SELECT id FROM public.users WHERE role = 'staff' LIMIT 1),
  v.priority,
  v.status,
  v.category,
  v.reported_at
FROM (VALUES
  ('MT-001', 'Atap bocor di ruang tamu',     'Air masuk saat hujan deras, plafit rusak',  'high',  'in_progress', 'structural', now() - interval '5 days'),
  ('MT-002', 'Pintu kamar mandi macet',      'Pintu geser tidak bisa dibuka tutup',     'normal','open',         'plumbing',  now() - interval '3 days'),
  ('MT-003', 'Lampu taman mati',             '3 lampu taman blok B mati total',          'low',   'resolved',    'electrical',now() - interval '10 days'),
  ('MT-004', 'Cat dinding mengelupas',       'Dinding ruang keluarga cat-nya mengelupas', 'normal','open',         'finishing', now() - interval '2 days'),
  ('MT-005', 'Kran dapur bocor',             'Tetesan air terus-menerus dari kran',      'high',  'in_progress', 'plumbing',  now() - interval '1 day')
) AS v(code, title, description, priority, status, category, reported_at)
WHERE NOT EXISTS (SELECT 1 FROM public.maintenance_tickets mt WHERE mt.code = v.code);

-- ============================================================================
-- 13. MAINTENANCE_LOGS (4) — activity log per ticket
-- ============================================================================
INSERT INTO public.maintenance_logs (ticket_id, actor_id, action, from_status, to_status, message)
SELECT
  mt.id,
  (SELECT id FROM public.users WHERE role = 'staff' LIMIT 1),
  v.action,
  v.from_status,
  v.to_status,
  v.message
FROM (VALUES
  ('MT-001', 'status_change', 'open',         'in_progress', 'Tim konstruksi dijadwalkan datang Kamis'),
  ('MT-002', 'comment',        'open',         'open',         'Belum ada tukang yang tersedia minggu ini'),
  ('MT-003', 'status_change', 'in_progress',  'resolved',    'Lampu diganti, berfungsi normal'),
  ('MT-004', 'comment',        'open',         'open',         'Customer foto kerusakan sudah diterima')
) AS v(code, action, from_status, to_status, message)
JOIN public.maintenance_tickets mt ON mt.code = v.code
WHERE NOT EXISTS (
  SELECT 1 FROM public.maintenance_logs ml
  WHERE ml.ticket_id = mt.id AND ml.action = v.action AND ml.message = v.message
);

-- ============================================================================
-- 14. APPROVALS (3) — pending owner decisions
-- ============================================================================
INSERT INTO public.approvals (requester_id, approver_id, title, description, kind, status, amount, decision_note)
SELECT
  (SELECT id FROM public.users WHERE role = 'pic_divisi' LIMIT 1),
  (SELECT id FROM public.users WHERE full_name = 'Pak Ardian' LIMIT 1),
  v.title,
  v.description,
  v.kind,
  v.status,
  v.amount,
  v.note
FROM (VALUES
  ('Pengadaan semen 200 sak',  'Butuh untuk pekerjaan struktur lantai 2 cluster C', 'spending', 'pending', 13000000, NULL),
  ('Cuti tahunan Sinta',       'Pengajuan cuti 5 hari kerja 18-22 Agustus 2026',     'leave',    'pending', NULL,     NULL),
  ('Akses dashboard purchasing', 'Sinta butuh akses read-only modul purchasing',    'access',   'pending', NULL,     NULL)
) AS v(title, description, kind, status, amount, note)
WHERE NOT EXISTS (SELECT 1 FROM public.approvals a WHERE a.title = v.title);

-- ============================================================================
-- 15. AUDIT_LOGS (5) — recent activity
-- ============================================================================
INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data, created_at)
SELECT
  (SELECT id FROM public.users WHERE full_name = 'Pak Ardian' LIMIT 1),
  v.action,
  v.table_name,
  gen_random_uuid(),
  v.new_data::jsonb,
  v.created_at
FROM (VALUES
  ('INSERT', 'approvals',     '{"title":"Pengadaan semen"}',                         now() - interval '2 hours'),
  ('UPDATE', 'users',         '{"field":"skills","old":null,"new":["leadership"]}',  now() - interval '5 hours'),
  ('INSERT', 'bookings',      '{"customer_name":"Pak Sumardi","status":"confirmed"}', now() - interval '1 day'),
  ('UPDATE', 'kpi_targets',   '{"target_value":{"old":120,"new":240}}',              now() - interval '6 hours'),
  ('INSERT', 'maintenance_tickets', '{"title":"Atap bocor","priority":"high"}',       now() - interval '5 days')
) AS v(action, table_name, new_data, created_at)
WHERE NOT EXISTS (
  SELECT 1 FROM public.audit_logs al
  WHERE al.action = v.action AND al.table_name = v.table_name
);

COMMIT;
