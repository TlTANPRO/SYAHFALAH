// public/sw.js — Phase 4 PWA service worker stub.
// Cache-first for static assets, network-first for /api/*.
// Full offline sync engine deferred to next sprint.

const CACHE = 'syahfalah-v1'
const STATIC = ['/', '/dashboard', '/manifest.json', '/icon-192.png']

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(STATIC) }))
  self.skipWaiting()
})

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k !== CACHE }).map(function (k) { return caches.delete(k) }))
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', function (e) {
  const url = new URL(e.request.url)
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request).catch(function () {
        return new Response(JSON.stringify({ offline: true }), { status: 503, headers: { 'Content-Type': 'application/json' } })
      })
    )
    return
  }
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      if (cached) return cached
      return fetch(e.request).then(function (r) {
        if (e.request.method === 'GET' && r.ok) {
          const clone = r.clone()
          caches.open(CACHE).then(function (c) { return c.put(e.request, clone) })
        }
        return r
      }).catch(function () { return caches.match('/') })
    })
  )
})
