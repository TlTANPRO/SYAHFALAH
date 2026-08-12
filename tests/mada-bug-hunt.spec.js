// tests/mada-bug-hunt.spec.js
// Bug hunt as Mada (kepala_kantor, PIN 0327)
// Tests RBAC, scope filtering, missing features, mobile flow

const { test, expect } = require('@playwright/test')

test.describe('Mada (kepala_kantor) — bug hunt', () => {

  test('logs in as Mada', async ({ page }) => {
    await page.goto('https://syahfalah-dashboard.vercel.app/login')
    await page.locator('input#pin').fill('0327')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(/\/(?!login)/, { timeout: 15000 })
    // After login Mada should land at /kepala-kantor
    console.log('Landed at:', page.url())
  })

  test('BUG: /personal/tasks should show inline create for Mada', async ({ page }) => {
    await page.goto('https://syahfalah-dashboard.vercel.app/login')
    await page.locator('input#pin').fill('0327')
    await page.locator('button[type="submit"]').click()
    await page.waitForLoadState('networkidle')

    await page.goto('https://syahfalah-dashboard.vercel.app/personal/tasks')
    await page.waitForLoadState('networkidle')
    // Look for inline trigger testid
    const trigger = await page.locator('[data-testid="inline-new-task-trigger"]').count()
    console.log('inline-new-task-trigger count:', trigger)
    expect(trigger, 'Mada should see inline create form on /personal/tasks').toBeGreaterThan(0)
  })

  test('BUG: /kepala-kantor renders division_id-bound data', async ({ page }) => {
    await page.goto('https://syahfalah-dashboard.vercel.app/login')
    await page.locator('input#pin').fill('0327')
    await page.locator('button[type="submit"]').click()
    await page.waitForLoadState('networkidle')

    await page.goto('https://syahfalah-dashboard.vercel.app/kepala-kantor')
    await page.waitForLoadState('networkidle')

    // Should see greeting with Mada's name or division label
    const bodyText = await page.locator('body').textContent()
    console.log('Page contains "Mada":', bodyText.includes('Mada'))
    console.log('Page contains "kepala kantor":', bodyText.toLowerCase().includes('kepala kantor'))
  })

  test('BUG RBAC: Mada should not have write access via API', async ({ request }) => {
    // Login via API
    const login = await request.post('https://syahfalah-dashboard.vercel.app/api/auth/pin', {
      data: { pin: '0327' },
      headers: { 'Content-Type': 'application/json' }
    })
    expect(login.ok()).toBeTruthy()

    // Try to create a task
    const create = await request.post('https://syahfalah-dashboard.vercel.app/api/tasks', {
      data: { title: 'Mada RBAC test', priority: 'medium' },
      headers: { 'Content-Type': 'application/json' }
    })
    // kepala_kantor should NOT be able to write — but currently 201 is returned
    console.log('Write status:', create.status())
    // If write succeeds, that's a bug
    if (create.ok()) {
      console.log('BUG CONFIRMED: kepala_kantor can write to /api/tasks')
    }
  })
})