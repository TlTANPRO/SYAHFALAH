// src/app/(dashboard)/settings/page.tsx
// Halaman pengaturan. Profil, notifikasi, tema, dan session.
// v2: Notifikasi toggles pakai <SwitchField> + auto-save ke API
// (live sync via users.notification_prefs jsonb column).

'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Moon, Sun, Bell, Lock, User, Smartphone } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { SwitchField } from '@/components/ui/switch'
import { useToggleMutation } from '@/lib/hooks/use-toggle-mutation'
import { useUIStore } from '@/stores/uiStore'

const NOTIF_PREF_KEYS = ['whatsapp_group', 'email', 'desktop_push'] as const
type NotifPrefKey = typeof NOTIF_PREF_KEYS[number]

interface PrefsResponse {
  prefs: Record<string, boolean>
}

async function fetchPrefs(): Promise<PrefsResponse> {
  const res = await fetch('/api/notifications/preferences', { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to load preferences')
  return res.json()
}

const NOTIF_META: Array<{ key: NotifPrefKey; label: string; desc: string }> = [
  { key: 'whatsapp_group', label: 'WhatsApp group Syahfalah', desc: 'Notifikasi buyer baru, SP3K, dan akad' },
  { key: 'email', label: 'Email', desc: 'Weekly recap setiap Senin pagi' },
  { key: 'desktop_push', label: 'Desktop push', desc: 'Browser notification saat lead baru masuk' },
]

export default function Page() {
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const [theme, setTheme] = useState<'dark' | 'light' | 'auto'>(() => {
    if (typeof window === 'undefined') return 'dark'
    return (localStorage.getItem('syahfalah-theme') as any) || 'dark'
  })

  // Fetch prefs from DB
  const { data: prefsData, isLoading: prefsLoading } = useQuery({
    queryKey: ['notif-prefs', user?.id],
    queryFn: fetchPrefs,
    enabled: !!user,
    staleTime: 30_000,
  })

  const toggle = useToggleMutation({
    url: '/api/notifications/preferences',
    invalidate: [['notif-prefs', user?.id]],
  })

  const applyTheme = (next: 'dark' | 'light' | 'auto') => {
    setTheme(next)
    if (typeof window === 'undefined') return
    const root = document.documentElement
    if (next === 'dark') {
      root.classList.add('dark')
    } else if (next === 'light') {
      root.classList.remove('dark')
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) root.classList.add('dark')
      else root.classList.remove('dark')
    }
    localStorage.setItem('syahfalah-theme', next)
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs crumbs={[{ label: 'Settings' }]} />
        <h1 className="display-lg">Settings</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Atur profil, notifikasi, dan preferensi tampilan. Perubahan tersimpan otomatis.
        </p>
      </div>

      {/* Profil */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-[var(--color-text-tertiary)]" />
            <h2 className="font-heading text-base font-semibold">Profil</h2>
          </div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label htmlFor="settings-name" className="text-xs text-[var(--color-text-tertiary)]">Nama</label>
              <input id="settings-name" name="name" autoComplete="name" className="input mt-1" defaultValue={user.name} />
            </div>
            <div>
              <label htmlFor="settings-position" className="text-xs text-[var(--color-text-tertiary)]">Posisi</label>
              <input id="settings-position" name="position" autoComplete="organization-title" className="input mt-1" defaultValue={user.position} disabled />
            </div>
            <div>
              <label htmlFor="settings-email" className="text-xs text-[var(--color-text-tertiary)]">Email</label>
              <input id="settings-email" name="email" autoComplete="email" className="input mt-1" type="email" defaultValue={`${user.name.toLowerCase().replace(' ', '.')}@syahfalah.com`} />
            </div>
            <div>
              <label htmlFor="settings-phone" className="text-xs text-[var(--color-text-tertiary)]">No HP</label>
              <input id="settings-phone" name="phone" autoComplete="tel" className="input mt-1" defaultValue="0812xxxxxxxx" />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button className="btn" data-variant="primary">Simpan</button>
          </div>
        </div>
      </div>

      {/* Theme */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            {theme === 'dark' ? <Moon className="h-4 w-4 text-[var(--color-text-tertiary)]" /> : <Sun className="h-4 w-4 text-[var(--color-text-tertiary)]" />}
            <h2 className="font-heading text-base font-semibold">Tampilan</h2>
          </div>
        </div>
        <div className="card-body">
          <p className="text-sm text-[var(--color-text-secondary)] mb-3">
            Pilih tema. Auto akan mengikuti preferensi sistem operasi.
          </p>
          <div className="flex gap-2">
            {(['dark', 'light', 'auto'] as const).map(opt => (
              <button
                key={opt}
                onClick={() => applyTheme(opt)}
                className={`btn ${theme === opt ? 'data-[variant=primary]' : 'data-[variant=outline]'}`}
                data-variant={theme === opt ? 'primary' : 'outline'}
              >
                {opt === 'dark' && <Moon className="h-3.5 w-3.5" />}
                {opt === 'light' && <Sun className="h-3.5 w-3.5" />}
                {opt === 'auto' && <Smartphone className="h-3.5 w-3.5" />}
                {opt === 'dark' ? 'Gelap' : opt === 'light' ? 'Terang' : 'Otomatis'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notifikasi */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[var(--color-text-tertiary)]" />
            <h2 className="font-heading text-base font-semibold">Notifikasi</h2>
          </div>
          {toggle.isError && (
            <span className="text-xs text-[var(--color-danger)]" role="alert">
              Gagal menyimpan — coba lagi
            </span>
          )}
        </div>
        <div className="card-body space-y-1">
          {prefsLoading ? (
            <div className="space-y-2 p-3">
              {[0, 1, 2].map(i => (
                <div key={i} className="h-12 rounded bg-[var(--color-surface-2)]/50 animate-pulse" />
              ))}
            </div>
          ) : (
            NOTIF_META.map(n => {
              const isOn = !!prefsData?.prefs?.[n.key]
              const isPending =
                toggle.isPending &&
                toggle.variables?.key === n.key
              return (
                <SwitchField
                  key={n.key}
                  label={n.label}
                  description={n.desc}
                  checked={isOn}
                  loading={isPending}
                  onCheckedChange={(value) =>
                    toggle.mutate(
                      { key: n.key, value },
                      {
                        onSuccess: () => {
                          addToast({ type: 'success', title: 'Preferensi disimpan', message: `${n.label} ${value ? 'aktif' : 'non-aktif'}` })
                        },
                        onError: () => {
                          addToast({ type: 'destructive', title: 'Gagal menyimpan', message: 'Coba lagi dalam beberapa detik' })
                        },
                      },
                    )
                  }
                />
              )
            })
          )}
        </div>
      </div>

      {/* Session */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-[var(--color-text-tertiary)]" />
            <h2 className="font-heading text-base font-semibold">Session</h2>
          </div>
        </div>
        <div className="card-body">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium">Device ini</p>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                Login terakhir: {new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' })
                window.location.href = '/login'
              }}
              className="btn"
              data-variant="danger"
            >
              Logout device ini
            </button>
          </div>
          <p className="text-xs text-[var(--color-text-tertiary)]">
            Session berlaku 8 jam. Akan muncul notifikasi 2 menit sebelum expiry.
          </p>
        </div>
      </div>
    </div>
  )
}
