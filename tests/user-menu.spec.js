// tests/user-menu.spec.js
// Regression test for UserMenu dropdown.
// Bug: clicking profile button in top-right did not show Settings/Profile/Logout menu.
// Root cause: <header> has overflow-x-hidden + backdrop-blur-md, which creates a
// stacking context that clips position:fixed children. Switching to createPortal
// renders the menu into <body> directly, escaping all parent contexts.

const { test, expect } = require('@playwright/test')

const BASE = 'https://syahfalah-dashboard.vercel.app'
const PIN_OWNER = '1607' // owner (Pak Ardian)

test('UserMenu dropdown opens on click and shows Profile/Settings/Sign Out', async ({ page }) => {
  // Login
  await page.goto(`${BASE}/login`)
  await page.waitForSelector('input#pin', { timeout: 15000 })
  await page.locator('input#pin').fill(PIN_OWNER)
  await page.locator('button[type="submit"]').click()
  await page.waitForLoadState('networkidle')

  // Verify landed on /owner
  expect(page.url()).toContain('/owner')

  // Click User menu trigger
  const trigger = page.locator('button[aria-label="User menu"]')
  await expect(trigger).toBeVisible()
  await trigger.click()
  await page.waitForTimeout(300) // animation

  // Verify dropdown is open — use the menu container (the one rendered into body via portal)
  // It's the one positioned at top > 0 with z-100
  const menuPanel = page.locator('div.fixed[style*="z-index"]').first()
  const profileLink = menuPanel.getByText('Profile', { exact: true })
  const settingsLink = menuPanel.getByText('Settings', { exact: true })
  const signOutBtn = menuPanel.getByText('Sign Out', { exact: true })

  await expect(profileLink).toBeVisible()
  await expect(settingsLink).toBeVisible()
  await expect(signOutBtn).toBeVisible()

  // Click outside should close — click on page body
  await page.mouse.click(10, 200)
  await page.waitForTimeout(200)
  // After closing, the portal-rendered menu should detach
  await expect(page.locator('div.fixed[style*="z-index"]')).toHaveCount(0, { timeout: 3000 })
})

test('UserMenu dropdown — clicking Profile navigates to /settings', async ({ page }) => {
  await page.goto(`${BASE}/login`)
  await page.waitForSelector('input#pin', { timeout: 15000 })
  await page.locator('input#pin').fill(PIN_OWNER)
  await page.locator('button[type="submit"]').click()
  await page.waitForLoadState('networkidle')

  await page.locator('button[aria-label="User menu"]').click()
  await page.waitForTimeout(200)

  // Click Profile link in the menu
  await page.locator('div.fixed[style*="z-index"]').getByText('Profile', { exact: true }).click()
  await page.waitForURL(/\/settings/, { timeout: 10000 })
  expect(page.url()).toContain('/settings')
})
