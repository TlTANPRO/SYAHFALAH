// tests/mobile-and-ui.spec.js
// Playwright E2E covering the two remaining audit gaps:
//   1. Mobile responsive at 375/768/1440 viewports
//   2. DetailSheet inline confirm click flow
// Run with: npx playwright test tests/mobile-and-ui.spec.js

const { test, expect } = require('@playwright/test');

const BASE = 'https://syahfalah-dashboard.vercel.app';
const PIN_OWNER = '1607';
const PIN_STAFF = '6478';

async function login(page, pin) {
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');
  // PIN input may have different types — try password first, then others
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
    // Fallback: any visible input
    await page.locator('input').first().fill(pin);
  }
  // Submit
  const submit = page.locator('button[type="submit"], button:has-text("Masuk"), button:has-text("Login")').first();
  await submit.click();
  // Wait for redirect away from /login
  await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 15000 });
}

test.describe('Mobile responsive', () => {
  for (const vp of [
    { name: 'iphone-se', width: 375, height: 667 },
    { name: 'ipad', width: 768, height: 1024 },
    { name: 'desktop', width: 1440, height: 900 },
  ]) {
    test(`${vp.name} (${vp.width}x${vp.height}): sidebar + overflow + touch targets`, async ({ browser }) => {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });
      const page = await ctx.newPage();

      await login(page, PIN_STAFF);

      await page.goto(`${BASE}/personal/tasks`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // 1. No horizontal overflow
      const overflow = await page.evaluate(() => {
        const overflow = { bodyScrollWidth: document.body.scrollWidth, viewportWidth: window.innerWidth, htmlScrollWidth: document.documentElement.scrollWidth };
        // Find elements that extend past viewport AND are not inside a scrollable parent
        const allEls = Array.from(document.querySelectorAll('*'));
        const isInScrollableParent = (el) => {
          let cur = el.parentElement;
          while (cur && cur !== document.body) {
            const style = window.getComputedStyle(cur);
            if (style.overflowX === 'auto' || style.overflowX === 'scroll' || style.overflowX === 'hidden') {
              return true;
            }
            cur = cur.parentElement;
          }
          return false;
        };
        const overflowers = allEls
          .map((el) => {
            const r = el.getBoundingClientRect();
            return {
              tag: el.tagName,
              className: (el.className || '').toString().slice(0, 80),
              right: Math.round(r.right),
              width: Math.round(r.width),
              pastViewport: Math.round(r.right - window.innerWidth),
              inScrollable: isInScrollableParent(el),
            };
          })
          .filter((o) => o.pastViewport > 5 && !o.inScrollable)
          .sort((a, b) => b.pastViewport - a.pastViewport)
          .slice(0, 10);
        return { ...overflow, overflowers };
      });
      const overflowPx = Math.max(overflow.bodyScrollWidth, overflow.htmlScrollWidth) - overflow.viewportWidth;
      console.log(`[${vp.name}] overflow: body=${overflow.bodyScrollWidth} vw=${overflow.viewportWidth} delta=${overflowPx}px`);
      console.log(`[${vp.name}] overflowers (not in scroll container):`, JSON.stringify(overflow.overflowers));
      expect(overflowPx, `${vp.name}: should not have horizontal overflow`).toBeLessThanOrEqual(15);

      // 2. Sidebar state
      const sidebar = await page.evaluate(() => {
        const aside = document.querySelector('aside');
        const mainEl = document.querySelector('main');
        const result = { found: false };
        if (aside) {
          const rect = aside.getBoundingClientRect();
          result.found = true;
          result.left = rect.left;
          result.right = rect.right;
          result.width = rect.width;
          result.transform = window.getComputedStyle(aside).transform;
          result.className = aside.className;
        }
        if (mainEl) {
          result.mainLeft = mainEl.getBoundingClientRect().left;
        }
        return result;
      });
      console.log(`[${vp.name}] sidebar:`, JSON.stringify(sidebar));
      expect(sidebar.found, `${vp.name}: sidebar exists`).toBe(true);

      if (vp.width < 768) {
        // Mobile: sidebar may either be off-canvas (collapsed state) or
        // overlay the content with a backdrop (expanded state).
        // Contract: sidebar should NOT push main content to the right.
        console.log(`[${vp.name}] mobile: sidebar.left=${sidebar.left} width=${sidebar.width} main.left=${sidebar.mainLeft}`);
        const isOverlayOrOffCanvas = sidebar.left < 0 || sidebar.mainLeft === 0 || sidebar.mainLeft === undefined;
        expect(isOverlayOrOffCanvas, `${vp.name}: sidebar should be off-canvas or overlay (not push content)`).toBe(true);
      } else {
        // Tablet/Desktop: sidebar should be visible and main pushed right
        console.log(`[${vp.name}] desktop: sidebar.left=${sidebar.left} width=${sidebar.width} main.left=${sidebar.mainLeft}`);
        expect(sidebar.left >= -50, `${vp.name}: sidebar should be visible at >=768 (left=${sidebar.left})`).toBe(true);
        expect(sidebar.width > 50, `${vp.name}: sidebar should have width (${sidebar.width})`).toBe(true);
        expect(sidebar.mainLeft >= sidebar.width - 10, `${vp.name}: main content should be pushed right by sidebar`).toBe(true);
      }

      // 3. Touch targets: all visible buttons >= 32px height
      const touchTargets = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a[href]'));
        return buttons
          .map((b) => {
            const r = b.getBoundingClientRect();
            return {
              tag: b.tagName,
              text: (b.textContent || '').trim().slice(0, 30),
              h: Math.round(r.height),
              w: Math.round(r.width),
              visible: r.width > 0 && r.height > 0,
            };
          })
          .filter((t) => t.visible);
      });
      const tooSmall = touchTargets.filter((t) => t.h < 32 && t.h > 0);
      console.log(`[${vp.name}] touch targets: ${touchTargets.length} total, ${tooSmall.length} below 32px`);
      if (tooSmall.length > 0) {
        console.log(`[${vp.name}] small targets:`, tooSmall.slice(0, 10).map((t) => `${t.tag}/${t.h}px "${t.text}"`).join(', '));
      }
      // Allow up to 20 small targets (status pills, priority pills, kbd hints, etc.)
      expect(tooSmall.length, `${vp.name}: most touch targets should be >= 32px`).toBeLessThanOrEqual(20);

      // Screenshot
      await page.screenshot({
        path: `tests/screenshots/${vp.name}.png`,
        fullPage: false,
      });

      await ctx.close();
    });
  }
});

test.describe('DetailSheet inline confirm click flow', () => {
  test('Hapus button transforms to inline confirm with Batal/Ya, Hapus buttons', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();

    await login(page, PIN_OWNER);

    // Create test task via API
    const taskId = await page.evaluate(async (pin) => {
      const loginRes = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const setCookie = loginRes.headers.get('set-cookie') || '';
      // Extract access_token cookie
      const m = setCookie.match(/access_token=([^;]+)/);
      if (m) document.cookie = `access_token=${m[1]}`;

      const createRes = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'QA DetailSheet inline confirm' }),
      });
      const data = await createRes.json();
      return data.id || data.data?.id;
    }, PIN_OWNER);

    expect(taskId, 'task created').toBeTruthy();
    console.log('Created task:', taskId);

    await page.goto(`${BASE}/personal/tasks`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Click on row's Detail button (aria-label="Edit detail") — that's the
    // only way to open DetailSheet; row itself has no onClick handler.
    const detailBtn = page.locator('button[aria-label="Edit detail"]').first();
    let rowClicked = false;
    try {
      await detailBtn.click({ timeout: 5000 });
      rowClicked = true;
    } catch (e) {
      console.log('Detail button click failed:', e.message.slice(0, 100));
    }
    if (!rowClicked) {
      // Force-click via JS
      const clicked = await page.evaluate(() => {
        const btn = document.querySelector('button[aria-label="Edit detail"]');
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });
      console.log('JS click result:', clicked);
    }
    await page.waitForTimeout(1500);

    // DetailSheet should open
    const detailSheetVisible = await page.evaluate(() => {
      // Look for either role=dialog OR a visible sheet/panel
      const dialog = document.querySelector('[role="dialog"]');
      if (dialog) return dialog.textContent?.slice(0, 200) || 'open';
      // Or look for "Simpan" button (DetailSheet has Simpan)
      const simpanBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Simpan'));
      return simpanBtn ? 'sheet-open' : null;
    });
    console.log('DetailSheet state:', detailSheetVisible?.slice(0, 100));
    expect(detailSheetVisible, 'DetailSheet should open').toBeTruthy();

    // Click Hapus button
    const hapusBtn = page.locator('button:has-text("Hapus")').first();
    await hapusBtn.click({ timeout: 5000 });
    await page.waitForTimeout(500);

    // Verify inline confirm buttons appeared
    const hasBatal = await page.locator('button:has-text("Batal")').first().isVisible().catch(() => false);
    const hasYaHapus = await page.locator('button:has-text("Ya, Hapus")').first().isVisible().catch(() => false);
    console.log(`After Hapus click: Batal=${hasBatal}, Ya Hapus=${hasYaHapus}`);
    expect(hasBatal, 'Batal button should appear inline').toBe(true);
    expect(hasYaHapus, 'Ya, Hapus button should appear inline').toBe(true);

    // Screenshot the inline confirm state
    await page.screenshot({
      path: `tests/screenshots/detail-sheet-inline-confirm.png`,
      fullPage: false,
    });

    // Click Ya, Hapus
    const yaHapusBtn = page.locator('[data-testid="detail-sheet-confirm-delete"]').first();
    await yaHapusBtn.click({ timeout: 5000 });
    await page.waitForTimeout(2000);

    // Verify task was deleted
    const afterStatus = await page.evaluate(async (id) => {
      const res = await fetch(`/api/tasks/${id}`);
      return res.status;
    }, taskId);
    console.log('Task fetch after delete:', afterStatus);
    expect(afterStatus, 'task should be deleted (>=400 means not found/forbidden)').toBeGreaterThanOrEqual(400);

    await page.screenshot({
      path: `tests/screenshots/detail-sheet-after-delete.png`,
      fullPage: false,
    });

    await ctx.close();
  });
});