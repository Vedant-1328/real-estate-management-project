/**
 * Full API smoke test. Run: node scripts/full-smoke.js
 * Requires backend on PORT (default 3000).
 */
const BASE = process.env.API_BASE || 'http://localhost:3000/api';
const today = new Date().toISOString().slice(0, 10);
const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  .toISOString()
  .slice(0, 10);

const failures = [];
const passes = [];

const ok = (name) => {
  passes.push(name);
};
const fail = (name, detail) => {
  failures.push({ name, detail });
};

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
    data = { _raw: (await res.text()).slice(0, 120) };
  }
  if (expect != null && res.status !== expect) {
    throw new Error(`${method} ${path} expected ${expect} got ${res.status}: ${JSON.stringify(data)}`);
  }
  return { res, data };
}

async function main() {
  try {
    const { data: login } = await req('POST', '/auth/login', {
      body: { email: 'admin@supplier.com', password: 'Admin@123' },
      expect: 200,
    });
    const token = login.accessToken;
    if (!token) throw new Error('No accessToken');
    ok('auth/login');

    const checks = [
      ['GET', '/dashboard/summary', null, 200],
      ['GET', '/companies?limit=5', null, 200],
      ['GET', '/vehicles?limit=5', null, 200],
      ['GET', '/drivers?limit=5', null, 200],
      ['GET', '/sites?limit=5', null, 200],
      ['GET', '/eod-entries?from=' + monthStart + '&to=' + today, null, 200],
      ['GET', '/invoices?from=' + monthStart + '&to=' + today, null, 200],
      ['GET', '/invoices/pending-eod?from=' + monthStart + '&to=' + today, null, 200],
      ['GET', '/payments?from=' + monthStart + '&to=' + today, null, 200],
      ['GET', '/reports/daily-job-report?date=' + today, null, 200],
      ['GET', '/reports/vehicle-report?from=' + monthStart + '&to=' + today, null, 200],
      ['GET', '/reports/driver-report?from=' + monthStart + '&to=' + today, null, 200],
      ['GET', '/reports/company-billing-report?from=' + monthStart + '&to=' + today, null, 200],
      ['GET', '/reports/expense-report?from=' + monthStart + '&to=' + today, null, 200],
      ['GET', '/reports/profit-report?from=' + monthStart + '&to=' + today, null, 200],
      [
        'GET',
        '/reports/salary-report?month=' +
          (new Date().getMonth() + 1) +
          '&year=' +
          new Date().getFullYear() +
          '&type=driver',
        null,
        200,
      ],
      ['GET', '/eod-entries/pending', null, 404],
      ['PUT', '/invoices/1', { billToName: 'x' }, null], // may 404 or 422
    ];

    for (const [method, path, body, expect] of checks) {
      try {
        const { res, data } = await req(method, path, { token, body, expect });
        if (path === '/reports/company-billing-report?from=' + monthStart + '&to=' + today) {
          const hasBillTo =
            Array.isArray(data.data) &&
            data.data.some((r) => r.totalInvoiced > 0 || r.totalPaid > 0);
          const inv = await req('GET', '/invoices?from=' + monthStart + '&to=' + today, {
            token,
            expect: 200,
          });
          const activeInv = (inv.data.data || []).filter(
            (i) => i.paymentStatus !== 'cancelled'
          );
          if (activeInv.length > 0 && !hasBillTo) {
            fail('company-billing-report', 'active invoices exist but report shows no invoiced');
          } else {
            ok('company-billing-report');
          }
          continue;
        }
        if (path.startsWith('PUT /invoices')) continue;
        ok(path.split('?')[0]);
      } catch (e) {
        if (path.includes('PUT /invoices/1')) {
          if (e.message.includes('404') && e.message.includes('Cannot PUT')) {
            fail('PUT /invoices/:id', 'route missing — restart backend');
          } else if (e.message.includes('404') || e.message.includes('422')) {
            ok('PUT /invoices/:id (route exists)');
          } else {
            fail(path, e.message);
          }
        } else {
          fail(path, e.message);
        }
      }
    }

    // PUT invoice route check
    try {
      const invList = await req('GET', '/invoices?limit=1', { token, expect: 200 });
      const id = invList.data.data?.[0]?.id;
      if (id) {
        const detail = await req('GET', `/invoices/${id}`, { token, expect: 200 });
        const d = detail.data.data;
        await req('PUT', `/invoices/${id}`, {
          token,
          body: {
            issuerCompanyId: d.issuerCompanyId || d.issuerCompany?.id || 1,
            billToName: d.billToName || d.billToLabel || 'Test',
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
          expect: d.paymentStatus === 'paid' ? 400 : 200,
        });
        ok('PUT /invoices/:id update');
      }
    } catch (e) {
      fail('PUT /invoices/:id update', e.message);
    }
  } catch (e) {
    fail('setup', e.message);
  }

  console.log(`\nPassed: ${passes.length}`);
  passes.forEach((p) => console.log('  ✓', p));
  console.log(`\nFailed: ${failures.length}`);
  failures.forEach((f) => console.log('  ✗', f.name, '-', f.detail));
  process.exit(failures.length > 0 ? 1 : 0);
}

main();
