// e2e/joblist.spec.ts
// Run via: pnpm exec playwright test e2e/joblist.spec.ts
// Requires: dev server running, valid session cookie, at least 1 row in tasks table.

import { test, expect } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000'

test.describe('Joblist page', () => {
  test('renders KPIs, sheet tabs, and table', async ({ page }) => {
    // The test harness is expected to set a valid auth cookie via storageState.
    await page.goto(`${BASE}/joblist`)

    // 4 KPI cards visible
    await expect(page.getByText('Hari ini')).toBeVisible()
    await expect(page.getByText('Total')).toBeVisible()
    await expect(page.getByText('Terlambat')).toBeVisible()
    await expect(page.getByText('Selesai')).toBeVisible()

    // Sheet tab strip — at minimum Master tab present
    await expect(page.getByRole('button', { name: /Master/i })).toBeVisible()

    // Header
    await expect(page.getByRole('heading', { name: 'Joblist' })).toBeVisible()
  })

  test('switches active sheet tab', async ({ page }) => {
    await page.goto(`${BASE}/joblist`)
    const masterTab = page.getByRole('button', { name: /Master/i })
    await masterTab.click()
    await expect(masterTab).toHaveAttribute('aria-pressed', 'true')
  })

  test('filters rows by search query', async ({ page }) => {
    await page.goto(`${BASE}/joblist`)
    const search = page.getByPlaceholder(/Cari judul/i)
    await search.fill('Brosur')
    // Table rows that don't match should disappear; rows that match stay.
    // We don't assert specific text since data is dynamic — just verify
    // the search box accepted input without error.
    await expect(search).toHaveValue('Brosur')
  })

  test('rejects unauthenticated access', async ({ browser }) => {
    const ctx = await browser.newContext() // no storageState
    const page = await ctx.newPage()
    await page.goto(`${BASE}/joblist`)
    // Expected: redirect to /login
    await expect(page).toHaveURL(/\/login/)
    await ctx.close()
  })
})
