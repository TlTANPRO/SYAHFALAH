// tests/notifications-401-regression.spec.js
// Regression test for /api/notifications returning 401 for logged-in owner.
// User reported: 'aku baru saja login pak ardian dan sangat banyak error:
//   GET /api/notifications?limit=20 401 (Unauthorized)'
// If this test passes server-side (200), the issue is client-side.
// If it fails (401), we need to investigate server.

const { test, expect } = require('@playwright/test')

const BASE = 'https://syahfalah-dashboard.vercel.app'
const PIN_OWNER = '1607' // owner

test('Owner can fetch /api/notifications after fresh login (reproduces user error)', async ({ page, request }) => {
  // Use UI login to get fresh cookie
  await page.goto(`${BASE}/login`)
  await page.waitForSelector('input#pin', { timeout: 15000 })
  await page.locator('input#pin').fill(PIN_OWNER)
  await page.locator('button[type="submit"]').click()
  await page.waitForLoadState('networkidle')

  // Now we're logged in. Use request context (shares cookies with page)
  // Fetch the same endpoints the user reports 401 on
  const responses = []
  page.on('response', (response) => {
    if (response.url().includes('/api/notifications')) {
      responses.push({ url: response.url(), status: response.status() })
    }
  })

  // Navigate to /owner (home)
  await page.goto(`${BASE}/owner`)
  await page.waitForLoadState('networkidle')

  // Wait for the refetchInterval (30s) — but we'll trigger manually by clicking bell
  await page.locator('button[aria-label="Buka pencarian"], [aria-label="Buka pencarian"], button.h-11.w-11').first().click().catch(() => {})
  await page.waitForTimeout(2000)

  // Check ALL notification requests during page load
  const errors = responses.filter(r => r.status >= 400)
  console.log('\\n=== Notification responses ===')
  for (const r of responses) {
    console.log(`  ${r.status} ${r.url}`)
  }
  console.log(`\\n${errors.length} errors out of ${responses.length} requests`)

  // If ANY /api/notifications returns 401, the user's bug is reproduced
  expect(errors.filter(e => e.status === 401)).toEqual([])

  // Verify the data was loaded
  const prefsRes = await request.get(`${BASE}/api/notifications/preferences`)
  expect(prefsRes.status()).toBe(200)
})