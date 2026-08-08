// audit-verbose.mjs - audit one page with detail
import puppeteer from 'puppeteer';
import { AxePuppeteer } from '@axe-core/puppeteer';
import { writeFile } from 'node:fs/promises';

const url = process.argv[2] || 'https://syahfalah-dashboard.vercel.app/owner/kpi';
const PIN = '1607';

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });

await page.goto('https://syahfalah-dashboard.vercel.app/login');
await page.waitForSelector('input');
await page.type('input', PIN);
await page.keyboard.press('Enter');
await new Promise(r => setTimeout(r, 3000));

await page.goto(url, { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1500));

const results = await new AxePuppeteer(page).withTags(['wcag2aa']).analyze();
for (const v of results.violations) {
  if (v.id === 'color-contrast') {
    console.log(`\n=== ${v.help} (${v.nodes.length} nodes) ===`);
    for (const node of v.nodes.slice(0, 5)) {
      console.log(`  target: ${node.target.join(' ')}`);
      console.log(`    html: ${node.html.substring(0, 200)}`);
      console.log(`    summary: ${node.failureSummary}`);
      console.log();
    }
  }
}

await browser.close();
