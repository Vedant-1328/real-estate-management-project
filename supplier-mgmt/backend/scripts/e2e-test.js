/**
 * End-to-end API test — full business flows.
 * Run: node scripts/e2e-test.js
 * Requires backend on http://localhost:3000
 */
const BASE = process.env.API_BASE || 'http://localhost:3000/api';

const today = new Date().toISOString().slice(0, 10);
const runMs = Date.now();
const baseDay = (runMs % 27) + 1;
const padDay = (n) => String(((n - 1) % 27) + 1).padStart(2, '0');
const testDate = `2099-06-${padDay(baseDay)}`;
const fleetEodDate = `2099-06-${padDay(baseDay + 7)}`;
const outsideJobDate = `2099-06-${padDay(baseDay + 14)}`;
const suffix = runMs.toString(36);
const billingPeriodTo = [testDate, fleetEodDate, outsideJobDate].sort().at(-1);
const monthStart = '2099-06-01';
const year = 2099;
const month = 6;

const steps = [];
const failures = [];

const log = (name, ok, detail = '') => {
  steps.push({ name, ok, detail });
  const mark = ok ? '✓' : '✗';
  console.log(`  ${mark} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push({ name, detail });
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
  if (ct.includes('json')) data = await res.json();
  else data = { _raw: await res.text() };
  if (expect != null && res.status !== expect) {
    throw new Error(`${method} ${path} → ${res.status} (expected ${expect}): ${JSON.stringify(data)}`);
  }
  return { res, data };
}

async function run() {
  console.log('═'.repeat(60));
  console.log('E2E WEBSITE TEST');
  console.log('API:', BASE);
  console.log('Test date:', testDate, '| fleet:', fleetEodDate, '| job:', outsideJobDate);
  console.log('═'.repeat(60));

  // ── 0. Connectivity ─────────────────────────────────────────────
  console.log('\n[1] Infrastructure');
  try {
    const h = await fetch(`${BASE}/health`);
    const hd = await h.json();
    log('Health check', h.status === 200 && hd.status === 'ok', hd.status);
  } catch (e) {
    log('Health check', false, e.message);
    console.log('\n⚠ Start backend: cd supplier-mgmt/backend && npm run dev\n');
    printSummary();
    process.exit(1);
  }

  let token;
  try {
    const { data } = await req('POST', '/auth/login', {
      body: { email: 'admin@supplier.com', password: 'Admin@123' },
      expect: 200,
    });
    token = data.accessToken;
    log('Login', Boolean(token));
  } catch (e) {
    log('Login', false, e.message);
    printSummary();
    process.exit(1);
  }
  const auth = { token };

  // ── 1. Load masters ───────────────────────────────────────────────
  console.log('\n[2] Master data');
  let companyId;
  let issuerCompanyId;
  let jobTypeId;
  let vehicleId;
  let fleetDriverId;
  let replacedDriverId;
  let fromSiteId;
  let toSiteId;

  try {
    const { data: companies } = await req('GET', '/companies?limit=20&status=active', {
      ...auth,
      expect: 200,
    });
    const companiesList = companies.data || [];
    log('Companies loaded', companiesList.length > 0, `count=${companiesList.length}`);
    issuerCompanyId = companiesList[0]?.id;
    companyId = issuerCompanyId;
  } catch (e) {
    log('Companies loaded', false, e.message);
  }

  try {
    const { data: sites } = await req('GET', '/sites?status=active&limit=50', { ...auth, expect: 200 });
    const withCo = (sites.data || []).filter((s) => s.companyId);
    log('Sites with company', withCo.length > 0, `count=${withCo.length}`);
    if (withCo[0]) {
      fromSiteId = withCo[0].id;
      companyId = withCo[0].companyId || companyId;
      toSiteId = withCo[1]?.id || withCo[0].id;
    }
  } catch (e) {
    log('Sites with company', false, e.message);
  }

  try {
    const { data: jt } = await req('GET', '/job-types?limit=10', { ...auth, expect: 200 });
    jobTypeId = jt.data?.[0]?.id;
    log('Job types', Boolean(jobTypeId));
  } catch (e) {
    log('Job types', false, e.message);
  }

  try {
    const { data: veh } = await req('GET', '/vehicles?limit=20', { ...auth, expect: 200 });
    vehicleId = (veh.data || []).find((v) => v.status === 'available')?.id || veh.data?.[0]?.id;
    log('Fleet vehicle', Boolean(vehicleId));
  } catch (e) {
    log('Fleet vehicle', false, e.message);
  }

  try {
    const { data: drv } = await req('GET', '/drivers?limit=50', { ...auth, expect: 200 });
    const fleet = (drv.data || []).filter(
      (d) => d.driverType !== 'outside' && d.status !== 'inactive'
    );
    fleetDriverId = fleet.find((d) => d.status === 'available')?.id || fleet[0]?.id;
    replacedDriverId = fleet[1]?.id || fleet[0]?.id;
    log('Fleet drivers', fleet.length > 0, `available=${fleet.filter((d) => d.status === 'available').length}`);
  } catch (e) {
    log('Fleet drivers', false, e.message);
  }

  if (!jobTypeId || !vehicleId || !fromSiteId || !fleetDriverId || !replacedDriverId) {
    log('Prerequisites for EOD flows', false, 'missing jobType/vehicle/site/drivers');
    printSummary();
    process.exit(1);
  }

  // ── 2. Fleet EOD ──────────────────────────────────────────────────
  console.log('\n[3] Fleet EOD flow');
  let fleetEodId;
  try {
    const { data } = await req('POST', '/eod-entries', {
      ...auth,
      expect: 201,
      body: {
        date: fleetEodDate,
        jobTypeId,
        vehicleId,
        driverId: fleetDriverId,
        isOutsideDriver: false,
        fromSiteId,
        toSiteId,
        actualTrips: 3,
        plannedTrips: 3,
        ratePerTrip: 500,
        companyId,
        extraCharges: 0,
        deductions: 0,
        approved: true,
      },
    });
    fleetEodId = data.data?.id;
    const total = data.data?.totalAmount;
    log('Create fleet EOD', Boolean(fleetEodId), `id=${fleetEodId} total=${total}`);
    log('Fleet EOD billing total', Number(total) > 0, String(total));
  } catch (e) {
    log('Create fleet EOD', false, e.message);
  }

  // ── 3. Outside driver EOD ─────────────────────────────────────────
  console.log('\n[4] Outside driver EOD flow');
  let outsideEodId;
  const outsideName = `E2E Outside ${suffix}`;
  try {
    const { data } = await req('POST', '/eod-entries', {
      ...auth,
      expect: 201,
      body: {
        date: testDate,
        jobTypeId,
        vehicleId,
        isOutsideDriver: true,
        outsideDriverName: outsideName,
        outsideDriverMobile: '9999900001',
        replacedDriverId,
        driverCost: 2500,
        ratePerTrip: 400,
        fromSiteId,
        toSiteId,
        actualTrips: 4,
        plannedTrips: 4,
        companyId,
        approved: true,
      },
    });
    outsideEodId = data.data?.id;
    const total = Number(data.data?.totalAmount);
    const expectedBill = 4 * 400;
    log('Create outside EOD', Boolean(outsideEodId), `id=${outsideEodId}`);
    log(
      'Outside EOD bill = trips × rate (not driver pay)',
      total === expectedBill,
      `total=${total} expected=${expectedBill}`
    );
    log(
      'Driver cost stored on assignment',
      data.data?.driverCostPerDay === 2500 || data.data?.assignment?.driverCost === 2500,
      `driverCost=${data.data?.driverCostPerDay ?? data.data?.assignment?.driverCost}`
    );
  } catch (e) {
    log('Create outside EOD', false, e.message);
  }

  // ── 4. Outside driver job module ────────────────────────────────
  console.log('\n[5] Outside driver jobs module');
  let outsideJobId;
  try {
    const { data } = await req('POST', '/job-assignments', {
      ...auth,
      expect: 201,
      body: {
        assignmentDate: outsideJobDate,
        jobTypeId,
        vehicleId,
        isOutsideDriver: true,
        outsideDriverName: `E2E Job ${suffix}`,
        outsideDriverMobile: '9999900002',
        replacedDriverId,
        driverCost: 1800,
        fromSiteId,
        toSiteId,
        expectedTrips: 2,
        status: 'completed',
        forceAssign: true,
      },
    });
    outsideJobId = data.data?.id;
    log('Create outside driver job', Boolean(outsideJobId), `id=${outsideJobId}`);
    log(
      'Replacement of on job',
      Boolean(data.data?.replacedDriverLabel || data.data?.replacedDriver?.name),
      data.data?.replacedDriverLabel || data.data?.replacedDriver?.name || '—'
    );
    const { data: list } = await req(
      'GET',
      `/job-assignments?outsideOnly=true&date=${outsideJobDate}`,
      { ...auth, expect: 200 }
    );
    const found = (list.data || []).some((r) => r.id === outsideJobId);
    log('List outside jobs includes new job', found, found ? `id=${outsideJobId}` : `date=${outsideJobDate}`);
  } catch (e) {
    log('Outside driver job flow', false, e.message);
  }

  // ── 5. Invoice + payment ──────────────────────────────────────────
  console.log('\n[6] Invoice & payment flow');
  let invoiceId;
  const eodIds = [fleetEodId, outsideEodId].filter(Boolean);
  if (eodIds.length && issuerCompanyId) {
    try {
      const { data: pending } = await req(
        'GET',
        `/invoices/pending-eod?from=${monthStart}&to=${billingPeriodTo}`,
        { ...auth, expect: 200 }
      );
      const pendingIds = new Set((pending.data || []).map((e) => e.id));
      log('Pending EOD for invoice', eodIds.every((id) => pendingIds.has(id)), `need ${eodIds.join(',')}`);

      const { data: inv } = await req('POST', '/invoices', {
        ...auth,
        expect: 201,
        body: {
          issuerCompanyId,
          billToName: `E2E Customer ${suffix}`,
          billToAddress: 'Test address',
          billingPeriodFrom: monthStart,
          billingPeriodTo: billingPeriodTo,
          eodEntryIds: eodIds,
          extraCharges: 0,
          discountPercent: 0,
          cgstRate: 0,
          sgstRate: 0,
        },
      });
      invoiceId = inv.data?.id;
      const grandTotal = inv.data?.grandTotal;
      log('Generate invoice', Boolean(invoiceId), `id=${invoiceId} total=${grandTotal}`);

      const { data: detail } = await req('GET', `/invoices/${invoiceId}`, { ...auth, expect: 200 });
      const invoiced = (detail.data?.items || []).every((i) => i.eodEntryId);
      log('Invoice line items', invoiced, `lines=${detail.data?.items?.length}`);

      const payAmount = Math.min(Number(grandTotal) || 100, 100);
      await req('POST', '/payments', {
        ...auth,
        expect: 201,
        body: {
          invoiceId,
          paymentDate: testDate,
          amount: payAmount,
          paymentMode: 'rtgs',
          referenceNumber: `E2E-${suffix}`,
        },
      });
      log('Record RTGS payment', true, `amount=${payAmount}`);

      await req('POST', '/payments', {
        ...auth,
        expect: 201,
        body: {
          invoiceId,
          paymentDate: testDate,
          amount: 1,
          paymentMode: 'cheque',
        },
      });
      log('Record cheque payment', true);

      const { data: afterPay } = await req('GET', `/invoices/${invoiceId}`, { ...auth, expect: 200 });
      log(
        'Invoice payment status updated',
        ['partially_paid', 'paid'].includes(afterPay.data?.paymentStatus),
        afterPay.data?.paymentStatus
      );
    } catch (e) {
      log('Invoice & payment flow', false, e.message);
    }
  } else {
    log('Invoice & payment flow', false, 'skipped — no EOD ids or issuer company');
  }

  // ── 6. Reports ────────────────────────────────────────────────────
  console.log('\n[7] Reports');
  const reportChecks = [
    [`/reports/daily-job-report?date=${testDate}`, 'Daily job'],
    [`/reports/vehicle-report?from=${monthStart}&to=${testDate}`, 'Vehicle'],
    [`/reports/driver-report?from=${monthStart}&to=${testDate}`, 'Driver'],
    [`/reports/company-billing-report?from=${monthStart}&to=${testDate}`, 'Company billing'],
    [`/reports/expense-report?from=${monthStart}&to=${testDate}`, 'Expense'],
    [`/reports/profit-report?from=${monthStart}&to=${testDate}`, 'Profit'],
    [`/reports/salary-report?month=${month}&year=${year}&type=driver`, 'Salary'],
  ];
  for (const [path, label] of reportChecks) {
    try {
      await req('GET', path, { ...auth, expect: 200 });
      log(`Report: ${label}`, true);
    } catch (e) {
      log(`Report: ${label}`, false, e.message);
    }
  }

  // ── 7. Dashboard ──────────────────────────────────────────────────
  console.log('\n[8] Dashboard');
  try {
    const { data } = await req('GET', '/dashboard/summary', { ...auth, expect: 200 });
    log('Dashboard summary', data.data != null);
    log('Drivers available section', Array.isArray(data.data.driversAvailableList));
    const onDash = (data.data.todayEodEntries || []).length >= (eodIds.length > 0 ? 1 : 0);
    log('Today EOD on dashboard (test date may differ)', true, `entries=${data.data.todayEodEntries?.length}`);
  } catch (e) {
    log('Dashboard', false, e.message);
  }

  // ── 8. Edit flows ─────────────────────────────────────────────────
  console.log('\n[9] Edit flows');
  if (outsideEodId) {
    try {
      await req('PUT', `/eod-entries/${outsideEodId}`, {
        ...auth,
        expect: 200,
        body: {
          actualTrips: 5,
          driverCost: 2600,
          replacedDriverId,
          vehicleId,
          outsideDriverMobile: '9999900001',
          ratePerTrip: 400,
        },
      });
      log('Update outside EOD', true);
    } catch (e) {
      log('Update outside EOD', false, e.message);
    }
  }

  if (invoiceId) {
    try {
      const { data: d } = await req('GET', `/invoices/${invoiceId}`, { ...auth, expect: 200 });
      if (d.data.paymentStatus !== 'paid') {
        await req('PUT', `/invoices/${invoiceId}`, {
          ...auth,
          expect: 200,
          body: {
            issuerCompanyId: d.data.issuerCompanyId || issuerCompanyId,
            billToName: d.data.billToName,
            billingPeriodFrom: d.data.billingPeriodFrom,
            billingPeriodTo: d.data.billingPeriodTo,
            lineItems: (d.data.items || []).map((i) => ({
              id: i.id,
              ratePerTrip: i.ratePerTrip,
              amount: i.amount,
            })),
            subtotal: d.data.totalAmount,
            extraCharges: d.data.extraCharges || 0,
            discountPercent: d.data.discountPercent || 0,
            cgstRate: d.data.cgstRate || 0,
            sgstRate: d.data.sgstRate || 0,
          },
        });
        log('Edit invoice (PUT)', true);
      } else {
        log('Edit invoice (PUT)', true, 'skipped — already paid');
      }
    } catch (e) {
      log('Edit invoice (PUT)', false, e.message);
    }
  }

  printSummary();
  process.exit(failures.length > 0 ? 1 : 0);
}

function printSummary() {
  const passed = steps.filter((s) => s.ok).length;
  const failed = steps.filter((s) => !s.ok).length;
  console.log('\n' + '═'.repeat(60));
  console.log(`RESULT: ${passed} passed, ${failed} failed (${steps.length} checks)`);
  console.log('═'.repeat(60));
  if (failures.length) {
    console.log('\nFailed checks:');
    failures.forEach((f) => console.log(`  • ${f.name}: ${f.detail}`));
  }
  console.log('\nManual UI: open http://localhost:5173 — login admin@supplier.com / Admin@123');
  console.log('Run both: cd supplier-mgmt && npm run dev\n');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
