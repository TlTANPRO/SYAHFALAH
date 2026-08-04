// src\app\(dashboard)\settings\page.tsx
import { FeatureRoadmap } from '@/components/layout/FeatureRoadmap'

export default function Page() {
  return (
    <FeatureRoadmap
      title="Settings"
      description="Pengaturan akun & preferensi."
      features={[
        'Profil: nama, foto, email, no HP',
      'Preferensi notifikasi (per-channel)',
      'Theme switcher (dark/light)',
      'Session management: device aktif, logout all',
      ]}
      dataSource="users, user_preferences"
      related={[
        { label: 'My KPIs', href: '/personal/kpi' },
      ]}
    />
  )
}
