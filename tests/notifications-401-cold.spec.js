// tests/notifications-401-cold.spec.js
// Test scenario where /api/notifications is called BEFORE user is logged in.
// Hypothesis: if the page renders before auth state is hydrated, the bell
// might fire fetch without cookie.

const { test, expect } = require('@playwright/test')

const BASE = 'https://syahfalah-dashboard.vercel.app'
const PIN_OWNER = '1607' // owner

test('Capture requests from FRESH page load (no login yet)', async ({ page, context }) => {
  // Clear cookies BEFORE going to /owner
  await context.clearCookies()

  const apiCalls = []
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

  // Try to access /owner without auth - should redirect to /login
  await page.goto(`${BASE}/owner`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)

  console.log('\\n=== API calls before login ===')
  for (const call of apiCalls) {
    console.log(`  ${call.method} ${call.status} ${call.url}`)
  }

  // Now login
  await page.goto(`${BASE}/login`)
  await page.waitForSelector('input#pin', { timeout: 15000 })
  await page.locator('input#pin').fill(PIN_OWNER)
  await page.locator('button[type="submit"]').click()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)

  console.log('\\n=== API calls after login ===')
  for (const call of apiCalls) {
    console.log(`  ${call.method} ${call.status} ${call.url}`)
  }

  const errors = apiCalls.filter(c => c.status === 401 && c.url.includes('/api/notifications'))
  console.log(`\\n${errors.length} 401 errors`)

  // If there's even 1 notification 401, the user's bug is reproduced
  expect(errors).toEqual([])
})