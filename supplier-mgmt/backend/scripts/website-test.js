/**
 * Full website API test. Run: node scripts/website-test.js
 * Requires backend on PORT (default 3000).
 */
const BASE = process.env.API_BASE || 'http://localhost:3000/api';
const today = new Date().toISOString().slice(0, 10);
const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  .toISOString()
  .slice(0, 10);
const year = new Date().getFullYear();
const month = new Date().getMonth() + 1;

const failures = [];
const passes = [];
const warnings = [];

const ok = (name) => passes.push(name);
const warn = (name, detail) => warnings.push({ name, detail });
const fail = (name, detail) => failures.push({ name, detail });

async function req(method, path, { token, body, expect } = {}) {
  const headers = { 'Content-Type': 'application/json', 'x-test-suite': '1' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('json')) {
    data = await res.json();
  } else {
    data = { _raw: (await res.text()).slice(0, 200) };
  }
  if (expect != null && res.status !== expect) {
    throw new Error(`${method} ${path} expected ${expect} got ${res.status}: ${JSON.stringify(data)}`);
  }
  return { res, data };
}

async function check(name, fn) {
  try {
    await fn();
    ok(name);
  } catch (e) {
    fail(name, e.message);
  }
}

async function main() {
  console.log('Website API test —', BASE);
  console.log('Date range:', monthStart, 'to', today, '\n');

  let token;
  try {
    const { data } = await req('POST', '/auth/login', {
      body: { email: 'admin@supplier.com', password: 'Admin@123' },
      expect: 200,
    });
    token = data.accessToken;
    if (!token) throw new Error('No accessToken');
    ok('POST /auth/login');
  } catch (e) {
    fail('auth', e.message);
    printResults();
    process.exit(1);
  }

  const auth = { token };

  const getChecks = [
    ['/dashboard/summary', 'dashboard summary'],
    ['/companies?limit=10', 'companies list'],
    ['/companies?limit=1', 'companies (for rates)'],
    ['/job-types?limit=10', 'job types'],
    ['/expense-types?limit=10', 'expense types'],
    ['/sites?status=active&limit=10', 'sites'],
    ['/vehicles?limit=10', 'vehicles'],
    ['/drivers?limit=10', 'drivers'],
    ['/employees?limit=10', 'employees'],
    ['/job-assignments?outsideOnly=true&limit=10', 'outside driver jobs'],
    [`/eod-entries?from=${monthStart}&to=${today}`, 'eod entries'],
    ['/eod-entries/pending', 'eod pending (may 404)'],
    [`/invoices?from=${monthStart}&to=${today}`, 'invoices'],
    [`/invoices/pending-eod?from=${monthStart}&to=${today}`, 'pending eod for invoice'],
    [`/payments?from=${monthStart}&to=${today}`, 'payments'],
    ['/driver-advances?limit=5', 'driver advances'],
    ['/employee-advances?limit=5', 'employee advances'],
    ['/users?limit=10', 'users'],
    ['/roles?limit=10', 'roles'],
    [`/reports/daily-job-report?date=${today}`, 'daily job report'],
    [`/reports/vehicle-report?from=${monthStart}&to=${today}`, 'vehicle report'],
    [`/reports/driver-report?from=${monthStart}&to=${today}`, 'driver report'],
    [`/reports/company-billing-report?from=${monthStart}&to=${today}`, 'company billing'],
    [`/reports/expense-report?from=${monthStart}&to=${today}`, 'expense report'],
    [`/reports/profit-report?from=${monthStart}&to=${today}`, 'profit report'],
    [`/reports/salary-report?month=${month}&year=${year}&type=driver`, 'salary report (driver)'],
    [`/reports/salary-report?month=${month}&year=${year}&type=employee`, 'salary report (employee)'],
  ];

  for (const [path, name] of getChecks) {
    await check(`GET ${name}`, async () => {
      const expect = path.includes('/eod-entries/pending') ? [200, 404] : 200;
      const { res, data } = await req('GET', path, auth);
      if (Array.isArray(expect)) {
        if (!expect.includes(res.status)) {
          throw new Error(`got ${res.status}`);
        }
      } else if (res.status !== expect) {
        throw new Error(`got ${res.status}: ${JSON.stringify(data)}`);
      }
      if (path === '/dashboard/summary') {
        if (!data.data || typeof data.data.todayJobsTotal !== 'number') {
          throw new Error('invalid dashboard shape');
        }
        if (!Array.isArray(data.data.driversAvailableList)) {
          throw new Error('driversAvailableList missing');
        }
      }
    });
  }

  await check('POST /auth/refresh', async () => {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status !== 200 && res.status !== 401) {
      throw new Error(`refresh returned ${res.status}`);
    }
  });

  await check('dashboard drivers available count', async () => {
    const { data } = await req('GET', '/dashboard/summary', { ...auth, expect: 200 });
    const list = data.data.driversAvailableList || [];
    const count = data.data.driversAvailable;
    if (count !== list.length) {
      warn('driversAvailable', `count ${count} !== list length ${list.length}`);
    }
  });

  await check('outside jobs include replacement column data', async () => {
    const { data } = await req('GET', '/job-assignments?outsideOnly=true&limit=5', {
      ...auth,
      expect: 200,
    });
    const rows = data.data || [];
    if (rows.length > 0 && !('replacedDriverLabel' in rows[0])) {
      throw new Error('replacedDriverLabel not in assignment response');
    }
  });

  await check('PUT /invoices/:id route exists', async () => {
    const { data: list } = await req('GET', '/invoices?limit=1', { ...auth, expect: 200 });
    const id = list.data?.[0]?.id;
    if (!id) {
      warn('invoice edit', 'no invoices to test PUT');
      return;
    }
    const { data: detail } = await req('GET', `/invoices/${id}`, { ...auth, expect: 200 });
    const d = detail.data;
    const { res } = await req('PUT', `/invoices/${id}`, {
      ...auth,
      body: {
        issuerCompanyId: d.issuerCompanyId || d.issuerCompany?.id || 1,
        billToName: d.billToName || d.billToLabel || 'Smoke Test',
        billingPeriodFrom: d.billingPeriodFrom || today,
        billingPeriodTo: d.billingPeriodTo || today,
        lineItems: (d.items || []).map((i) => ({
          id: i.id,
          ratePerTrip: i.ratePerTrip,
          amount: i.amount,
        })),
        subtotal: d.totalAmount,
        extraCharges: d.extraCharges || 0,
        discountPercent: d.discountPercent || 0,
        cgstRate: d.cgstRate || 0,
        sgstRate: d.sgstRate || 0,
      },
    });
    if (res.status === 404 && String(detail).includes('Cannot PUT')) {
      throw new Error('PUT route missing');
    }
    if (res.status !== 200 && res.status !== 400 && res.status !== 422) {
      throw new Error(`unexpected status ${res.status}`);
    }
  });

  printResults();
  process.exit(failures.length > 0 ? 1 : 0);
}

function printResults() {
  console.log(`\n✓ Passed: ${passes.length}`);
  passes.forEach((p) => console.log('  ', p));
  if (warnings.length) {
    console.log(`\n⚠ Warnings: ${warnings.length}`);
    warnings.forEach((w) => console.log('  ', w.name, '-', w.detail));
  }
  console.log(`\n✗ Failed: ${failures.length}`);
  failures.forEach((f) => console.log('  ', f.name, '-', f.detail));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
