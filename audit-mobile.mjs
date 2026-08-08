// audit-mobile.mjs - Mobile responsive audit at 360px viewport
import puppeteer from 'puppeteer';
import { writeFile } from 'node:fs/promises';

const BASE_URL = 'https://syahfalah-dashboard.vercel.app';
const PIN = '1607';

const PAGES = [
  { name: 'owner', path: '/owner' },
  { name: 'personal', path: '/personal' },
  { name: 'owner/marketing', path: '/owner/marketing' },
  { name: 'owner/purchasing', path: '/owner/purchasing' },
  { name: 'personal/tasks', path: '/personal/tasks' },
  { name: 'admin', path: '/admin' },
  { name: 'kepala-kantor', path: '/kepala-kantor' },
  { name: 'divisi', path: '/divisi' },
];

const results = { timestamp: new Date().toISOString(), pages: [], summary: { horizontalScroll: 0, textOverflow: 0, smallTapTarget: 0 } };

async function auditMobile(page, pageInfo) {
  const url = `${BASE_URL}${pageInfo.path}`;
  console.log(`\n=== ${pageInfo.name} (${pageInfo.path}) ===`);
  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  } catch (e) {
    return null;
  }

  // Check horizontal scroll
  const overflow = await page.evaluate(() => {
    const body = document.body;
    const html = document.documentElement;
    return {
      bodyWidth: body.scrollWidth,
      viewportWidth: window.innerWidth,
      hasHorizontalScroll: body.scrollWidth > window.innerWidth,
    };
  });

  // Check for text overflow
  const textOverflow = await page.evaluate(() => {
    const elements = document.querySelectorAll('h1, h2, h3, p, span, div');
    let count = 0;
    const samples = [];
    for (const el of elements) {
      if (el.scrollWidth > el.clientWidth + 1) {
        count++;
        if (samples.length < 3) {
          samples.push({
            text: el.textContent?.substring(0, 50),
            className: el.className,
          });
        }
      }
    }
    return { count, samples };
  });

  // Check small tap targets (buttons < 44px)
  const smallTapTargets = await page.evaluate(() => {
    const interactive = document.querySelectorAll('button, a, [role="button"]');
    let count = 0;
    const samples = [];
    for (const el of interactive) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && (rect.height < 36 || rect.width < 36)) {
        count++;
        if (samples.length < 3) {
          samples.push({
            tag: el.tagName,
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            text: el.textContent?.substring(0, 30),
          });
        }
      }
    }
    return { count, samples };
  });

  // Take screenshot
  const screenshot = await page.screenshot({ fullPage: false });

  const pageResult = {
    page: pageInfo.name,
    path: pageInfo.path,
    hasHorizontalScroll: overflow.hasHorizontalScroll,
    bodyScrollWidth: overflow.bodyWidth,
    viewportWidth: overflow.viewportWidth,
    textOverflow: textOverflow.count,
    textOverflowSamples: textOverflow.samples,
    smallTapTargets: smallTapTargets.count,
    smallTapSamples: smallTapTargets.samples,
  };

  console.log(`  Horizontal scroll: ${overflow.hasHorizontalScroll ? 'YES' : 'no'} (${overflow.bodyWidth}px vs ${overflow.viewportWidth}px)`);
  console.log(`  Text overflow: ${textOverflow.count} nodes`);
  console.log(`  Small tap targets: ${smallTapTargets.count} nodes`);

  if (overflow.hasHorizontalScroll) results.summary.horizontalScroll++;
  if (textOverflow.count > 5) results.summary.textOverflow++;
  if (smallTapTargets.count > 5) results.summary.smallTapTarget++;

  return pageResult;
}

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 360, height: 720, deviceScaleFactor: 2 });

  // Login
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector('input');
  await page.type('input', PIN);
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 3000));

  for (const pageInfo of PAGES) {
    const result = await auditMobile(page, pageInfo);
    if (result) results.pages.push(result);
  }

  await browser.close();
  await writeFile('audit-mobile.json', JSON.stringify(results, null, 2));

  console.log('\n=== MOBILE AUDIT SUMMARY ===');
  console.log(`Pages with horizontal scroll: ${results.summary.horizontalScroll}`);
  console.log(`Pages with text overflow: ${results.summary.textOverflow}`);
  console.log(`Pages with small tap targets: ${results.summary.smallTapTarget}`);
}

main().catch(console.error);
