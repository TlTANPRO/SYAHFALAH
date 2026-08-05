// Validate Wave 1 schema state via PostgREST (service_role for full visibility).
// Read-only. No writes. Reports which Plan C Wave 1 columns already exist vs missing.
import fs from 'fs';

const raw = fs.readFileSync('.env.local', 'utf8');
const env = {};
raw.split(/\r?\n/).forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
  if (m) env[m[1]] = m[2];
});
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;
const headers = { 'apikey': key, 'Authorization': 'Bearer ' + key };

// Plan C Wave 1 expected NEW columns (from pre-flight report).
const expected = {
  users:           ['reporting_to_user_id','hire_date','skills','photo_url','date_of_birth'],
  divisions:       ['level'],
  kpi_targets:     ['parent_target_id','cascade_period','auto_calculate'],
  kpi_definitions: ['cascade_level','parent_kpi_id'],
  leads:           ['score'],
};

// Tables where we also want row count + column-list summary.
const summary = ['divisions', 'kpi_definitions', 'kpi_targets', 'leads', 'consumer_cases', 'projects', 'clusters', 'tasks'];

let okCount = 0, missingCount = 0;

console.log('=== WAVE 1 COLUMN-LEVEL PROBE ===\n');

for (const [table, cols] of Object.entries(expected)) {
  for (const col of cols) {
    // Probe by selecting 1 row with just id + this col. If column missing → 42703.
    const r = await fetch(`${url}/rest/v1/${table}?select=id,${col}&limit=1`, { headers });
    if (r.status === 200) {
      okCount++;
      console.log(`[OK ]  ${table}.${col}   ALREADY EXISTS — no-op if ALTER is run`);
    } else if (r.status === 400) {
      const body = await r.text();
      if (body.includes('does not exist')) {
        missingCount++;
        console.log(`[NEW]  ${table}.${col}   MISSING — will be added by 013/014`);
      } else {
        console.log(`[?? ]  ${table}.${col}   HTTP 400 ${body.slice(0,80)}`);
      }
    } else {
      console.log(`[ERR]  ${table}.${col}   HTTP ${r.status}`);
    }
  }
}

// Table-level row counts + column list (for completeness).
console.log('\n=== TABLE ROW COUNTS + COLUMN LISTINGS ===\n');

for (const table of summary) {
  // Use Prefer: count=exact with HEAD via Range header so we get Content-Range.
  const r = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
    headers: { ...headers, 'Prefer': 'count=exact' }
  });
  const totalHeader = r.headers.get('content-range'); // e.g. "0-0/35"
  const total = totalHeader ? totalHeader.split('/')[1] : '?';
  if (r.status === 200) {
    const data = await r.json();
    const cols = Object.keys(data[0] || {}).length;
    console.log(`${table.padEnd(20)} rows=${String(total).padEnd(6)} cols_visible=${cols}`);
  } else if (r.status === 406) {
    // No rows for this table
    console.log(`${table.padEnd(20)} rows=0      (empty or no access)`);
  } else {
    console.log(`${table.padEnd(20)} HTTP ${r.status}`);
  }
}

console.log(`\n=== SUMMARY ===\nOK (already exist, no-op): ${okCount}\nNEW (will be added): ${missingCount}`);
