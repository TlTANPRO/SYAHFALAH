// comprehensive-role-audit.mjs
// Login each user → probe all accessible pages → record state.
// Output: per-role JSON + markdown summary.

import puppeteer from 'puppeteer';
import { writeFile, mkdir } from 'node:fs/promises';

const BASE_URL = 'https://syahfalah-dashboard.vercel.app';

const USERS = [
  { name: 'Pak Ardian',  email: 'ardian@solfeg.io',  pin: '1607', role: 'owner' },
  { name: 'Mada',        email: 'mada@syahfalah.com', pin: '0327', role: 'kepala_kantor' },
  { name: 'Bu Nisya',    email: 'nisya@syahfalah.com', pin: '4475', role: 'pic_divisi' },
  { name: 'Reni',        email: 'reni@syahfalah.com',  pin: '5008', role: 'pic_divisi' },
  { name: 'Rizal',       email: 'rizal@syahfalah.com', pin: '4410', role: 'pic_divisi' },
  { name: 'Amir',        email: 'amir@syahfalah.com',  pin: '6478', role: 'staff' },
  { name: 'Andi',        email: 'andi@syahfalah.com',  pin: '5143', role: 'staff' },
  { name: 'Novita',      email: 'novita@syahfalah.com', pin: '5528', role: 'staff' },
  { name: 'Reta',        email: 'reta@syahfalah.co',   pin: '5182', role: 'staff' },
  { name: 'Rifki',       email: 'rifki@syahfalah.com', pin: '1532', role: 'staff' },
  { name: 'Riza',        email: 'riza@syahfalah.com',  pin: '5991', role: 'staff' },
  { name: 'Sinta',       email: 'sinta@syahfalah.com', pin: '8143', role: 'staff' },
  { name: 'Yudi',        email: 'yudi@syahfalah.com',  pin: '7927', role: 'staff' },
];

// All dashboard routes
const ROUTES = [
  '/', '/owner', '/personal', '/admin', '/kepala-kantor', '/divisi', '/calendar', '/help',
  '/owner/marketing', '/owner/purchasing', '/owner/maintenance', '/owner/projects',
  '/owner/kpi', '/owner/reports', '/owner/cabangs', '/owner/approvals', '/owner/audit',
  '/owner/notifications', '/owner/performance', '/owner/twin', '/owner/ai/copilot',
  '/personal/tasks', '/personal/kpi', '/personal/sow', '/personal/schedule', '/personal/notifications',
  '/kpi', '/sow', '/raci', '/rewards', '/settings',
  '/admin/users', '/admin/divisions', '/admin/sow',
  '/kepala-kantor/coaching', '/kepala-kantor/planning', '/kepala-kantor/team',
  '/divisi/marketing', '/divisi/finance', '/divisi/konstruksi', '/divisi/legal', '/divisi/media',
];

async function loginAs(page, user) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    const inp = document.querySelector('input');
    if (inp) inp.value = '';
  });
  await page.type('input', user.pin);
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 3000));
  // Check who we are
  const text = await page.evaluate(() => document.body.innerText.substring(0, 500));
  return text;
}

async function probeRoute(page, route) {
  try {
    const response = await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle0', timeout: 15000 });
    const status = response ? response.status() : 0;
    const url = page.url();
    // Check if redirected to login (means forbidden/no access)
    const redirected = url.includes('/login');
    // Get page summary
    const summary = await page.evaluate(() => {
      const h1 = document.querySelector('h1')?.textContent?.trim() || '';
      const errorEl = document.querySelector('[role="alert"], .text-red-500, .text-red-600');
      const errorText = errorEl?.textContent?.trim()?.substring(0, 200) || '';
      const bodyText = document.body.innerText.substring(0, 300).replace(/\n+/g, ' | ');
      return { h1, errorText, bodyText };
    });
    return { route, status, redirected, url: url.replace(BASE_URL, ''), ...summary };
  } catch (e) {
    return { route, status: 0, error: e.message.substring(0, 100) };
  }
}

async function auditUser(browser, user) {
  console.log(`\n=== ${user.name} (${user.role}) ===`);
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  // Login
  const loginResult = await loginAs(page, user);
  const loginSuccess = loginResult.includes(user.name.split(' ')[0]); // First name
  console.log(`  Login: ${loginSuccess ? 'OK' : 'FAIL'}`);

  if (!loginSuccess) {
    await ctx.close();
    return { user, loginSuccess: false, routes: [] };
  }

  // Probe routes (subset to be fast)
  const userRoutes = ROUTES.slice(0, 25); // First 25 routes for speed
  const results = [];
  for (const route of userRoutes) {
    const r = await probeRoute(page, route);
    results.push(r);
    process.stdout.write(r.status === 200 && !r.redirected ? '.' : (r.status === 403 ? 'X' : '?'));
  }
  console.log('');

  await ctx.close();
  return { user, loginSuccess: true, routes: results };
}

async function main() {
  await mkdir('audit-per-role', { recursive: true });
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });

  const summary = {
    timestamp: new Date().toISOString(),
    total_users: USERS.length,
    successful_logins: 0,
    per_user: [],
  };

  for (const user of USERS) {
    const result = await auditUser(browser, user);
    summary.per_user.push(result);
    if (result.loginSuccess) summary.successful_logins++;
    // Write per-user JSON
    await writeFile(
      `audit-per-role/${user.role}-${user.name.replace(/\s+/g, '_')}.json`,
      JSON.stringify(result, null, 2)
    );
  }

  await browser.close();

  await writeFile('audit-per-role-summary.json', JSON.stringify(summary, null, 2));

  // Build markdown summary
  let md = `# Per-Role Audit Summary\n\n`;
  md += `Total users: ${summary.total_users}\n`;
  md += `Successful logins: ${summary.successful_logins}\n\n`;
  md += `## Per-User Access Matrix\n\n`;
  md += `| User | Role | Login | Routes 200 | Routes 403 | Routes redirected |\n`;
  md += `|------|------|-------|------------|------------|--------------------|\n`;
  for (const u of summary.per_user) {
    const r200 = u.routes?.filter(r => r.status === 200 && !r.redirected).length || 0;
    const r403 = u.routes?.filter(r => r.status === 403).length || 0;
    const rRedirect = u.routes?.filter(r => r.redirected).length || 0;
    md += `| ${u.user.name} | ${u.user.role} | ${u.loginSuccess ? '✅' : '❌'} | ${r200} | ${r403} | ${rRedirect} |\n`;
  }
  await writeFile('audit-per-role-summary.md', md);

  console.log('\n=== SUMMARY ===');
  console.log(`Total users: ${summary.total_users}`);
  console.log(`Successful logins: ${summary.successful_logins}`);
}

main().catch(console.error);
