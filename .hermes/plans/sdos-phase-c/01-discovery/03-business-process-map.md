# DOMAIN 3 — BUSINESS PROCESS MAP (BPMN 2.0 simplified)
**Status**: Draft v0.1 — derived from PRD §11-17 + analysis of `leads`, `consumer_cases`, `tasks` table rows

## PROCESS 1 — Lead-to-Close (Marketing)

```
[Lead In]
  │
  ▼
[Source Classification] (Instagram, WhatsApp, Referral, Meta Ads, Web)
  │ (auto-tag: source, geo, value-tier)
  ▼
[Initial Contact] → Chat via WA → sales response SLA 30 min
  │
  ▼
[Follow-up] → 3 retries (H+1, H+3, H+7) → if no response → Mark "Cold"
  │
  ├─[Hot Lead]──► [Survey Schedule]
  │
  └─[Lost]──────► [Lost Reason Capture] → Archive (optional re-activate)
                                  
[Survey]
  │ surveyor visits site, takes photos, fills form
  │ SLA: scheduled within 3 days, completed within 7 days
  ▼
[Booking Fee] → admin collects fee, generates booking letter
  │ SLA: same day
  ▼
[SP3K Process] → customer submits documents, legal reviews
  │ SLA: 14 days from booking
  ▼
[Akad] → notary schedules, signing
  │ SLA: 30 days from SP3K complete
  ▼
[Serah Terima] → construction handover
  ▼
[Maintenance Contract] → enters maintenance queue (separate process)

ERROR PATHS:
- Survey fails (customer not interested) → mark "Lost", optionally re-queue for 3 months
- SP3K rejected → back to customer for fix
- Akad cancelled → fine processing, mark "Deal Lost"
```

## PROCESS 2 — Project to Build (Construction)

```
[Project Created] (e.g., BSA Blok A1)
  │
  ▼
[Design Approval] (architect, owner) → archived in docs
  │
  ▼
[Construction Phases] (per block)
  │
  ├─[Pondasi] (4 weeks)
  ├─[Sloof] (2 weeks)
  ├─[Dinding] (4 weeks)
  ├─[Atap] (3 weeks)
  ├─[Finishing] (4 weeks)
  ├─[QC] (1 week)
  └─[Serah Terima] (handover to customer)

Each phase has:
- Target date
- Actual completion date
- Photo documentation
- QC checklist
- Material usage log
```

## PROCESS 3 — Legal Lifecycle (SHM/AJB)

```
[Customer Booking Confirmed]
  │
  ▼
[Document Collection] (KTP, NPWP, KK, marriage docs)
  │
  ▼
[SHM Issuance] (Sertifikat Hak Milik) → BPN process (external)
  │ SLA: 30 days
  ▼
[BPHTB Payment] (Bea Perolehan Hak atas Tanah dan Bangunan)
  │
  ▼
[AJB Signing] (Akta Jual Beli) → notaris
  │ SLA: 14 days after SHM
  ▼
[SHM Transfer Recording]
  │
  ▼
[Done] → property now legally customer-owned

PARALLEL TRACK:
- PBG (Persetujuan Bangunan Gedung) → izin konstruksi
- SLF (Sertifikat Laik Fungsi) → izin layak fungsi
```

## PROCESS 4 — Purchasing (Material Flow)

```
[Permintaan Barang] → from Project/PIC divisi
  │
  ▼
[Approval] → kepala_divisi or owner (amount threshold)
  │
  ▼
[PO Created] → purchase order to supplier
  │ SLA: same day after approval
  ▼
[Pembelian] → supplier delivers
  │ SLA: depends on material type
  ▼
[Pengiriman] → to site
  │
  ▼
[Gudang Receipt] → stock ledger +
  │
  ▼
[Dipakai] → from project, stock ledger -
  │
  ▼
[Audit Stok] → periodic reconciliation
```

## PROCESS 5 — Maintenance (Post-Handover)

```
[Customer Komplain] (WA/phone)
  │
  ▼
[Assign Teknisi] → based on availability + location
  │
  ▼
[Foto Before] → dokumentasi awal
  │
  ▼
[Reparasi] → teknisi fixes on-site
  │
  ▼
[Foto After] → dokumentasi hasil
  │
  ▼
[Customer Approval] → sign off
  │
  ▼
[Close] → warranty period continues

ESCALATION:
- Customer tidak approve → escalate to kepala_divisi
- Same komplain 3x → mark "chronic", schedule maintenance review
```

## Process Pain Points (MUST verify in Domain 11)

Process 1:
- WA/SLA tracking manual — no auto-reminder
- No clear ownership when lead lost

Process 2:
- Construction photo upload not standardized
- Customer wants daily progress but currently no portal

Process 3:
- BPN eksternal — no tracking into CRM
- Document collection from customer = WIA-only

Process 4:
- Approval threshold unclear (when owner vs kepala_divisi?)
- Stock reconciliation = manual Excel

Process 5:
- Komplain masuk via WA, not in system
- SLA teknisi tidak enforced

---
