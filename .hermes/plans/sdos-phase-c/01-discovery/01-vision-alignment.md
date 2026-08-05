# DOMAIN 1 — VISION ALIGNMENT DOCUMENT
**Status**: Draft v0.1 (awaiting stakeholder review)  
**Owner**: Mada (Kepala Kantor) → Pak Ardian (Owner)

## Visi Perusahaan (current understanding)

PT Syahfalah Global + PT Lembayung Wanantara Padha + Grup Majang Mejeng = **developer housing** dengan karakter:
- Multi-cluster property development (Grati, Pasuruan, Jember, dll)
- Marketing pipeline Lead → Survey → Booking → SP3K → Akad → Serah Terima → Maintenance
- Multi-divisi saling bergantung (Marketing → Legal → Project → Finance → Maintenance)

## Visi Sistem (PRD-aligned)

**"Syahfalah Developer OS (SDOS) — pusat kendali operasional real-time yang memungkinkan CEO memahami kondisi perusahaan dalam 30 detik"** — see PRD §1.

## Realistic Gap Analysis

| Visi Klaim | Realistic Restatement |
|---|---|
| "30 detik CEO tau semua" | 30 detik = topbar summary only (✓ achievable). 2 menit = full deep scan (← realistic target). |
| "Seluruh pekerjaan perusahaan" realtime | Realtime dashboard for **active jobs**, not historical. Historical = batch reports. |
| "Event driven, bukan app task management" | True: rebuild around events, not CRUD. But events can be retrofitted — existing tasks table = event log if extended. |
| "Peralihan dari dashboard ke OS" | Not a single sprint. Multi-quarter. Honest scope. |

## Target 5-Year

- 100% divisi pakai SDOS untuk operasional harian
- <2% pekerjaan overdue (from current unclear baseline, target measurable)
- 80% SOP punya electronic approval + audit trail
- Zero paper handover untuk SP3K/AJB lifecycle
- AI Copilot dapat memprediksi bottleneck 48 jam sebelum terjadi dengan akurasi >80%

## Mission Statement Draft

> "Membantu PT Syahfalah mengubah operasionalnya dari sistem informasi pasif menjadi sistem kontrol aktif yang dapat membatasi risiko keterlambatan, memastikan setiap rumah dipantau dari lead hingga serah terima, dan memungkinkan setiap руководи divisi membuat keputusan berbasis data dalam hitungan detik."

## Success Metrics (suggested for sign-off)

1. **Operasional**: Rata-rata hari keterlambatan task = <1 hari (vs baseline unclear)
2. **Compliance**: % SOP yang punya electronic approval = 80%
3. **Adoption**: % PIC yang login harian = 90%
4. **Realtime**: Dashboard refresh <10 detik untuk semua modul aktif
5. **AI Value**: % saran AI yang diterima manusia = >60% dalam 6 bulan pertama

## Decisions Required From Pak Ardian

- [ ] Apakah misi di atas acceptable?
- [ ] Apakah 5 success metrics acceptable?
- [ ] Ada target 5/10 tahun yang HARUS masuk sistem (misal: 100 unit terclosing per tahun? 12 cluster selesai 2028?)

---
