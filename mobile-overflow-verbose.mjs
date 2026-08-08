// mobile-overflow-verbose.mjs - Find what element causes overflow on mobile
import puppeteer from 'puppeteer';

const url = 'https://syahfalah-dashboard.vercel.app/owner';
const PIN = '1607';

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 360, height: 720, deviceScaleFactor: 2 });

await page.goto('https://syahfalah-dashboard.vercel.app/login');
await page.waitForSelector('input');
await page.type('input', PIN);
await page.keyboard.press('Enter');
await new Promise(r => setTimeout(r, 3000));

await page.goto(url, { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1500));

// Find elements wider than viewport
const offenders = await page.evaluate(() => {
  const result = [];
  const all = document.querySelectorAll('*');
  for (const el of all) {
    const rect = el.getBoundingClientRect();
    if (rect.right > window.innerWidth + 1) {
      result.push({
        tag: el.tagName,
        class: el.className.substring(0, 60),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        left: Math.round(rect.left),
      });
    }
  }
  return result.slice(0, 20);
});

console.log('Offenders (elements extending past viewport):');
for (const o of offenders) {
  console.log(`  ${o.tag} (right=${o.right}, w=${o.width}, l=${o.left}): ${o.class}`);
}

await browser.close();
