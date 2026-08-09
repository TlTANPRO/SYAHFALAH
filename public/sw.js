// public/sw.js — Phase 4 PWA service worker.
// v6: cache-first for icon/manifest only. Network-first for everything
// else including _next/static chunks (which are immutable but SW
// was serving stale ones from v4 cache — caused React #321 mismatch).
const CACHE = 'syahfalah-v6'
const STATIC = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
]

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(STATIC) })
  )
  // Don't skipWaiting — let old SW keep serving until activate,
  // which immediately deletes old caches via clients.claim().
  // This avoids React mismatch from stale chunks.
})

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(
        ks.filter(function (k) { return k !== CACHE }).map(function (k) {
          return caches.delete(k)
        })
      )
    }).then(function () {
      return self.clients.claim()
    })
  )
})

self.addEventListener('fetch', function (e) {
  const url = new URL(e.request.url)

  // Never intercept /api/sync/process — failures must bubble to page.
  if (url.pathname === '/api/sync/process') {
    e.respondWith(fetch(e.request))
    return
  }

  // API routes: network-first, fall back to 503 so caller can use IDB queue.
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request).catch(function () {
        return new Response(
          JSON.stringify({ offline: true }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )
      })
    )
    return
  }

  // _next/static/* chunks: network-first to avoid stale React mismatches.
  // These have hash-based filenames so they're safe to always fetch fresh.
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      fetch(e.request).catch(function () {
        return caches.match(e.request)
      })
    )
    return
  }

  // Other static assets (icons, manifest): cache-first.
  if (url.pathname.startsWith('/icons/') || url.pathname === '/manifest.json') {
    e.respondWith(
      caches.match(e.request).then(function (cached) {
        if (cached) return cached
        return fetch(e.request).then(function (r) {
          if (e.request.method === 'GET' && r.ok) {
            const clone = r.clone()
            caches.open(CACHE).then(function (c) { return c.put(e.request, clone) })
          }
          return r
        })
      })
    )
    return
  }

  // HTML pages: network-first with cache fallback.
  e.respondWith(
    fetch(e.request).then(function (r) {
      if (e.request.method === 'GET' && r.ok) {
        const clone = r.clone()
        caches.open(CACHE).then(function (c) { return c.put(e.request, clone) })
      }
      return r
    }).catch(function () {
      return caches.match(e.request).then(function (cached) {
        return cached || caches.match('/')
      })
    })
  )
})
