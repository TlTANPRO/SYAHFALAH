// tests/notifications-401-real.spec.js
// Captures ACTUAL fetch calls from the page (with the user's cookie)
// to see what status /api/notifications returns.

const { test, expect } = require('@playwright/test')

const BASE = 'https://syahfalah-dashboard.vercel.app'
const PIN_OWNER = '1607' // owner

test('Capture ALL /api/notifications responses during user session', async ({ page }) => {
  const apiCalls = []

  // Capture all responses
  page.on('response', async (response) => {
    const url = response.url()
    if (url.includes('/api/notifications') || url.includes('/api/auth')) {
      apiCalls.push({
        url: url.replace(BASE, ''),
        status: response.status(),
        method: response.request().method(),
      })
    }
  })

  // Login
  await page.goto(`${BASE}/login`)
  await page.waitForSelector('input#pin', { timeout: 15000 })
  await page.locator('input#pin').fill(PIN_OWNER)
  await page.locator('button[type="submit"]').click()
  await page.waitForLoadState('networkidle')

  // Wait for /owner page to render and React Query to fire
  await page.waitForTimeout(3000)

  // Navigate to /settings
  await page.goto(`${BASE}/settings`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)

  // Go back to /owner
  await page.goto(`${BASE}/owner`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)

  console.log('\\n=== API calls captured ===')
  for (const call of apiCalls) {
    console.log(`  ${call.method} ${call.status} ${call.url}`)
  }

  const errors = apiCalls.filter(c => c.status >= 400)
  console.log(`\\n${errors.length} errors out of ${apiCalls.length} requests`)
  for (const err of errors) {
    console.log(`  ERROR: ${err.method} ${err.status} ${err.url}`)
  }

  // The user's bug: ANY 401 should fail this test
  const auth401 = apiCalls.filter(c => c.status === 401 && c.url.includes('/api/notifications'))
  expect(auth401).toEqual([])
})