// lighthouse-verbose.mjs - Get detailed SEO issues for one page
import lighthouse from 'lighthouse';
import puppeteer from 'puppeteer';

const url = 'https://syahfalah-dashboard.vercel.app/owner';
const PIN = '1607';

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto('https://syahfalah-dashboard.vercel.app/login');
await page.waitForSelector('input');
await page.type('input', PIN);
await page.keyboard.press('Enter');
await new Promise(r => setTimeout(r, 3000));

const port = (new URL(browser.wsEndpoint())).port;
const result = await lighthouse(url, {
  port,
  output: 'json',
  logLevel: 'error',
  onlyCategories: ['seo'],
});

console.log('SEO Score:', Math.round(result.lhr.categories.seo.score * 100));
console.log('\n=== Failed SEO audits ===');
const seoAudits = result.lhr.categories.seo.auditRefs;
for (const ref of seoAudits) {
  const audit = result.lhr.audits[ref.id];
  if (audit.score !== null && audit.score < 1) {
    console.log(`\n  ❌ ${audit.title} (score: ${audit.score})`);
    console.log(`     ${audit.description.substring(0, 200)}`);
    if (audit.details && audit.details.items && audit.details.items.length > 0) {
      for (const item of audit.details.items.slice(0, 2)) {
        console.log(`     - ${JSON.stringify(item).substring(0, 200)}`);
      }
    }
  }
}

await browser.close();
