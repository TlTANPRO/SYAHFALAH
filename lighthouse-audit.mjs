// lighthouse-audit.mjs - Run Lighthouse on all 48 dashboard pages
import lighthouse from 'lighthouse';
import puppeteer from 'puppeteer';
import { writeFile } from 'node:fs/promises';

const BASE_URL = 'https://syahfalah-dashboard.vercel.app';
const PIN = '1607';

const PAGES = [
  '/owner', '/personal', '/admin', '/kepala-kantor', '/divisi', '/calendar', '/help',
  '/personal/tasks', '/personal/kpi', '/personal/sow', '/personal/schedule', '/personal/notifications',
  '/owner/marketing', '/owner/purchasing', '/owner/maintenance', '/owner/projects', '/owner/kpi',
  '/owner/reports', '/owner/cabangs', '/owner/approvals', '/owner/audit', '/owner/notifications',
  '/owner/performance', '/owner/twin', '/kpi', '/sow', '/raci', '/rewards', '/settings',
  '/admin/divisions', '/admin/sow', '/admin/users',
  '/divisi/marketing', '/divisi/finance', '/divisi/konstruksi', '/divisi/legal', '/divisi/media',
  '/kepala-kantor/coaching', '/kepala-kantor/planning', '/kepala-kantor/team',
  '/owner/ai/copilot',  // likely 404
  '/sow/sample',  // sample
];

async function main() {
  console.log('Logging in via Puppeteer first...');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector('input');
  await page.type('input', PIN);
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 3000));
  console.log('Logged in');

  const results = {
    timestamp: new Date().toISOString(),
    pages: [],
    summary: {
      total: 0,
      successful: 0,
      perf_avg: 0,
      a11y_avg: 0,
      bp_avg: 0,
      seo_avg: 0,
    },
  };

  // Get user agent from Puppeteer
  const userAgent = await browser.userAgent();

  // Use lighthouse with the existing browser
  for (const path of PAGES) {
    const url = `${BASE_URL}${path}`;
    console.log(`\n=== ${path} ===`);
    try {
      const result = await lighthouse(url, {
        port: (new URL(browser.wsEndpoint())).port,
        output: 'json',
        logLevel: 'error',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      });

      const cats = result.lhr.categories;
      const scores = {
        performance: Math.round(cats.performance.score * 100),
        accessibility: Math.round(cats.accessibility.score * 100),
        bestPractices: Math.round(cats['best-practices'].score * 100),
        seo: Math.round(cats.seo.score * 100),
      };

      console.log(`  Perf: ${scores.performance}, A11y: ${scores.accessibility}, BP: ${scores.bestPractices}, SEO: ${scores.seo}`);
      results.pages.push({ path, ...scores });
      results.summary.total++;
      results.summary.perf_avg += scores.performance;
      results.summary.a11y_avg += scores.accessibility;
      results.summary.bp_avg += scores.bestPractices;
      results.summary.seo_avg += scores.seo;
    } catch (e) {
      console.log(`  Error: ${e.message}`);
      results.pages.push({ path, error: e.message });
    }
  }

  await browser.close();

  // Compute averages
  if (results.summary.total > 0) {
    results.summary.perf_avg = Math.round(results.summary.perf_avg / results.summary.total);
    results.summary.a11y_avg = Math.round(results.summary.a11y_avg / results.summary.total);
    results.summary.bp_avg = Math.round(results.summary.bp_avg / results.summary.total);
    results.summary.seo_avg = Math.round(results.summary.seo_avg / results.summary.total);
  }

  await writeFile('lighthouse-report.json', JSON.stringify(results, null, 2));
  console.log('\n=== LIGHTHOUSE SUMMARY ===');
  console.log(`Total pages: ${results.summary.total}`);
  console.log(`Performance avg: ${results.summary.perf_avg}`);
  console.log(`Accessibility avg: ${results.summary.a11y_avg}`);
  console.log(`Best Practices avg: ${results.summary.bp_avg}`);
  console.log(`SEO avg: ${results.summary.seo_avg}`);
}

main().catch(console.error);
