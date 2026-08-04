// src\app\(dashboard)\calendar\page.tsx
import { FeatureRoadmap } from '@/components/layout/FeatureRoadmap'

export default function Page() {
  return (
    <FeatureRoadmap
      title="Calendar"
      description="Kalender kerja tim lintas divisi."
      features={[
        'Tampilan kalender mingguan/bulanan',
      'Highlight hari libur & cuti',
      'Sinkronisasi deadline task tiap anggota',
      'Export ke Google Calendar (.ics)',
      ]}
      dataSource="tasks.due_date, divisions, public_holidays"
      related={[
        { label: 'My Tasks', href: '/personal/tasks' },
      { label: 'Team KPIs', href: '/kepala-kantor/team' },
      ]}
    />
  )
}
