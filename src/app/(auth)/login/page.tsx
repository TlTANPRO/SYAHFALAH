// app/(auth)/login/page.tsx
// PIN-based login page

'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AlertCircle, CheckCircle, Loader2, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'
  const { setUser, setLoading } = useAuthStore()
  
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [attempts, setAttempts] = useState(0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setError('PIN harus 4 digit angka')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })

      const data = await response.json()

      if (!response.ok) {
        setAttempts(prev => prev + 1)
        if (data.locked) {
          setError('Terlalu banyak percobaan. Coba lagi nanti.')
        } else {
          setError(data.error || 'PIN salah')
        }
        return
      }

      setUser(data.user)
      router.push(redirect)
      router.refresh()
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  const demoUsers = [
    { name: 'Pak Ardian (Owner)', pin: '0000', role: 'owner' },
    { name: 'Bu Nisya (Legal)', pin: '0000', role: 'pic_divisi' },
    { name: 'Mada (Kepala Kantor)', pin: '0000', role: 'kepala_kantor' },
    { name: 'Riza (Marketing)', pin: '0000', role: 'staff' },
    { name: 'Yudi (Mkt+Maintenance)', pin: '0000', role: 'staff' },
    { name: 'Amir (Mkt+Konstruksi)', pin: '0000', role: 'staff' },
    { name: 'Rizal (Kepala Proyek)', pin: '0000', role: 'pic_divisi' },
    { name: 'Novita (Keuangan)', pin: '0000', role: 'staff' },
    { name: 'Sinta (Purchasing)', pin: '0000', role: 'staff' },
    { name: 'Reni (Ketua Media)', pin: '0000', role: 'pic_divisi' },
    { name: 'Rifki (Kreatif)', pin: '0000', role: 'staff' },
    { name: 'Reta (Penulis)', pin: '0000', role: 'staff' },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-xl bg-primary mb-4">
            <CheckCircle className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Syahfalah Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            PT Syahfalah Global · PT Lembayung Wanantara Padha · Grup Majang Mejeng
          </p>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Masuk ke Dashboard</CardTitle>
            <CardDescription>Masukkan 4-digit PIN Anda</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Label htmlFor="pin" className="sr-only">PIN</Label>
                <Input
                  id="pin"
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                    setPin(value)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && pin.length === 4) {
                      handleSubmit(e as unknown as React.FormEvent)
                    }
                  }}
                  placeholder="●●●●"
                  className="text-center text-2xl tracking-widest h-14"
                  autoComplete="off"
                  autoFocus
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
                >
                  {showPin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              <Button type="submit" className="w-full h-12 text-lg" disabled={isLoading || pin.length !== 4}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Memverifikasi...
                  </>
                ) : (
                  'Masuk'
                )}
              </Button>
            </form>

            <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground text-center mb-3">Demo Users (PIN: 0000)</p>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto scrollbar-thin">
                {demoUsers.map((user, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPin(user.pin)}
                    className="text-left p-2 rounded hover:bg-background/50 transition-colors text-sm"
                  >
                    <span className="font-medium text-foreground">{user.name}</span>
                    <span className="text-xs text-muted-foreground block">Role: {user.role.replace('_', ' ')}</span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Internal use only — PT Syahfalah Global · Dibuat oleh MADA
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <LoginForm />
    </Suspense>
  )
}