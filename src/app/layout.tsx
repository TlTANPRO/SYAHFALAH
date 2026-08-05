// app/layout.tsx
// Root layout with providers, brand metadata, and font loading.

import type { Metadata, Viewport } from 'next'
import { Providers } from '@/providers/Providers'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Syahfalah Operations',
    template: '%s · Syahfalah Operations',
  },
  description:
    'Operational command center for PT Syahfalah Global + PT Lembayung Wanantara Padha + Grup Majang Mejeng — leads, projects, and team performance in real time.',
  keywords: ['Syahfalah', 'property developer', 'KPI', 'leads', 'closing', 'operations', 'Indonesia'],
  authors: [{ name: 'PT Syahfalah Global' }],
  creator: 'Mada',
  publisher: 'PT Syahfalah Global',
  robots: 'noindex, nofollow',
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    siteName: 'Syahfalah Operations',
    title: 'Syahfalah Operations',
    description: 'Operational command center for property development teams',
  },
  icons: {
    icon: '/icons/icon-192.svg',
    shortcut: '/icons/icon-192.svg',
    apple: '/icons/apple-touch-icon.svg',
  },
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <noscript>
        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
          <h1>JavaScript Required</h1>
          <p>Syahfalah Operations Dashboard requires JavaScript. Please enable JavaScript in your browser and reload this page.</p>
        </div>
      </noscript>
      <body className="min-h-screen bg-[var(--color-surface-0)] text-[var(--color-text-primary)] font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded-md focus:bg-[var(--color-brand-500)] focus:text-white focus:shadow-lg focus:outline-none"
        >
          Skip to main content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}