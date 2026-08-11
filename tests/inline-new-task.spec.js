// tests/inline-new-task.spec.js
// Playwright test for the InlineNewTaskForm added per Mada feedback:
// "I cannot find how to add a task from the dashboard."

const { test, expect } = require('@playwright/test');

const BASE = 'https://syahfalah-dashboard.vercel.app';
const PIN = '0327'; // Mada

async function login(page, pin) {
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');
  const types = ['password', 'tel', 'text', 'number'];
  let filled = false;
  for (const type of types) {
    const input = page.locator(`input[type="${type}"]`).first();
    if (await input.count() > 0 && await input.isVisible()) {
      await input.fill(pin);
      filled = true;
      break;
    }
  }
  if (!filled) {
    await page.locator('input').first().fill(pin);
  }
  const submit = page.locator('button[type="submit"], button:has-text("Masuk"), button:has-text("Login")').first();
  await submit.click();
  await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 20000 });
}

test('Mada can see "Tambah Task" button on /personal/tasks and create task inline', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  await login(page, PIN);

  // Navigate to /personal/tasks via sidebar
  await page.goto(`${BASE}/personal/tasks`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  // 1. InlineNewTaskForm trigger visible
  const triggerVisible = await page.locator('[data-testid="inline-new-task-trigger"]').first().isVisible();
  console.log('Inline trigger visible:', triggerVisible);
  expect(triggerVisible, 'Tambah Task button should be visible without keyboard shortcut').toBe(true);

  // Screenshot before click
  await page.screenshot({ path: 'tests/screenshots/inline-new-task-trigger.png' });

  // 2. Click trigger to open form
  await page.locator('[data-testid="inline-new-task-trigger"]').first().click();
  await page.waitForTimeout(500);

  const formVisible = await page.locator('[data-testid="inline-new-task-form"]').first().isVisible();
  console.log('Form visible after trigger click:', formVisible);
  expect(formVisible, 'Form should expand when trigger clicked').toBe(true);

  // Screenshot open form
  await page.screenshot({ path: 'tests/screenshots/inline-new-task-form-open.png' });

  // 3. Fill title and submit
  const uniqueTitle = `QA inline test ${Date.now()}`;
  await page.locator('input[name="new-task-title"]').first().fill(uniqueTitle);
  await page.locator('[data-testid="inline-new-task-submit"]').first().click();
  await page.waitForTimeout(2000);

  // 4. Verify task appears in list (visible somewhere on page)
  const taskVisible = await page.evaluate((title) => {
    const allText = document.body.innerText;
    return allText.includes(title);
  }, uniqueTitle);
  console.log(`Task "${uniqueTitle}" visible in list:`, taskVisible);
  expect(taskVisible, 'Newly created task should appear in list').toBe(true);

  // Screenshot with new task
  await page.screenshot({ path: 'tests/screenshots/inline-new-task-after-create.png', fullPage: true });

  // 5. Cleanup via API
  const cleanupResult = await page.evaluate(async (title) => {
    const list = await fetch('/api/tasks?pageSize=20').then(r => r.json());
    const target = (list.data || []).find((t) => t.title === title);
    if (target) {
      const del = await fetch(`/api/tasks/${target.id}`, { method: 'DELETE' });
      return del.status;
    }
    return null;
  }, uniqueTitle);
  console.log('Cleanup delete status:', cleanupResult);

  await ctx.close();
});