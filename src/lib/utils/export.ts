// lib/utils/export.ts
// Export data to CSV / trigger a download. Avoids pulling a 3rd-party
// dependency for what is 30 lines of vanilla code.

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function toCsv<T extends object>(rows: T[], columns: (keyof T)[]): string {
  const header = columns.map(c => escapeCsv(c as string)).join(',')
  const body = rows
    .map(row => columns.map(c => escapeCsv(row[c])).join(','))
    .join('\n')
  return `${header}\n${body}`
}

export function downloadCsv(filename: string, csv: string) {
  if (typeof window === 'undefined') return
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
