// app/layout.tsx
// Root layout with providers and metadata

import type { Metadata, Viewport } from 'next'
import { Providers } from '@/providers/Providers'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Syahfalah Dashboard',
    template: '%s | Syahfalah Dashboard',
  },
  description: 'Internal management dashboard for PT Syahfalah Global + PT Lembayung Wanantara Padha + Grup Majang Mejeng',
  keywords: ['dashboard', 'management', 'KPI', 'tasks', 'Syahfalah'],
  authors: [{ name: 'TITAN PRO', url: 'https://github.com/TlTANPRO' }],
  creator: 'MADA',
  publisher: 'PT Syahfalah Global',
  robots: 'noindex, nofollow',
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    siteName: 'Syahfalah Dashboard',
    title: 'Syahfalah Dashboard',
    description: 'Internal management dashboard',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Syahfalah Dashboard',
    description: 'Internal management dashboard',
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
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=Plus+Jakarta+Sans:wght@100..800&family=JetBrains+Mono:wght@100..800&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}