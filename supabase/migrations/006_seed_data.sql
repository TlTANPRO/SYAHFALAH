-- 006_seed_data.sql
-- Seed data from Program Kerja document for PT Syahfalah Global + PT Lembayung Wanantara Padha + Grup Majang Mejeng

-- ============================================
-- COMPANIES
-- ============================================
INSERT INTO companies (id, name, subsidiaries, fiscal_year) VALUES
('11111111-1111-1111-1111-111111111111', 'PT Syahfalah Global', 
 ARRAY['PT Lembayung Wanantara Padha', 'Grup Majang Mejeng'], 
 '2026');

-- ============================================
-- DIVISIONS
-- ============================================
INSERT INTO divisions (id, company_id, name, code, description, pic_id, parent_id) VALUES
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Owner / Director', 'OWN', 'Strategic leadership and ownership', NULL, NULL),
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Legal / Compliance', 'LGL', 'Legal affairs, contracts, compliance', NULL, NULL),
('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Marketing & Sales', 'MKT', 'Lead generation, sales, customer acquisition', NULL, NULL),
('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Proyek & Konstruksi', 'PRJ', 'Project execution, construction, quality control', NULL, NULL),
('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'Operasional & Admin', 'OPS', 'Finance, purchasing, administration', NULL, NULL),
('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'Media & Konten Kreatif', 'MED', 'Content creation, social media, branding', NULL, NULL);

-- ============================================
-- USERS (13 karyawan + 1 Owner)
-- Default PIN: 0000 (hashed with PBKDF2)
-- ============================================
INSERT INTO users (id, company_id, division_id, name, email, phone, role, position, pin_hash, pin_salt, avatar_url, is_active, join_date, reports_to) VALUES
-- Owner
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 
 'Pak Ardian', 'ardian@syahfalah.com', '+628****7890', 'owner', 'Owner / Director',
 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 
 '00000000000000000000000000000000', NULL, TRUE, '2020-01-01', NULL),

-- Legal / Co-Director
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333',
 'Bu Nisya', 'nisya@syahfalah.com', '+628****7891', 'pic_divisi', 'Legal / Co-Director',
 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
 '00000000000000000000000000000000', NULL, TRUE, '2021-03-15', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),

-- Kepala Kantor + Marketing
('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444',
 'Mada', 'mada@syahfalah.com', '+628****7892', 'kepala_kantor', 'Kepala Kantor + Marketing',
 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
 '00000000000000000000000000000000', NULL, TRUE, '2021-06-01', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),

-- Marketing Sales
('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444',
 'Riza', 'riza@syahfalah.com', '+628****7893', 'staff', 'Marketing Sales',
 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
 '00000000000000000000000000000000', NULL, TRUE, '2022-01-15', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),

('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444',
 'Yudi/Sdek', 'yudi@syahfalah.com', '+628****7894', 'staff', 'Marketing + Maintenance + Proyek',
 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
 '00000000000000000000000000000000', NULL, TRUE, '2022-03-01', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),

('ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444',
 'Amir', 'amir@syahfalah.com', '+628****7895', 'staff', 'Marketing + Konstruksi',
 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
 '00000000000000000000000000000000', NULL, TRUE, '2022-05-01', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),

-- Proyek & Konstruksi
('11111111-2222-3333-4444-555555555555', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555',
 'Rizal', 'rizal@syahfalah.com', '+628****7896', 'pic_divisi', 'Kepala Proyek',
 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
 '00000000000000000000000000000000', NULL, TRUE, '2021-09-01', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),

-- Operasional & Admin
('22222222-3333-4444-5555-666666666666', '11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666',
 'Novita', 'novita@syahfalah.com', '+628****7897', 'staff', 'Admin Keuangan + Bank',
 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
 '00000000000000000000000000000000', NULL, TRUE, '2021-11-01', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),

('33333333-4444-5555-6666-777777777777', '11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666',
 'Sinta', 'sinta@syahfalah.com', '+628****7898', 'staff', 'Purchasing',
 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
 '00000000000000000000000000000000', NULL, TRUE, '2022-02-01', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),

-- Media & Konten Kreatif
('44444444-5555-6666-7777-888888888888', '11111111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777777',
 'Reni', 'reni@syahfalah.com', '+628****7899', 'pic_divisi', 'Ketua Media (Majang Mejeng)',
 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
 '00000000000000000000000000000000', NULL, TRUE, '2022-04-01', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),

('55555555-6666-7777-8888-999999999999', '11111111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777777',
 'Rifki', 'rifki@syahfalah.com', '+628****7800', 'staff', 'Ketua Kreatif',
 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
 '00000000000000000000000000000000', NULL, TRUE, '2022-06-01', '44444444-5555-6666-7777-888888888888'),

('66666666-7777-8888-9999-000000000000', '11111111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777777',
 'Reta', 'reta@syahfalah.com', '+628****7801', 'staff', 'Penulis',
 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
 '00000000000000000000000000000000', NULL, TRUE, '2022-07-01', '44444444-5555-6666-7777-888888888888');

-- Update divisions with PIC IDs
UPDATE divisions SET pic_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' WHERE id = '22222222-2222-2222-2222-222222222222';
UPDATE divisions SET pic_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' WHERE id = '33333333-3333-3333-3333-333333333333';
UPDATE divisions SET pic_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' WHERE id = '44444444-4444-4444-4444-444444444444';
UPDATE divisions SET pic_id = '11111111-2222-3333-4444-555555555555' WHERE id = '55555555-5555-5555-5555-555555555555';
UPDATE divisions SET pic_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' WHERE id = '66666666-6666-6666-6666-666666666666';
UPDATE divisions SET pic_id = '44444444-5555-6666-7777-888888888888' WHERE id = '77777777-7777-7777-7777-777777777777';

-- ============================================
-- SOWs (Scope of Work) - 13 positions
-- ============================================
INSERT INTO sows (id, company_id, division_id, position_id, position_name, tujuan_posisi, pic_pendamping, tools, kpi_ringkasan, version, is_active) VALUES
-- Owner
('s1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
 'owner_director', 'Owner / Director',
 'Menetapkan arah strategis perusahaan dan memastikan profit, ekspansi, serta keberlanjutan jangka panjang.',
 ARRAY['cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-3333-4444-5555-666666666666'],
 ARRAY['Strategic Planning', 'Financial Review', 'Board Meetings'],
 'Meeting 100% · Profit YoY 15% · 1 ekspansi/tahun', 1, TRUE),

-- Legal
('s2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333',
 'legal_compliance', 'Legal / Co-Director',
 'Mengelola seluruh legalitas perusahaan, kontrak, SHM/AJB, dan compliance.',
 ARRAY['cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-3333-4444-5555-666666666666', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'],
 ARRAY['Document Management', 'BPN System', 'Notary Portal'],
 'SHM <30 hari 100% · Kontrak zero error · Compliance 4x/tahun', 1, TRUE),

-- Kepala Kantor
('s3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444',
 'kepala_kantor', 'Kepala Kantor + Marketing',
 'Menjalankan operasional harian perusahaan, memastikan seluruh PIC divisi mencapai KPI, dan melaporkan ke Owner.',
 ARRAY['dddddddd-dddd-dddd-dddd-dddddddddddd', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-2222-3333-4444-555555555555', '22222222-3333-4444-5555-666666666666', '33333333-4444-5555-6666-777777777777', '44444444-5555-6666-7777-888888888888', '55555555-6666-7777-8888-999999999999', '66666666-7777-8888-9999-000000000000'],
 ARRAY['Dashboard', 'Google Sheets', 'WhatsApp', 'CRM'],
 'Closing tim 6 unit · DEM Seluruh lokasi · Dashboard real-time', 1, TRUE),

-- Marketing Sales - Riza
('s4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444',
 'marketing_sales', 'Marketing Sales',
 'Menghasilkan leads berkualitas dan menutup penjualan unit rumah.',
 ARRAY['eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '22222222-3333-4444-5555-666666666666', 'cccccccc-cccc-cccc-cccc-cccccccccccc'],
 ARRAY['WhatsApp Business', 'CRM', 'Google Sheets', 'Instagram/FB/TikTok Ads'],
 '200 leads · 10 survey · 6 closing · Response <30 menit', 1, TRUE),

-- Marketing + Maintenance + Proyek - Yudi
('s5555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444',
 'marketing_maintenance_proyek', 'Marketing + Maintenance + Proyek',
 'Membangun unit rumah sesuai schedule, budget, kualitas. Maintenance rumah contoh & fasum. 100% pendampingan survey lokasi.',
 ARRAY['11111111-2222-3333-4444-555555555555', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'dddddddd-dddd-dddd-dddd-dddddddddddd'],
 ARRAY['Google Sheets', 'Maintenance Log', 'QC Checklist'],
 '20 lead walk-in · Maintenance 100%/minggu · QC 2x/minggu · 1-2 closing', 1, TRUE),

-- Marketing + Konstruksi - Amir
('s6666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555',
 'marketing_konstruksi', 'Marketing + Konstruksi',
 'Menghasilkan leads berkualitas dan menutup penjualan unit rumah serta mendongkrak omset Majang Mejeng konstruksi.',
 ARRAY['11111111-2222-3333-4444-555555555555', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '55555555-5555-5555-555555555555'],
 ARRAY['Project Tools', 'QC Checklist', 'WhatsApp', 'CRM'],
 'Proyek on-time 100% · Revenue eksternal 100jt/bulan · 1-2 closing', 1, TRUE),

-- Admin Keuangan - Novita
('s7777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666',
 'admin_keuangan', 'Admin Keuangan + Bank',
 'Mengelola administrasi keuangan harian, pemberkasan konsumen, dan rekonsiliasi bank.',
 ARRAY['dddddddd-dddd-dddd-dddd-dddddddddddd', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc'],
 ARRAY['Bank Portal', 'Google Sheets', 'CRM'],
 'Pemberkasan 7 hari · SP3K 14 hari · Zero error · CRM 100%', 1, TRUE),

-- Kepala Proyek - Rizal
('s8888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555',
 'kepala_proyek', 'Kepala Proyek',
 'Menjalankan operasional harian proyek, memastikan pelaksanaan sesuai timeline, budget, dan kualitas.',
 ARRAY['ffffffff-ffff-ffff-ffff-ffffffffffff', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '33333333-4444-5555-6666-777777777777', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-3333-4444-5555-666666666666'],
 ARRAY['Project Management', 'Google Sheets', 'QC Tools'],
 'Proyek on-time 100% · QC PASS 100% · Budget var max 5%', 1, TRUE),

-- Purchasing - Sinta
('s9999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666',
 'purchasing', 'Purchasing',
 'Memastikan material dan jasa tersedia tepat waktu, tepat spec, tepat harga.',
 ARRAY['11111111-2222-3333-4444-555555555555', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'],
 ARRAY['Vendor Database', 'Google Sheets', 'PO System'],
 'Material on-time 100% · Stok min 100% · PO 0 error · Hemat 3%', 1, TRUE),

-- Ketua Media - Reni
('saaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777777',
 'ketua_media', 'Ketua Media (Majang Mejeng)',
 'Memproduksi konten berkualitas untuk mendukung brand awareness dan lead generation.',
 ARRAY['55555555-6666-7777-8888-999999999999', '66666666-7777-8888-9999-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'ffffffff-ffff-ffff-ffff-ffffffffffff'],
 ARRAY['Instagram', 'TikTok', 'Canva', 'Meta Business Suite'],
 '20 konten/bulan · IG ER 3% · 50 lead dari konten', 1, TRUE),

-- Ketua Kreatif - Rifki
('sbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777777',
 'ketua_kreatif', 'Ketua Kreatif',
 'Memproduksi konten berkualitas untuk mendukung brand awareness dan lead generation. Memonetisasi seluruh akun Majang Mejeng Media.',
 ARRAY['saaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-7777-8888-9999-000000000000'],
 ARRAY['Video Editor', 'Canva', 'Trend Research Tools'],
 '20 konten Viral · 1000K views · 2 Penjualan/bulan · Monetisasi', 1, TRUE),

-- Penulis - Reta
('sccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777777',
 'penulis', 'Penulis',
 'Memproduksi konten berkualitas untuk mendukung brand awareness dan lead generation.',
 ARRAY['55555555-6666-7777-8888-999999999999', 'saaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'],
 ARRAY['Writing Tools', 'SEO Tools', 'WhatsApp'],
 '20 script · Revisi max 1x · 20 konten published', 1, TRUE);

-- ============================================
-- SOW TASKS
-- ============================================
-- Owner tasks
INSERT INTO sow_tasks (sow_id, title, description, frequency, related_kpi_codes, order_index) VALUES
('s1111111-1111-1111-1111-111111111111', 'Menetapkan visi, misi, strategi bisnis grup', 'Strategic planning for all entities', 'monthly', ARRAY['OWN-STRAT-01'], 1),
('s1111111-1111-1111-1111-111111111111', 'Approval akhir semua pengeluaran > Rp 10 juta', 'Financial approval authority', 'as_needed', ARRAY['OWN-FIN-01'], 2),
('s1111111-1111-1111-1111-111111111111', 'Audit triwulan: profit, cashflow, risiko, SDM', 'Quarterly business review', 'quarterly', ARRAY['OWN-AUDIT-01'], 3),
('s1111111-1111-1111-1111-111111111111', 'Keputusan ekspansi (proyek baru, cabang baru)', 'Expansion decisions', 'as_needed', ARRAY['OWN-EXP-01'], 4),
('s1111111-1111-1111-1111-111111111111', 'Review mingguan dashboard owner (via WA Mada)', 'Weekly dashboard review', 'weekly', ARRAY['OWN-REVIEW-01'], 5);

-- Legal tasks
INSERT INTO sow_tasks (sow_id, title, description, frequency, related_kpi_codes, order_index) VALUES
('s2222222-2222-2222-2222-222222222222', 'Urus semua dokumen legal grup', 'Legal document management', 'daily', ARRAY['LGL-DOC-01'], 1),
('s2222222-2222-2222-2222-222222222222', 'SHM, AJB, IMB/PBG, perizinan konstruksi', 'Property legal documents', 'as_needed', ARRAY['LGL-SHM-01'], 2),
('s2222222-2222-2222-2222-222222222222', 'Kontrak: konsumen, vendor, mitra, karyawan', 'Contract management', 'as_needed', ARRAY['LGL-CONTRACT-01'], 3),
('s2222222-2222-2222-2222-222222222222', 'Legal opinion untuk keputusan bisnis > Rp 5 juta', 'Legal advisory', 'as_needed', ARRAY['LGL-OPINION-01'], 4),
('s2222222-2222-2222-2222-222222222222', 'Arsip dokumen (hardcopy + softcopy di Drive)', 'Document archiving', 'daily', ARRAY['LGL-ARCHIVE-01'], 5),
('s2222222-2222-2222-2222-222222222222', 'Koordinasi notaris, BPN, pengadilan', 'External coordination', 'as_needed', ARRAY['LGL-COORD-01'], 6),
('s2222222-2222-2222-2222-222222222222', 'Compliance check UU PDP, UU Cipta Kerja, FLPP', 'Regulatory compliance', 'quarterly', ARRAY['LGL-COMPLY-01'], 7);

-- Kepala Kantor tasks
INSERT INTO sow_tasks (sow_id, title, description, frequency, related_kpi_codes, order_index) VALUES
('s3333333-3333-3333-3333-333333333333', 'Eksekusi harian seluruh operasional grup', 'Daily operations execution', 'daily', ARRAY['KK-OPS-01'], 1),
('s3333333-3333-3333-3333-333333333333', 'Manajemen tim + delegation', 'Team management', 'daily', ARRAY['KK-TEAM-01'], 2),
('s3333333-3333-3333-3333-333333333333', 'Briefing pagi (08.00) + laporan sore (16.30)', 'Daily briefings', 'daily', ARRAY['KK-BRIEF-01'], 3),
('s3333333-3333-3333-3333-333333333333', 'Monitoring KPI semua personal via dashboard', 'KPI monitoring', 'daily', ARRAY['KK-KPI-01'], 4),
('s3333333-3333-3333-3333-333333333333', 'Closing support untuk lead VIP/stuck', 'Sales closing support', 'as_needed', ARRAY['KK-CLOSE-01'], 5),
('s3333333-3333-3333-3333-333333333333', 'Approval pengeluaran Rp 0–1 juta', 'Operational approval', 'as_needed', ARRAY['KK-APPROVE-01'], 6),
('s3333333-3333-3333-3333-333333333333', 'Laporan mingguan ke Owner via WA + dashboard', 'Weekly reporting', 'weekly', ARRAY['KK-REPORT-01'], 7),
('s3333333-3333-3333-3333-333333333333', 'Backup survey lokasi', 'Survey backup', 'as_needed', ARRAY['KK-SURVEY-01'], 8),
('s3333333-3333-3333-3333-333333333333', 'Koordinasi lintas divisi', 'Cross-division coordination', 'daily', ARRAY['KK-COORD-01'], 9),
('s3333333-3333-3333-3333-333333333333', 'Update Google Sheet harian/Dashboard', 'Data updates', 'daily', ARRAY['KK-DATA-01'], 10);

-- Riza (Marketing Sales) tasks
INSERT INTO sow_tasks (sow_id, title, description, frequency, related_kpi_codes, order_index) VALUES
('s4444444-4444-4444-4444-444444444444', 'Handle lead masuk dari semua channel', 'Lead handling from IG, FB, TikTok, Web, Walk-in', 'daily', ARRAY['MKT-LEAD-01'], 1),
('s4444444-4444-4444-4444-444444444444', 'Follow up semua lead sampai closing/diskualifikasi', 'Lead follow-up pipeline', 'daily', ARRAY['MKT-FOLLOW-01'], 2),
('s4444444-4444-4444-4444-444444444444', 'Survey lokasi + matching lead dengan unit', 'Site survey and matching', 'daily', ARRAY['MKT-SURVEY-01'], 3),
('s4444444-4444-4444-4444-444444444444', 'Closing call + negosiasi harga, cara bayar, timeline', 'Closing negotiation', 'daily', ARRAY['MKT-CLOSE-01'], 4),
('s4444444-4444-4444-4444-444444444444', 'Input data lead ke Google Sheet (real-time)', 'Data entry', 'daily', ARRAY['MKT-DATA-01'], 5),
('s4444444-4444-4444-4444-444444444444', 'Koordinasi dengan Novita untuk pemberkasan', 'Admin coordination', 'daily', ARRAY['MKT-ADMIN-01'], 6),
('s4444444-4444-4444-4444-444444444444', 'Update CRM setiap ada perubahan status lead', 'CRM updates', 'daily', ARRAY['MKT-CRM-01'], 7),
('s4444444-4444-4444-4444-444444444444', 'Briefing content brief ke tim media', 'Content briefing', 'as_needed', ARRAY['MKT-CONTENT-01'], 8),
('s4444444-4444-4444-4444-444444444444', 'Hadiri serah terima sebagai tim marketing', 'Handover attendance', 'as_needed', ARRAY['MKT-HANDOVER-01'], 9);

-- Yudi tasks
INSERT INTO sow_tasks (sow_id, title, description, frequency, related_kpi_codes, order_index) VALUES
('s5555555-5555-5555-5555-555555555555', 'Handle lead walk-in + lead dari acara', 'Walk-in and event leads', 'daily', ARRAY['MKT-WALKIN-01'], 1),
('s5555555-5555-5555-5555-555555555555', 'Maintenance rumah contoh + fasum', 'Property maintenance', 'weekly', ARRAY['MKT-MAINT-01'], 2),
('s5555555-5555-5555-5555-555555555555', 'Bantu pelaksanaan proyek di lapangan', 'Project field support', 'daily', ARRAY['PRJ-FIELD-01'], 3),
('s5555555-5555-5555-5555-555555555555', 'QC pergudangan', 'Warehouse QC', 'weekly', ARRAY['PRJ-QC-01'], 4),
('s5555555-5555-5555-5555-555555555555', 'Pemeliharaan infrastruktur cluster', 'Infrastructure maintenance', 'monthly', ARRAY['PRJ-INFRA-01'], 5),
('s5555555-5555-5555-5555-555555555555', 'Update progress ke Rizal setiap hari', 'Daily progress report', 'daily', ARRAY['PRJ-PROGRESS-01'], 6),
('s5555555-5555-5555-5555-555555555555', 'Input data ke Google Sheet', 'Data entry', 'daily', ARRAY['MKT-DATA-01'], 7),
('s5555555-5555-5555-5555-555555555555', 'Backup closing Riza', 'Closing backup', 'as_needed', ARRAY['MKT-BACKUP-01'], 8),
('s5555555-5555-5555-5555-555555555555', 'Hadiri serah terima', 'Handover attendance', 'as_needed', ARRAY['MKT-HANDOVER-01'], 9);

-- Amir tasks
INSERT INTO sow_tasks (sow_id, title, description, frequency, related_kpi_codes, order_index) VALUES
('s6666666-6666-6666-6666-666666666666', 'Eksekusi proyek internal + eksternal', 'Project execution', 'daily', ARRAY['PRJ-EXEC-01'], 1),
('s6666666-6666-6666-6666-666666666666', 'Bantu penjualan rumah proyek', 'Sales support', 'daily', ARRAY['MKT-SUPPORT-01'], 2),
('s6666666-6666-6666-6666-666666666666', 'QC pergudangan material + alat', 'Warehouse QC', 'weekly', ARRAY['PRJ-QC-01'], 3),
('s6666666-6666-6666-6666-666666666666', 'Survey lokasi (back cover Riza)', 'Survey backup', 'daily', ARRAY['MKT-SURVEY-01'], 4),
('s6666666-6666-6666-6666-666666666666', 'Handle lead referral', 'Referral leads', 'as_needed', ARRAY['MKT-REFERRAL-01'], 5),
('s6666666-6666-6666-6666-666666666666', 'Update progress proyek ke Rizal', 'Progress reporting', 'daily', ARRAY['PRJ-PROGRESS-01'], 6),
('s6666666-6666-6666-6666-666666666666', 'Lapor fee konstruksi eksternal ke Mada', 'Revenue reporting', 'monthly', ARRAY['PRJ-REVENUE-01'], 7),
('s6666666-6666-6666-6666-666666666666', 'Hadiri serah terima', 'Handover attendance', 'as_needed', ARRAY['MKT-HANDOVER-01'], 8);

-- Novita tasks
INSERT INTO sow_tasks (sow_id, title, description, frequency, related_kpi_codes, order_index) VALUES
('s7777777-7777-7777-7777-777777777777', 'Administrasi keuangan harian', 'Daily finance admin', 'daily', ARRAY['FIN-ADMIN-01'], 1),
('s7777777-7777-7777-7777-777777777777', 'Pemberkasan konsumen (2-3 konsumen/hari)', 'Client documentation', 'daily', ARRAY['FIN-DOCS-01'], 2),
('s7777777-7777-7777-7777-777777777777', 'Submit SP3K ke bank + follow up analis', 'SP3K processing', 'daily', ARRAY['FIN-SP3K-01'], 3),
('s7777777-7777-7777-7777-777777777777', 'Koordinasi akad kredit', 'Credit coordination', 'as_needed', ARRAY['FIN-AKAD-01'], 4),
('s7777777-7777777-7777-7777-777777777777', 'Rekonsiliasi bank mingguan', 'Bank reconciliation', 'weekly', ARRAY['FIN-RECON-01'], 5),
('s7777777-7777-7777-7777-777777777777', 'Backup survey lokasi', 'Survey backup', 'as_needed', ARRAY['MKT-SURVEY-01'], 6),
('s7777777-7777-7777-7777-777777777777', 'Input data ke Google Sheet', 'Data entry', 'daily', ARRAY['FIN-DATA-01'], 7),
('s7777777-7777-7777-7777-777777777777', 'Update CRM status berkas', 'CRM updates', 'daily', ARRAY['FIN-CRM-01'], 8),
('s7777777-7777-7777-7777-777777777777', 'Hadiri serah terima sebagai admin bank', 'Handover attendance', 'as_needed', ARRAY['FIN-HANDOVER-01'], 9);

-- Rizal tasks
INSERT INTO sow_tasks (sow_id, title, description, frequency, related_kpi_codes, order_index) VALUES
('s8888888-8888-8888-8888-888888888888', 'Perencanaan proyek (timeline, budget, material, manpower)', 'Project planning', 'monthly', ARRAY['PRJ-PLAN-01'], 1),
('s8888888-8888-8888-8888-888888888888', 'Pelaksanaan proyek di lapangan', 'Field execution', 'daily', ARRAY['PRJ-FIELD-01'], 2),
('s8888888-8888-8888-8888-888888888888', 'Manajemen vendor (subkon, supplier)', 'Vendor management', 'weekly', ARRAY['PRJ-VENDOR-01'], 3),
('s8888888-8888-8888-8888-888888888888', 'Quality control rumah + fasum', 'QC', 'daily', ARRAY['PRJ-QC-01'], 4),
('s8888888-8888-8888-8888-888888888888', 'QC pergudangan (dengan Amir + Yudi)', 'Warehouse QC', 'weekly', ARRAY['PRJ-QC-01'], 5),
('s8888888-8888-8888-8888-888888888888', 'Budget proyek + kontrol biaya', 'Budget control', 'weekly', ARRAY['PRJ-BUDGET-01'], 6),
('s8888888-8888-8888-8888-888888888888', 'Koordinasi dengan Bu Nisya + Novita', 'Cross-team coordination', 'weekly', ARRAY['PRJ-COORD-01'], 7),
('s8888888-8888-8888-8888-888888888888', 'Serah terima (cover, lead)', 'Handover', 'as_needed', ARRAY['PRJ-HANDOVER-01'], 8),
('s8888888-8888-8888-8888-888888888888', 'Manajemen tim proyek', 'Team management', 'daily', ARRAY['PRJ-TEAM-01'], 9),
('s8888888-8888-8888-8888-888888888888', 'Update progress real-time ke Sheet', 'Data updates', 'daily', ARRAY['PRJ-DATA-01'], 10);

-- Sinta tasks
INSERT INTO sow_tasks (sow_id, title, description, frequency, related_kpi_codes, order_index) VALUES
('s9999999-9999-9999-9999-999999999999', 'Beli material sesuai request Rizal', 'Material procurement', 'daily', ARRAY['PUR-BUY-01'], 1),
('s9999999-9999-9999-9999-999999999999', 'Manage vendor (database, negosiasi, evaluasi)', 'Vendor management', 'weekly', ARRAY['PUR-VENDOR-01'], 2),
('s9999999-9999-9999-9999-999999999999', 'Stok material di gudang', 'Stock management', 'daily', ARRAY['PUR-STOCK-01'], 3),
('s9999999-9999-9999-9999-999999999999', 'PO untuk semua pembelian', 'Purchase orders', 'daily', ARRAY['PUR-PO-01'], 4),
('s9999999-9999-9999-9999-999999999999', 'Penerimaan material + cek kualitas', 'Receiving & QC', 'daily', ARRAY['PUR-RECV-01'], 5),
('s9999999-9999-9999-9999-999999999999', 'Stock opname mingguan', 'Weekly stock take', 'weekly', ARRAY['PUR-OPNAME-01'], 6),
('s9999999-9999-9999-9999-999999999999', 'Budget purchasing + kontrol biaya', 'Budget control', 'monthly', ARRAY['PUR-BUDGET-01'], 7),
('s9999999-9999-9999-9999-999999999999', 'Update database vendor di Google Sheet', 'Vendor database', 'weekly', ARRAY['PUR-DATA-01'], 8);

-- Reni tasks
INSERT INTO sow_tasks (sow_id, title, description, frequency, related_kpi_codes, order_index) VALUES
('saaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Strategi media internal dan external grup', 'Media strategy', 'monthly', ARRAY['MED-STRAT-01'], 1),
('saaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Content calendar mingguan/bulanan', 'Content calendar', 'weekly', ARRAY['MED-CALENDAR-01'], 2),
('saaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Brief tim kreatif untuk produksi konten', 'Creative briefing', 'daily', ARRAY['MED-BRIEF-01'], 3),
('saaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Koordinasi dengan marketing untuk content brief', 'Cross-team coordination', 'daily', ARRAY['MED-COORD-01'], 4),
('saaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Monitoring engagement IG/TikTok/Web', 'Engagement monitoring', 'daily', ARRAY['MED-MONITOR-01'], 5),
('saaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Laporan mingguan ke Mada', 'Weekly reporting', 'weekly', ARRAY['MED-REPORT-01'], 6),
('saaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Fee tracking (Rp 250k/closing atau 50 leads/bulan)', 'Fee tracking', 'monthly', ARRAY['MED-FEE-01'], 7);

-- Rifki tasks
INSERT INTO sow_tasks (sow_id, title, description, frequency, related_kpi_codes, order_index) VALUES
('sbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Lead produksi konten Majang Mejeng Kreatif', 'Creative production lead', 'daily', ARRAY['MED-PROD-01'], 1),
('sbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Script + visual brief untuk Reta', 'Script & visual brief', 'daily', ARRAY['MED-SCRIPT-01'], 2),
('sbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Editing final konten (video, desain)', 'Editing', 'daily', ARRAY['MED-EDIT-01'], 3),
('sbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Quality control konten sebelum posting', 'QC content', 'daily', ARRAY['MED-QC-01'], 4),
('sbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Trend research mingguan (IG Reels, TikTok viral)', 'Trend research', 'weekly', ARRAY['MED-TREND-01'], 5),
('sbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Kolaborasi dengan Reni + Mada', 'Collaboration', 'daily', ARRAY['MED-COLLAB-01'], 6);

-- Reta tasks
INSERT INTO sow_tasks (sow_id, title, description, frequency, related_kpi_codes, order_index) VALUES
('sccccccc-cccc-cccc-cccc-cccccccccccc', 'Tulis script untuk video, caption, artikel', 'Script writing', 'daily', ARRAY['MED-WRITE-01'], 1),
('sccccccc-cccc-cccc-cccc-cccccccccccc', 'Riset topik + trending content', 'Topic research', 'daily', ARRAY['MED-RESEARCH-01'], 2),
('sccccccc-cccc-cccc-cccc-cccccccccccc', 'Copywriting untuk landing page, WA blast', 'Copywriting', 'as_needed', ARRAY['MED-COPY-01'], 3),
('sccccccc-cccc-cccc-cccc-cccccccccccc', 'SEO artikel blog', 'SEO writing', 'as_needed', ARRAY['MED-SEO-01'], 4),
('sccccccc-cccc-cccc-cccc-cccccccccccc', 'Kolaborasi dengan Rifki + Reni', 'Collaboration', 'daily', ARRAY['MED-COLLAB-01'], 5);

-- ============================================
-- KPIs - Company Level (Level 1)
-- ============================================
INSERT INTO kpis (id, company_id, division_id, user_id, code, name, description, level, formula, target, actual, unit, frequency, weight, evidence_required, parent_kpi_id, period_start, period_end) VALUES
-- Company KPIs (Level 1)
('k1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', NULL, NULL, 'COM-REV-01', 'Revenue', 'Total uang masuk dari penjualan + termin proyek', 'company', '(actual / target) * 100', 50000000000, 0, 'IDR', 'yearly', 25, FALSE, NULL, '2026-01-01', '2026-12-31'),
('k2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', NULL, NULL, 'COM-PM-01', 'Profit Margin', '(Laba bersih / Revenue) × 100%', 'company', '(actual / target) * 100', 15, 0, '%', 'yearly', 20, FALSE, NULL, '2026-01-01', '2026-12-31'),
('k3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', NULL, NULL, 'COM-ROE-01', 'ROE', '(Laba bersih / Ekuitas) × 100%', 'company', '(actual / target) * 100', 15, 0, '%', 'yearly', 15, FALSE, NULL, '2026-01-01', '2026-12-31'),
('k4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', NULL, NULL, 'COM-UNIT-01', 'Unit Delivered', 'Jumlah unit delivered on-time per tahun', 'company', '(actual / target) * 100', 100, 0, 'unit', 'yearly', 20, FALSE, NULL, '2026-01-01', '2026-12-31'),
('k5555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', NULL, NULL, 'COM-CF-01', 'Cashflow Positive', 'Arus kas > 0 setiap bulan', 'company', '(actual / target) * 100', 12, 0, 'month', 'yearly', 10, FALSE, NULL, '2026-01-01', '2026-12-31'),
('k6666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', NULL, NULL, 'COM-REPEAT-01', 'Repeat Order', '% konsumen beli lagi atau refer', 'company', '(actual / target) * 100', 15, 0, '%', 'yearly', 5