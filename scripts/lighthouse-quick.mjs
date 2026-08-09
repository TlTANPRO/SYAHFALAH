// scripts/lighthouse-quick.mjs
// Lighthouse-equivalent: axe-core a11y + Performance API + SEO heuristics
// Faster than chrome-launcher (no temp dir issues)

import puppeteer from 'puppeteer';
import { AxePuppeteer } from '@axe-core/puppeteer';
import fs from 'fs';

const PAGES = [
  '/login',
  '/owner',
  '/owner/projects/flow',
  '/personal/tasks',
];

const COOKIE = process.env.COOKIE_HEADER || '';

const results = [];
const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: 'C:\\Users\\Syahfalah\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe',
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});

try {
  for (const path of PAGES) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    
    // Inject cookies
    if (COOKIE) {
      const [name, ...rest] = COOKIE.split('=');
      const value = rest.join('=');
      await page.setCookie({ name, value, domain: 'syahfalah-dashboard.vercel.app', path: '/' });
    }
    
    const url = `https://syahfalah-dashboard.vercel.app${path}`;
    const startTime = Date.now();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
      const loadTime = Date.now() - startTime;
      
      // Run axe-core
      const axe = await new AxePuppeteer(page).analyze();
      const violations = axe.violations.map(v => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.length,
      }));
      
      // Performance timing
      const timing = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0];
        if (!nav) return null;
        return {
          domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.fetchStart),
          load: Math.round(nav.loadEventEnd - nav.fetchStart),
          firstContentfulPaint: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0),
        };
      });
      
      // SEO checks
      const seo = await page.evaluate(() => {
        return {
          hasTitle: !!document.title,
          titleLength: document.title.length,
          hasMetaDescription: !!document.querySelector('meta[name="description"]'),
          hasViewport: !!document.querySelector('meta[name="viewport"]'),
          h1Count: document.querySelectorAll('h1').length,
        };
      });
      
      results.push({
        path,
        loadTime,
        timing,
        axeViolations: violations,
        axePasses: axe.passes.length,
        seo,
      });
    } catch (e) {
      results.push({ path, error: String(e).substring(0, 100) });
    }
    
    await page.close();
  }
} finally {
  await browser.close();
}

fs.writeFileSync('lighthouse-quick.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
