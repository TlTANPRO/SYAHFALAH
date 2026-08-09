// src/lib/flow-kerja/registry.ts
// Registry untuk Flow Kerja Baru 2026 (PDF 'C:\\Users\\Syahfalah\\Downloads\\FLOW
// KERJA BARU 2026.pdf'). Definisi 13 langkah + 3 phase + 4 PIC.
// PDF sumber menjelaskan alur project konstruksi: Perencanaan → Pelaksanaan →
// Akhir Project. Setiap langkah punya nama, PIC, jobs, dan output.

export type FlowRole = 'pimpro' | 'purchasing' | 'operasional' | 'owner'

export const FLOW_ROLE_LABEL: Record<FlowRole, string> = {
  pimpro: 'PIMPRO',
  purchasing: 'PURCHASING',
  operasional: 'OPERASIONAL',
  owner: 'OWNER',
}

export const FLOW_ROLE_NAME: Record<FlowRole, string> = {
  pimpro: 'Pimpinan Proyek',
  purchasing: 'Purchasing',
  operasional: 'Operasional',
  owner: 'Owner',
}

// Pemetaan PIC ke user (sesuai konfirmasi Owner 2026-08-09).
// Rizal = Pimpinan Proyek, Sinta = Purchasing, Amir = Operasional.
// Kontrak & CCO = Pimpro (bukan Owner).
export const FLOW_ROLE_USER: Record<FlowRole, string> = {
  pimpro: 'Rizal',
  purchasing: 'Sinta',
  operasional: 'Amir',
  owner: 'Pak Ardian',
}

export type FlowPhase = 'perencanaan' | 'pelaksanaan' | 'akhir'

export const FLOW_PHASE_LABEL: Record<FlowPhase, string> = {
  perencanaan: 'PERENCANAAN',
  pelaksanaan: 'PELAKSANAAN',
  akhir: 'AKHIR PROJECT',
}

export const FLOW_PHASE_ORDER: FlowPhase[] = ['perencanaan', 'pelaksanaan', 'akhir']

export interface FlowStep {
  n: number
  phase: FlowPhase
  name: string
  pic: FlowRole
  jobs: string[]
  output: string[]
}

export const FLOW_STEPS: FlowStep[] = [
  {
    "n": 1,
    "phase": "perencanaan",
    "name": "Draft Desain",
    "pic": "pimpro",
    "jobs": [
      "Mendapatkan brief dari Owner",
      "Koordinasi desain",
      "Revisi desain"
    ],
    "output": [
      "3D Sketchup Desain",
      "2D Render Desain",
      "2D Gambar Kerja"
    ]
  },
  {
    "n": 2,
    "phase": "perencanaan",
    "name": "Rekap Harga & Material",
    "pic": "purchasing",
    "jobs": [
      "Mendata harga material di lapangan",
      "Mengelompokkan material murah di tiap TB/vendor",
      "Menawar harga / termin (acc Pimpro)"
    ],
    "output": [
      "Data harga material real",
      "Rencana belanja per vendor"
    ]
  },
  {
    "n": 3,
    "phase": "perencanaan",
    "name": "Data Tukang & Pemborong",
    "pic": "operasional",
    "jobs": [
      "Mendata kepala tukang, tukang, laden, pemborong",
      "Mendata dengan alamat dan nomor HP"
    ],
    "output": [
      "List tukang/pemborong + kontak"
    ]
  },
  {
    "n": 4,
    "phase": "perencanaan",
    "name": "RAP - RAB - Timeline",
    "pic": "pimpro",
    "jobs": [
      "Perhitungan volume pekerjaan (BVQ)",
      "Perhitungan analisa harga satuan",
      "Perencanaan timeline berdasarkan volume"
    ],
    "output": [
      "RAP",
      "RAB",
      "Timeline & target waktu"
    ]
  },
  {
    "n": 5,
    "phase": "perencanaan",
    "name": "Administrasi Project",
    "pic": "pimpro",
    "jobs": [
      "Membuat kontrak kerja ke buyer",
      "Mengumpulkan data gamtek, 3D render, SPK untuk SKO"
    ],
    "output": [
      "Kontrak kerja buyer",
      "Bundle SKO materials"
    ]
  },
  {
    "n": 6,
    "phase": "perencanaan",
    "name": "Mengadakan Tender",
    "pic": "purchasing",
    "jobs": [
      "Memberi penawaran harga sesuai RAP",
      "Mengutamakan harga ≤ RAP",
      "Mendata penawaran yang terjadi"
    ],
    "output": [
      "Rekap penawaran vendor",
      "Calon pemborong shortlisted"
    ]
  },
  {
    "n": 7,
    "phase": "perencanaan",
    "name": "SKO ke Tukang/Pemborong Terpilih",
    "pic": "pimpro",
    "jobs": [
      "Menjelaskan detail gambar teknis (pondasi → finishing cat)",
      "Menjelaskan sistem pembayaran",
      "Menjelaskan potensi problem",
      "Menjelaskan alur birokrasi kantor",
      "Sesi tanya jawab"
    ],
    "output": [
      "SKO awarded",
      "Penunjukan tukang/pemborong (acc Pimpro)"
    ]
  },
  {
    "n": 8,
    "phase": "pelaksanaan",
    "name": "Pengawasan & Opname",
    "pic": "pimpro",
    "jobs": [
      "Pengawasan berkala minimal 2 hari sekali",
      "Perhitungan opname lapangan real-time",
      "Check & balance progress dengan opname",
      "Mendokumentasikan progress pekerjaan",
      "Membuat keputusan force majeure"
    ],
    "output": [
      "Laporan opname per periode",
      "Daftar force majeure",
      "Foto dokumentasi"
    ]
  },
  {
    "n": 9,
    "phase": "pelaksanaan",
    "name": "Rekapitulasi Penggunaan Material",
    "pic": "operasional",
    "jobs": [
      "Input data penggunaan material ke Accurate per blok/proyek",
      "Check IN/OUT material (volume, kualitas)",
      "Menyusun data untuk purchasing",
      "Mengecek pekerjaan benangan, pengukuran, finishing"
    ],
    "output": [
      "Laporan material usage",
      "Stock opname"
    ]
  },
  {
    "n": 10,
    "phase": "pelaksanaan",
    "name": "Loading Material",
    "pic": "purchasing",
    "jobs": [
      "Pengadaan material sesuai rencana pembelanjaan",
      "Beli material urgency tinggi",
      "Atur lalu lintas material di lapangan",
      "Serah terima material dengan tukang/vendor",
      "Audit pengadaan pembelanjaan",
      "Invoice pembayaran material ke Finance",
      "Invoice termin pembayaran ke Buyer",
      "Efektivitas budget",
      "Checklist pekerjaan (terutama ketelitian tinggi)"
    ],
    "output": [
      "Purchase orders",
      "Invoice pembayaran material",
      "Invoice termin Buyer",
      "Audit report",
      "Checklist selesai"
    ]
  },
  {
    "n": 11,
    "phase": "akhir",
    "name": "Inventaris Akhir Project",
    "pic": "operasional",
    "jobs": [
      "Stock & inventaris awal (volume, kualitas)",
      "List inventaris akhir berdasarkan inventaris awal"
    ],
    "output": [
      "Daftar inventaris akhir",
      "Perbandingan in-out"
    ]
  },
  {
    "n": 12,
    "phase": "akhir",
    "name": "Rekapitulasi Akhir",
    "pic": "purchasing",
    "jobs": [
      "Input data penggunaan material ke Accurate per blok/proyek",
      "Rekapitulasi total pengeluaran akhir",
      "Evaluasi pengeluaran (plus/minus) untuk acuan selanjutnya",
      "Komparasi pemasukan, pengeluaran, laba/rugi",
      "Lembar pertanggungjawaban pengeluaran (nota + foto)"
    ],
    "output": [
      "Laporan keuangan akhir",
      "LPJ pengeluaran",
      "P&L statement"
    ]
  },
  {
    "n": 13,
    "phase": "akhir",
    "name": "Administrasi Akhir Project",
    "pic": "pimpro",
    "jobs": [
      "Hitungan addendum / CCO ke Buyer",
      "Laporan kondisi & jumlah barang/alat kerja (foto)",
      "Laporan akhir project → Divisi Finance"
    ],
    "output": [
      "Laporan akhir project",
      "Addendum/CCO Buyer",
      "Berita acara serah terima"
    ]
  }
]

export function getStep(n: number): FlowStep | undefined {
  return FLOW_STEPS.find(s => s.n === n)
}

export function stepsByPhase(): Record<FlowPhase, FlowStep[]> {
  return {
    perencanaan: FLOW_STEPS.filter(s => s.phase === 'perencanaan'),
    pelaksanaan: FLOW_STEPS.filter(s => s.phase === 'pelaksanaan'),
    akhir: FLOW_STEPS.filter(s => s.phase === 'akhir'),
  }
}

export function stepsByRole(role: FlowRole): FlowStep[] {
  return FLOW_STEPS.filter(s => s.pic === role)
}

// Total count per role
export const FLOW_ROLE_COUNT: Record<FlowRole, number> = FLOW_STEPS.reduce(
  (acc, s) => {
    acc[s.pic] = (acc[s.pic] || 0) + 1
    return acc
  },
  {} as Record<FlowRole, number>
)
