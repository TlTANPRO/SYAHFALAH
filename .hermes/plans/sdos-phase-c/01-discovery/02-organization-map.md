# DOMAIN 2 — ORGANIZATION MAP
**Status**: Draft v0.1 — derived from existing `users` + `divisions` table
**Source**: syahfalah_dashboard DB live (queried 2026-08-06)

## Current Organization (as in DB)

**Owner / Direksi**
- Pak Ardian — owner, no division

**Kepala Kantor (operational lead)**
- Mada — kepala_kantor role, no division

**8 Divisi Aktif** (extracted from `divisions` table):
1. Marketing (PIC: Riza)
2. Legal (PIC: Bu Nisya)
3. Project / Konstruksi (PIC: Rizal)
4. Purchasing / Procurement (PIC: TBD)
5. Maintenance (PIC: TBD)
6. Operational (PIC: TBD)
7. Finance (PIC: Novita — Keuangan)
8. Media / Kreatif (PIC: Reni)

**Staff**: 13 user rows (mostly across Marketing, Maintenance, Konstruksi)

## As-Is vs To-Be Structure

| Tier | As-Is | To-Be |
|---|---|---|
| Direksi | Pak Ardian | Pak Ardian + Owner role |
| Kepala Kantor | Mada | Mada + Kepala Kantor role (monitor operational) |
| Kepala Divisi | Hidden (no specific role) | New role `kepala_divisi` with full divisional access |
| Staff | Per role (staff) | Same, with division_id FK to enforce team boundaries |

## Division Hierarchy (proposed)

```
Syahfalah Group
├── Direksi (Pak Ardian)
│   ├── Strategic Planning
│   └── Owner-level only views
│
├── Kepala Kantor (Mada)
│   ├── Marketing (Riza)
│   │   └── Sales Counter, Digital Ads, Brand
│   ├── Legal (Bu Nisya)
│   │   └── SHM, AJB, PBG, Akta
│   ├── Project / Konstruksi (Rizal)
│   │   ├── BSA (Bhumi Saka Arum)
│   │   ├── Grati Asri
│   │   ├── Kabuaran
│   │   ├── Kavling Mandiri
│   │   ├── Kencong Residence
│   │   └── Klampokarum
│   ├── Purchasing (—)
│   ├── Maintenance (—)
│   ├── Operational (—)
│   ├── Media / Kreatif (Reni)
│   └── Finance (Novita)
```

## Schema Implications

`divisions` table needs:
- `parent_id` (self-FK, nullable) — for hierarchy if any sub-team exists
- `head_user_id` (FK → users.id) — who leads the division
- `level` (int) — 1 = group, 2 = division, 3 = sub-team
- `is_active` (bool) — soft delete

`users` table needs:
- `division_id` (FK → divisions.id, ALREADY exists)
- `position` (varchar, ALREADY exists)
- `reporting_to_user_id` (FK → users.id, nullable) — direct manager
- `hire_date` (date, NEW)
- `is_active` (boolean, already exists)

## Stakeholder Review Needs

1. **Pak Ardian**: Confirm Direksi structure above
2. **Mada**: Confirm that kepala_divisi is the right role label, vs existing `kepala_kantor`
3. **Each PIC**: Confirm whether their division has sub-teams (e.g., Marketing → Sales Counter vs Digital Ads)

## RACI Sample (Marketing domain)

| Activity | R (Responsible) | A (Accountable) | C (Consulted) | I (Informed) |
|---|---|---|---|---|
| Lead intake | Sales Counter | Riza (PIC) | Mada | All |
| Survey schedule | Surveyor | Riza | Customer | Legal |
| Booking | Sales Counter | Riza | Admin, Legal | Mada |
| SP3K | Admin | Novita | Legal, Bank | Mada |
| Lost lead analysis | Sales Counter | Riza | Mada | — |

---
