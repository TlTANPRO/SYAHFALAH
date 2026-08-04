// hooks/useSessionTimeout.ts
// Watch the access-token cookie and warn (or force logout) when it is
// within two minutes of expiry. The JWT is HS256-encoded so we can decode
// the `exp` claim client-side without verifying the signature (signature
// is only required to detect tampering, and the server still validates
// every request).

'use client'

import { useEffect, useState } from 'react'

function readExp(token: string): number | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1]))
    return typeof payload.exp === 'number' ? payload.exp : null
  } catch {
    return null
  }
}

interface SessionTimeoutState {
  expiresAt: number | null
  minutesLeft: number | null
  isExpiringSoon: boolean
}

export function useSessionTimeout(warnMinutes = 2): SessionTimeoutState {
  const [state, setState] = useState<SessionTimeoutState>({
    expiresAt: null,
    minutesLeft: null,
    isExpiringSoon: false,
  })

  useEffect(() => {
    if (typeof document === 'undefined') return

    const tick = () => {
      const match = document.cookie.match(/access_token=([^;]+)/)
      const token = match?.[1]
      if (!token) {
        setState({ expiresAt: null, minutesLeft: null, isExpiringSoon: false })
        return
      }
      const exp = readExp(token)
      if (!exp) {
        setState({ expiresAt: null, minutesLeft: null, isExpiringSoon: false })
        return
      }
      const nowSec = Math.floor(Date.now() / 1000)
      const minutesLeft = Math.floor((exp - nowSec) / 60)
      setState({
        expiresAt: exp,
        minutesLeft,
        isExpiringSoon: minutesLeft <= warnMinutes && minutesLeft >= 0,
      })
    }

    tick()
    const interval = setInterval(tick, 30_000)
    return () => clearInterval(interval)
  }, [warnMinutes])

  return state
}
