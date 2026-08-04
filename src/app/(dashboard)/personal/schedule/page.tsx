// src\app\(dashboard)\personal\schedule\page.tsx
import { FeatureRoadmap } from '@/components/layout/FeatureRoadmap'

export default function Page() {
  return (
    <FeatureRoadmap
      title="My Schedule"
      description="Jadwal harian & mingguan Anda."
      features={[
        'Timeline task + meeting + deadline',
      'Drag-and-drop reschedule',
      'Reminder via notifikasi',
      'Tampilan mingguan dengan slot 30 menit',
      ]}
      dataSource="tasks.due_date (filtered by user_id)"
      related={[
        { label: 'My Tasks', href: '/personal/tasks' },
      { label: 'My KPIs', href: '/personal/kpi' },
      ]}
    />
  )
}
