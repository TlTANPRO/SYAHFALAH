// audit-pages.mjs
// Run axe-core + Lighthouse audits on all dashboard pages.

import puppeteer from 'puppeteer';
import { AxePuppeteer } from '@axe-core/puppeteer';
import { writeFile } from 'node:fs/promises';

const BASE_URL = 'https://syahfalah-dashboard.vercel.app';
const PIN = '1607';

const PAGES = [
  { name: 'owner', path: '/owner' },
  { name: 'personal', path: '/personal' },
  { name: 'admin', path: '/admin' },
  { name: 'kepala-kantor', path: '/kepala-kantor' },
  { name: 'divisi', path: '/divisi' },
  { name: 'calendar', path: '/calendar' },
  { name: 'help', path: '/help' },
  { name: 'personal/tasks', path: '/personal/tasks' },
  { name: 'personal/kpi', path: '/personal/kpi' },
  { name: 'personal/sow', path: '/personal/sow' },
  { name: 'personal/schedule', path: '/personal/schedule' },
  { name: 'personal/notifications', path: '/personal/notifications' },
  { name: 'owner/marketing', path: '/owner/marketing' },
  { name: 'owner/purchasing', path: '/owner/purchasing' },
  { name: 'owner/maintenance', path: '/owner/maintenance' },
  { name: 'owner/projects', path: '/owner/projects' },
  { name: 'owner/kpi', path: '/owner/kpi' },
  { name: 'owner/reports', path: '/owner/reports' },
  { name: 'owner/cabangs', path: '/owner/cabangs' },
  { name: 'owner/approvals', path: '/owner/approvals' },
  { name: 'kpi', path: '/kpi' },
  { name: 'sow', path: '/sow' },
  { name: 'raci', path: '/raci' },
  { name: 'rewards', path: '/rewards' },
  { name: 'settings', path: '/settings' },
];

const results = {
  timestamp: new Date().toISOString(),
  base_url: BASE_URL,
  pages: [],
  summary: {
    total: PAGES.length,
    a11y_clean: 0,
    a11y_with_violations: 0,
    violation_count: 0,
  },
};

async function auditPage(page, pageInfo) {
  const url = `${BASE_URL}${pageInfo.path}`;
  console.log(`\n=== ${pageInfo.name} (${pageInfo.path}) ===`);

  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  } catch (e) {
    console.log('  Navigation failed:', e.message);
    return null;
  }

  await new Promise(r => setTimeout(r, 1500));

  // axe-core
  let axeResults = null;
  try {
    const axeRunner = await new AxePuppeteer(page)
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    axeResults = axeRunner;
  } catch (e) {
    console.log('  axe failed:', e.message);
  }

  return {
    page: pageInfo.name,
    path: pageInfo.path,
    url,
    axe: axeResults ? {
      violations: axeResults.violations.length,
      passes: axeResults.passes.length,
      incomplete: axeResults.incomplete.length,
      violation_details: axeResults.violations.map(v => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        helpUrl: v.helpUrl,
        nodes: v.nodes.length,
        target: v.nodes[0]?.target?.[0] ?? null,
      })),
    } : null,
  };
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  // Login
  console.log('Logging in...');
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector('input', { timeout: 10000 });
  await page.type('input', PIN);
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 3000));
  console.log('Logged in');

  for (const pageInfo of PAGES) {
    const result = await auditPage(page, pageInfo);
    if (result) {
      results.pages.push(result);
      if (result.axe) {
        if (result.axe.violations === 0) results.summary.a11y_clean++;
        else results.summary.a11y_with_violations++;
        results.summary.violation_count += result.axe.violations;
      }
    }
  }

  await browser.close();
  await writeFile('audit-report.json', JSON.stringify(results, null, 2));

  console.log('\n==================');
  console.log('SUMMARY');
  console.log('==================');
  console.log(`Total pages: ${results.summary.total}`);
  console.log(`A11y clean: ${results.summary.a11y_clean}`);
  console.log(`A11y with violations: ${results.summary.a11y_with_violations}`);
  console.log(`Total violations: ${results.summary.violation_count}`);

  // Top 10 violations by impact
  const allViolations = results.pages.flatMap(p => (p.axe?.violation_details || []).map(v => ({
    page: p.page,
    ...v,
  })));
  const byId = {};
  for (const v of allViolations) {
    byId[v.id] = (byId[v.id] || 0) + v.nodes;
  }
  const top = Object.entries(byId).sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log('\nTop 10 violations by node count:');
  for (const [id, count] of top) {
    console.log(`  ${id}: ${count} nodes`);
  }
}

main().catch(console.error);
