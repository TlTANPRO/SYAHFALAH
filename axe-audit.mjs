// axe-audit.mjs - Run axe-core accessibility audit on Syahfalah dashboard
// Login as Pak Ardian, audit multiple pages, output findings

import puppeteer from 'puppeteer';
import { AxePuppeteer } from '@axe-core/puppeteer';
import fs from 'fs';

const BASE = 'https://syahfalah-dashboard.vercel.app';
const PIN = '1607';

const PAGES = [
  { path: '/', name: 'login' },
  { path: '/owner', name: 'executive-overview' },
  { path: '/owner/kpi', name: 'kpi-explorer' },
  { path: '/owner/performance', name: 'performance' },
  { path: '/owner/reports', name: 'reports' },
  { path: '/owner/dw', name: 'data-warehouse' },
  { path: '/owner/audit', name: 'audit-log' },
  { path: '/personal', name: 'personal-dashboard' },
  { path: '/personal/tasks', name: 'personal-tasks' },
  { path: '/personal/kpi', name: 'personal-kpi' },
  { path: '/admin/users', name: 'admin-users' },
  { path: '/employees', name: 'employees' },
  { path: '/attendance', name: 'attendance' },
  { path: '/leave', name: 'leave' },
  { path: '/documents', name: 'documents' },
  { path: '/org-chart', name: 'org-chart' },
  { path: '/sow', name: 'sow' },
  { path: '/calendar', name: 'calendar' },
  { path: '/settings', name: 'settings' },
];

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();

// Login
await page.goto(BASE + '/login');
await page.waitForSelector('input');
await page.type('input', PIN);
await page.keyboard.press('Enter');
await new Promise(r => setTimeout(r, 3000));

const results = [];

for (const { path, name } of PAGES) {
  try {
    await page.goto(BASE + path, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));
    const result = await new AxePuppeteer(page)
      .options({ rules: {} })
      .analyze();
    const violations = result.violations.map(v => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.length,
      description: v.description,
    }));
    results.push({ path, name, violations, totalViolations: violations.reduce((s, v) => s + v.nodes, 0) });
    console.log(`${path}: ${violations.reduce((s, v) => s + v.nodes, 0)} violations`);
  } catch (e) {
    results.push({ path, name, error: e.message });
    console.log(`${path}: ERROR - ${e.message.substring(0, 80)}`);
  }
}

await browser.close();

fs.writeFileSync('axe-report.json', JSON.stringify(results, null, 2));
console.log('\nSaved to axe-report.json');
