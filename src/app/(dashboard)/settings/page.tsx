// src/app/(dashboard)/settings/page.tsx
// Halaman pengaturan. Profil, notifikasi, tema, dan session.

'use client'

import { useState } from 'react'
import { Moon, Sun, Bell, Lock, User, Smartphone } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'

export default function Page() {
  const { user } = useAuthStore()
  const [theme, setTheme] = useState<'dark' | 'light' | 'auto'>(() => {
    if (typeof window === 'undefined') return 'dark'
    return (localStorage.getItem('syahfalah-theme') as any) || 'dark'
  })
  const [notifWA, setNotifWA] = useState(true)
  const [notifEmail, setNotifEmail] = useState(false)
  const [notifDesktop, setNotifDesktop] = useState(true)

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
      <Breadcrumbs crumbs={ [{ label: 'Settings' }] } />
        
        <h1 className="display-lg">Settings</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Atur profil, notifikasi, dan preferensi tampilan.
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
              <input id="settings-name" name="name" className="input mt-1" defaultValue={user.name} />
            </div>
            <div>
              <label htmlFor="settings-position" className="text-xs text-[var(--color-text-tertiary)]">Posisi</label>
              <input id="settings-position" name="position" className="input mt-1" defaultValue={user.position} disabled />
            </div>
            <div>
              <label htmlFor="settings-email" className="text-xs text-[var(--color-text-tertiary)]">Email</label>
              <input id="settings-email" name="email" className="input mt-1" type="email" defaultValue={`${user.name.toLowerCase().replace(' ', '.')}@syahfalah.com`} />
            </div>
            <div>
              <label htmlFor="settings-phone" className="text-xs text-[var(--color-text-tertiary)]">No HP</label>
              <input id="settings-phone" name="phone" className="input mt-1" defaultValue="0812xxxxxxxx" />
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
        </div>
        <div className="card-body space-y-3">
          {[
            { label: 'WhatsApp group Syahfalah', desc: 'Notifikasi buyer baru, SP3K, dan akad',  state: notifWA, set: setNotifWA },
            { label: 'Email', desc: 'Weekly recap setiap Senin pagi', state: notifEmail, set: setNotifEmail },
            { label: 'Desktop push', desc: 'Browser notification saat lead baru masuk', state: notifDesktop, set: setNotifDesktop },
          ].map((n, i) => (
            <label key={i} className="flex items-start justify-between gap-3 cursor-pointer p-3 rounded-md hover:bg-[var(--color-surface-2)] transition-colors">
              <div>
                <p className="text-sm font-medium">{n.label}</p>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{n.desc}</p>
              </div>
              <button
                onClick={() => n.set(!n.state)}
                className={`relative h-6 w-11 rounded-full border transition-colors flex-shrink-0 ${
                  n.state ? 'bg-[var(--color-brand-500)] border-[var(--color-brand-500)]' : 'bg-[var(--color-surface-2)] border-[var(--color-border-default)]'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-[var(--color-surface-1)] transition-transform ${
                    n.state ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </label>
          ))}
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
