// tests/inline-new-task.spec.js
// Playwright test for the InlineNewTaskForm added per Mada feedback:
// "I cannot find how to add a task from the dashboard."

const { test, expect } = require('@playwright/test')

const BASE = 'https://syahfalah-dashboard.vercel.app'
const PIN_MADA = '0327' // kepala_kantor

// UI-based login (same pattern as mobile-and-ui.spec.js which works reliably).
async function login(page, pin) {
  await page.goto(`${BASE}/login`)
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('input[inputmode="numeric"], input[type="password"], input[type="tel"]', { timeout: 20000 })
  await page.waitForTimeout(500)
  const types = ['password', 'tel', 'text', 'number']
  let filled = false
  for (const type of types) {
    const input = page.locator(`input[type="${type}"]`).first()
    if (await input.count() > 0 && await input.isVisible()) {
      await input.click()
      await input.fill(pin)
      const value = await input.inputValue()
      if (value === pin) {
        filled = true
        break
      }
    }
  }
  if (!filled) {
    const inputmodeInput = page.locator('input[inputmode="numeric"]').first()
    if (await inputmodeInput.count() > 0) {
      await inputmodeInput.click()
      await inputmodeInput.fill(pin)
      filled = true
    }
  }
  if (!filled) {
    await page.locator('input').first().fill(pin)
  }
  const submit = page.locator('button[type="submit"]').first()
  await submit.click()
  await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 30000 })
  await page.waitForTimeout(1000)
}

test('Mada can see "Tambah Task" button on /personal/tasks and create task inline', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()

  await login(page, PIN_MADA)

  // Navigate to /personal/tasks. UI login already redirected to /kepala-kantor,
  // so go to the target page.
  await page.goto(`${BASE}/personal/tasks`)
  await page.waitForLoadState('domcontentloaded')

  // Wait for layout (sidebar) to render
  await page.waitForSelector('aside', { timeout: 30000 })

  // Wait for the InlineNewTaskForm trigger
  await page.waitForSelector('[data-testid="inline-new-task-trigger"]', { timeout: 30000 })
  await page.waitForTimeout(500)

  // 1. InlineNewTaskForm trigger visible
  const triggerVisible = await page.locator('[data-testid="inline-new-task-trigger"]').first().isVisible()
  console.log('Inline trigger visible:', triggerVisible)
  expect(triggerVisible, 'Tambah Task button should be visible without keyboard shortcut').toBe(true)

  // Screenshot before click
  await page.screenshot({ path: 'tests/screenshots/inline-new-task-trigger.png' })

  // 2. Click trigger to open form
  await page.locator('[data-testid="inline-new-task-trigger"]').first().click()
  await page.waitForTimeout(500)

  const formVisible = await page.locator('[data-testid="inline-new-task-form"]').first().isVisible()
  console.log('Form visible after trigger click:', formVisible)
  expect(formVisible, 'Form should expand when trigger clicked').toBe(true)

  // Screenshot open form
  await page.screenshot({ path: 'tests/screenshots/inline-new-task-form-open.png' })

  // 3. Fill title and submit
  const title = `Mada test ${Date.now()}`
  await page.locator('input[name="new-task-title"]').fill(title)
  await page.locator('[data-testid="inline-new-task-submit"]').click()

  // 4. Wait for the success toast to appear (proves the API call worked)
  await page.waitForSelector('text=Berhasil dibuat', { timeout: 10000 })
  console.log('Success toast appeared')

  // 5. The form closes on success; React Query invalidates and refetches.
  //    Wait a moment then reload to make sure the new task is in the list.
  await page.waitForTimeout(2000)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('aside', { timeout: 30000 })
  await page.waitForTimeout(2000) // let task list hydrate

  // 6. Search for the just-created task in the list to verify it exists.
  //    (Default sort places new task at bottom, not visible without scroll.)
  await page.locator('input[placeholder="Cari tugas..."]').fill(title)
  await page.waitForTimeout(1000)
  await page.waitForSelector(`text=${title}`, { timeout: 5000 })
  console.log('Task found in list via search filter')
})
