# DOMAINS 9-15 — CONDENSED OVERVIEW
**Status**: TOC + key fields. Details expandable once stakeholder confirms.

---

## DOMAIN 9 — Document Catalog (PRD §Legal docs + Operation docs)

### Legal Documents
- SHM (Sertifikat Hak Milik) — per customer, expiring?
- AJB (Akta Jual Beli) — per transaction
- PBG (Persetujuan Bangunan Gedung) — per block
- SLF (Sertifikat Laik Fungsi) — per block, renewable
- Akta Jual Beli — per transaction
- Sertifikat Hak Guna Bangunan — different from SHM (lease)

### Operational
- Booking Form (blank + filled)
- SP3K Application
- Akta Jual Beli signed copy
- QC Checklist (per phase)
- Purchase Order
- Delivery Order
- BOM (Bill of Materials)
- Vendor Contracts
- Employee Contracts
- Insurance Documents

### Storage
- Object storage: S3-compatible (Supabase Storage works, free tier 1GB)
- Metadata in DB tables (`attachments` table)
- Categories via `tags`

---

## DOMAIN 10 — Technology Landscape

### Currently Used
| Tool | Used for | Replace with SDOS? |
|---|---|---|
| WhatsApp | Comms + komplain intake | Hybrid (WA gateway for inbound) |
| Meta Ads | Marketing | No (keep) |
| Google Drive | Documents | Yes (S3 with metadata) |
| Excel | Operational reports | Yes (live data) |
| Email | Comms | Hybrid (transactional only) |
| Instagram | Marketing | No |
| Bank apps | Finance | No (keep) |

### System Constraints
- Vercel edge runtime **= no WebSocket**. Use **Supabase Realtime** (LISTEN/NOTIFY via Postgres triggers + Postgres replication). Free, 100 concurrent connections.
- Vercel function timeout = 60s free, 300s Pro.
- AI queries = 10-20s typical. Use **edge functions** or **background jobs** (Supabase cron, free).

---

## DOMAIN 11 — Pain Point Matrix

| # | Pain Point | Source | Severity | Frequency |
|---|---|---|---|---|
| 1 | Follow-up reminder sering lupa | Riza | HIGH | Daily |
| 2 | SP3K dokumen sering incomplete | Bu Nisya | HIGH | 30% of SP3K |
| 3 | Material PO approval > 24 jam | Rizal | HIGH | Bi-weekly |
| 4 | Project foto compliance rendah | Rizal | MED | Weekly |
| 5 | Komplain masuk via WA, no log | Maintenance | HIGH | 3-5/week |
| 6 | Manual cashflow reconciliation | Novita | HIGH | Monthly |
| 7 | Performance score manual | Mada | MED | Monthly |
| 8 | Approval threshold tidak jelas | All | HIGH | Cross-divisi |
| 9 | Audit trail tidak ada | Pak Ardian | HIGH | Strategic |
| 10 | KPI calculation belum otomatis | Mada | HIGH | Daily |
| 11 | Notification overload (timely?) | Mada | MED | Daily |

### Source verification NEEDED
This is my inference from PRD/PR context. **Must be validated** by interviewing each PIC.

---

## DOMAIN 12 — Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Data loss during migration | Medium | High | Migration additive only + Supabase backup + dry-run on copy |
| Staff resist daily check-in/out | High | Medium | Optional first 3 months, gamification reward |
| AI recommendation giving bad advice | Medium | High | Phase 3 read-only first, autonomy only after >90% accuracy benchmark |
| Vercel free tier exceeded | Low | Low | Upgrade to Supabase Pro $25/mo |
| Single stakeholder (Mada) bottleneck | High | High | Need 1 co-reviewer per division |
| PRD scope creep | High | High | Hard-cut menu: CEO dashboard + 12 main menus max |
| Vendor lock-in (Supabase) | Low | Low | Postgres portable, exit-cost < 1 week |
| Security breach (PIN only, no MFA) | Medium | High | Phase 2 MFA via WebAuthn |

---

## DOMAIN 13 — Opportunity Backlog

| Opportunity | Effort | Value |
|---|---|---|
| **AI drafting Email/WhatsApp** | 2 weeks | Reduces Marketing time by 1-2 hrs/day |
| **AI predicting lead quality from past data** | 3 weeks | Improves closing rate estimate |
| **AI reading photo QC for compliance** | 4 weeks (CV model) | Catches 80%+ missed QC issues |
| **Voice-to-task for field staff** | 2 weeks | Reduces task entry time by 60% |
| **Predictive cashflow** (auto from PO + booking trend) | 3 weeks | Better strategic planning for Pak Ardian |
| **Smart reminder based on user's pace** | 1 week | Personalized productivity |
| **Auto-generate SOP draft from interviews** | 2 weeks | Reduces manual doc work |

---

## DOMAIN 14 — Automation Map

### High-impact automations

| Trigger | Action | Frequency |
|---|---|---|
| Lead baru masuk | Auto-assign ke Sales Counter berdasarkan geo | Instant |
| Survey completed | Auto-create task untuk Admin (booking letter) | Instant |
| Booking confirmed | Auto-create SP3K task untuk Legal | Instant |
| SP3K documents complete | Auto-create Akad task untuk Admin + Notaris | Instant |
| Akad done | Auto-mark customer as "deal closed", trigger serah terima prep | Instant |
| Material low stock | Auto-notify Purchasing + auto-create PO draft | Daily check |
| Komplain received | Auto-assign teknisi based on location + load | Instant |
| Customer overdue follow-up (H+1, H+3, H+7) | Auto-reminder ke Sales | 3x/day |
| Task overdue | Auto-escalate to PIC, then to KK | Daily check |
| KPI achievement < 70% period-end | Auto-notify PIC + KK | Period end |
| Audit log entry | Auto-record in audit_logs | Every action |

### Lower-impact (Phase 2+)

- Auto-suggest daily task ordering (by priority + deadline)
- Auto-detect duplicate leads
- Auto-flag suspicious entries (e.g., komplain from same customer 5x in 7 days)
- Auto-coaching log when same PIC missed target 3 periods

---

## DOMAIN 15 — Executive Dashboard Requirement

Pak Ardian top-5 daily metrics:

1. **Closing minggu ini** vs target (concrete: 7 / 10 = 70%)
2. **Cashflow posisi bulan ini** = collected - paid
3. **Progress proyek** = % blok yang QC passed
4. **Overdue task count** per divisi
5. **Pending approvals** > 48 jam

### Open question for Pak Ardian

Apakah 5 angka ini sudah cukup, atau ada metrik lain yang lebih penting?

---
