import { Op, fn, col, literal } from 'sequelize';
import {
  Company,
  DailyExpense,
  Driver,
  DriverAdvance,
  Employee,
  EmployeeAdvance,
  EodEntry,
  ExpenseType,
  Invoice,
  JobAssignment,
  JobType,
  Payment,
  Site,
  Vehicle,
} from '../models/index.js';
import { buildSalarySummaryRow } from '../utils/salaryAdvanceSummary.js';
import {
  aggregateAssignmentsByDriver,
  groupCountInstances,
  groupSumInstances,
  sumInstances,
  sumUnassignedOutsideDriverCost,
} from '../utils/encryptedAggregates.js';

const num = (v) => Number(v ?? 0);

const siteLabel = (site, temp) => site?.siteName || temp || '—';

const effectiveEodCompanyId = (plain) => {
  const n = (v) => (v != null && v !== '' ? Number(v) : null);
  return (
    n(plain.companyId) ??
    n(plain.fromSite?.companyId) ??
    n(plain.toSite?.companyId) ??
    n(plain.assignment?.companyId) ??
    null
  );
};

export const dailyJobReport = async (req, res) => {
  const { date, companyId, driverId, vehicleId, jobTypeId } = req.query;
  const filterCompanyId = companyId ? Number(companyId) : null;

  const where = { date };
  if (driverId) where.driverId = driverId;
  if (vehicleId) where.vehicleId = vehicleId;
  if (jobTypeId) where.jobTypeId = jobTypeId;

  const entries = await EodEntry.findAll({
    where,
    include: [
      { model: Company, as: 'company', attributes: ['id', 'companyName'] },
      { model: JobType, as: 'jobType', attributes: ['id', 'name'] },
      { model: Vehicle, as: 'vehicle', attributes: ['id', 'vehicleNumber'] },
      { model: Driver, as: 'driver', attributes: ['id', 'name'] },
      { model: Site, as: 'fromSite', attributes: ['id', 'siteName', 'companyId'] },
      { model: Site, as: 'toSite', attributes: ['id', 'siteName', 'companyId'] },
      {
        model: JobAssignment,
        as: 'assignment',
        attributes: [
          'id',
          'companyId',
          'status',
          'fromSiteTemp',
          'toSiteTemp',
          'outsideDriverName',
          'outsideDriverVehicle',
        ],
      },
    ],
    order: [['id', 'ASC']],
  });

  const filtered = filterCompanyId
    ? entries.filter((e) => effectiveEodCompanyId(e.get({ plain: true })) === filterCompanyId)
    : entries;

  const rows = filtered.map((entry) => {
    const plain = entry.get({ plain: true });
    const linkedCompanyId = effectiveEodCompanyId(plain);
    const companyName =
      plain.company?.companyName || (linkedCompanyId ? `Company #${linkedCompanyId}` : '—');
    const plannedTrips = plain.plannedTrips ?? 0;
    const actualTrips = plain.actualTrips ?? 0;

    return {
      id: plain.id,
      assignmentDate: plain.date,
      companyId: linkedCompanyId,
      companyName,
      jobType: plain.jobType?.name || '—',
      vehicle:
        plain.vehicle?.vehicleNumber || plain.assignment?.outsideDriverVehicle || '—',
      driver: plain.driver?.name || plain.assignment?.outsideDriverName || '—',
      route: `${siteLabel(plain.fromSite, plain.assignment?.fromSiteTemp)} → ${siteLabel(plain.toSite, plain.assignment?.toSiteTemp)}`,
      plannedTrips,
      actualTrips,
      billingAmount: Number(num(plain.totalAmount).toFixed(2)),
      status: plain.approvedBy ? 'approved' : 'pending',
    };
  });

  const summary = {
    totalJobs: rows.length,
    totalPlannedTrips: rows.reduce((s, r) => s + num(r.plannedTrips), 0),
    totalActualTrips: rows.reduce((s, r) => s + num(r.actualTrips), 0),
    totalBilling: Number(rows.reduce((s, r) => s + num(r.billingAmount), 0).toFixed(2)),
  };

  res.json({ success: true, data: rows, summary });
};

export const vehicleReport = async (req, res) => {
  const { from, to } = req.query;

  const vehicles = await Vehicle.findAll({
    attributes: ['id', 'vehicleNumber', 'vehicleType', 'status'],
    order: [['vehicleNumber', 'ASC']],
  });

  const eodRows = await EodEntry.findAll({
    attributes: ['vehicleId', 'actualTrips', 'totalAmount'],
    where: {
      date: { [Op.between]: [from, to] },
      vehicleId: { [Op.ne]: null },
    },
  });

  const expenseRows = await DailyExpense.findAll({
    attributes: ['vehicleId', 'amount'],
    where: { expenseDate: { [Op.between]: [from, to] } },
  });

  const eodJobCounts = groupCountInstances(eodRows, 'vehicleId');
  const eodTripSums = groupSumInstances(eodRows, 'vehicleId', 'actualTrips');
  const eodRevenueSums = groupSumInstances(eodRows, 'vehicleId', 'totalAmount');
  const expSums = groupSumInstances(expenseRows, 'vehicleId', 'amount');

  const rows = vehicles.map((v) => {
    const revenue = num(eodRevenueSums[v.id]);
    const expenses = num(expSums[v.id]);
    return {
      vehicleId: v.id,
      vehicleNumber: v.vehicleNumber,
      vehicleType: v.vehicleType,
      status: v.status,
      totalJobs: num(eodJobCounts[v.id]),
      totalTrips: num(eodTripSums[v.id]),
      revenue: Number(revenue.toFixed(2)),
      expenses: Number(expenses.toFixed(2)),
      netEarning: Number((revenue - expenses).toFixed(2)),
    };
  });

  const filtered = rows.filter((r) => r.totalJobs > 0 || r.expenses > 0);

  const summary = {
    totalJobs: filtered.reduce((s, r) => s + r.totalJobs, 0),
    totalTrips: filtered.reduce((s, r) => s + r.totalTrips, 0),
    totalRevenue: Number(filtered.reduce((s, r) => s + r.revenue, 0).toFixed(2)),
    totalExpenses: Number(filtered.reduce((s, r) => s + r.expenses, 0).toFixed(2)),
    totalNet: Number(filtered.reduce((s, r) => s + r.netEarning, 0).toFixed(2)),
  };

  res.json({ success: true, data: filtered, summary });
};

export const driverReport = async (req, res) => {
  const { from, to, driverId } = req.query;
  const driverWhere = {};
  if (driverId) driverWhere.id = driverId;

  const drivers = await Driver.findAll({
    where: driverWhere,
    attributes: ['id', 'name', 'mobile', 'driverType', 'status'],
    order: [['name', 'ASC']],
  });

  const assignmentRows = await JobAssignment.findAll({
    attributes: ['driverId', 'assignmentDate', 'outsideDriverName', 'driverCost'],
    where: {
      assignmentDate: { [Op.between]: [from, to] },
      driverId: { [Op.ne]: null },
      status: { [Op.ne]: 'cancelled' },
    },
  });

  const assignMap = aggregateAssignmentsByDriver(assignmentRows);

  const eodRows = await EodEntry.findAll({
    attributes: ['driverId', 'actualTrips'],
    where: {
      date: { [Op.between]: [from, to] },
      driverId: { [Op.ne]: null },
    },
  });

  const eodTripSums = groupSumInstances(eodRows, 'driverId', 'actualTrips');

  const outsideRows =
    driverId
      ? []
      : await JobAssignment.findAll({
          attributes: ['driverId', 'outsideDriverName', 'driverCost'],
          where: {
            assignmentDate: { [Op.between]: [from, to] },
            driverId: null,
            status: { [Op.ne]: 'cancelled' },
          },
        });

  const outsideTotal = sumUnassignedOutsideDriverCost(outsideRows);

  const rows = drivers.map((d) => {
    const a = assignMap[d.id] || {};
    return {
      driverId: d.id,
      name: d.name,
      mobile: d.mobile,
      driverType: d.driverType,
      status: d.status,
      totalJobs: num(a.totalJobs),
      totalTrips: num(eodTripSums[d.id]),
      assignedDays: num(a.assignedDays),
      outsideDriverPayments: Number(num(a.outsidePaymentsOnAssignment).toFixed(2)),
    };
  });

  const activeRows = rows.filter(
    (r) => r.totalJobs > 0 || r.totalTrips > 0 || r.outsideDriverPayments > 0
  );

  if (!driverId && outsideTotal > 0) {
    activeRows.push({
        driverId: null,
        name: 'Outside drivers (unassigned)',
        mobile: '—',
        driverType: 'outside',
        status: '—',
        totalJobs: 0,
        totalTrips: 0,
        assignedDays: 0,
        outsideDriverPayments: Number(outsideTotal.toFixed(2)),
      });
  }

  const summary = {
    totalJobs: activeRows.reduce((s, r) => s + r.totalJobs, 0),
    totalTrips: activeRows.reduce((s, r) => s + r.totalTrips, 0),
    totalOutsidePayments: Number(
      activeRows.reduce((s, r) => s + r.outsideDriverPayments, 0).toFixed(2)
    ),
  };

  res.json({ success: true, data: activeRows, summary });
};

const normalizeBillingPartyName = (value) => (value || '').trim().toLowerCase();

/** Billing party for invoices (master company FK or manual bill-to name). */
const invoiceBillingParty = (invoice) => {
  const plain = invoice.get ? invoice.get({ plain: true }) : invoice;
  if (plain.companyId) {
    return {
      rowKey: `company:${plain.companyId}`,
      companyId: plain.companyId,
      companyName: plain.company?.companyName || plain.billToName || `Company #${plain.companyId}`,
    };
  }
  const billTo = (plain.billToName || '').trim();
  if (billTo) {
    return {
      rowKey: `billTo:${normalizeBillingPartyName(billTo)}`,
      companyId: null,
      companyName: billTo,
    };
  }
  return {
    rowKey: 'unknown',
    companyId: null,
    companyName: 'Unknown customer',
  };
};

const partyMatchesCompanyFilter = (party, filterCompanyId, filterCompanyName) => {
  if (!filterCompanyId) return true;
  const fid = Number(filterCompanyId);
  if (party.companyId === fid) return true;
  const filterName = normalizeBillingPartyName(filterCompanyName);
  const partyName = normalizeBillingPartyName(party.companyName);
  if (!filterName || !partyName) return false;
  return (
    partyName === filterName ||
    partyName.includes(filterName) ||
    filterName.includes(partyName)
  );
};

export const companyBillingReport = async (req, res) => {
  const { from, to, companyId } = req.query;
  const filterCompanyId = companyId ? Number(companyId) : null;

  const companies = await Company.findAll({
    attributes: ['id', 'companyName'],
    order: [['companyName', 'ASC']],
  });

  const filterCompany = filterCompanyId
    ? companies.find((c) => c.id === filterCompanyId)
    : null;

  const jobAgg = await EodEntry.findAll({
    attributes: ['companyId', [fn('COUNT', col('EodEntry.id')), 'totalJobs']],
    where: { date: { [Op.between]: [from, to] } },
    group: ['company_id'],
    raw: true,
  });

  const invoiceRows = await Invoice.findAll({
    attributes: ['id', 'companyId', 'billToName', 'grandTotal'],
    where: {
      invoiceDate: { [Op.between]: [from, to] },
      paymentStatus: { [Op.ne]: 'cancelled' },
    },
    include: [{ model: Company, as: 'company', attributes: ['id', 'companyName'], required: false }],
  });

  const payments = await Payment.findAll({
    attributes: ['amount', 'invoiceId'],
    include: [
      {
        model: Invoice,
        as: 'invoice',
        attributes: ['id', 'companyId', 'billToName', 'grandTotal'],
        where: {
          invoiceDate: { [Op.between]: [from, to] },
          paymentStatus: { [Op.ne]: 'cancelled' },
        },
        include: [{ model: Company, as: 'company', attributes: ['companyName'], required: false }],
        required: true,
      },
    ],
  });

  const partyRows = new Map();

  const ensureParty = (party) => {
    if (!partyRows.has(party.rowKey)) {
      partyRows.set(party.rowKey, {
        companyId: party.companyId,
        companyName: party.companyName,
        totalJobs: 0,
        totalInvoiced: 0,
        totalPaid: 0,
      });
    }
    return partyRows.get(party.rowKey);
  };

  for (const c of companies) {
    ensureParty({
      rowKey: `company:${c.id}`,
      companyId: c.id,
      companyName: c.companyName,
    });
  }

  for (const row of jobAgg) {
    const cid = row.companyId;
    if (cid == null) continue;
    const company = companies.find((c) => c.id === cid);
    const party = ensureParty({
      rowKey: `company:${cid}`,
      companyId: cid,
      companyName: company?.companyName || `Company #${cid}`,
    });
    party.totalJobs = num(row.totalJobs);
  }

  for (const inv of invoiceRows) {
    const party = invoiceBillingParty(inv);
    if (
      !partyMatchesCompanyFilter(
        party,
        filterCompanyId,
        filterCompany?.companyName
      )
    ) {
      continue;
    }
    const row = ensureParty(party);
    row.totalInvoiced += num(inv.getDataValue('grandTotal'));
  }

  for (const p of payments) {
    if (!p.invoice) continue;
    const party = invoiceBillingParty(p.invoice);
    if (
      !partyMatchesCompanyFilter(
        party,
        filterCompanyId,
        filterCompany?.companyName
      )
    ) {
      continue;
    }
    const row = ensureParty(party);
    row.totalPaid += num(p.getDataValue('amount'));
  }

  let rows = Array.from(partyRows.values()).map((r) => ({
    companyId: r.companyId,
    companyName: r.companyName,
    totalJobs: r.totalJobs,
    totalInvoiced: Number(r.totalInvoiced.toFixed(2)),
    totalPaid: Number(r.totalPaid.toFixed(2)),
    outstanding: Number(Math.max(r.totalInvoiced - r.totalPaid, 0).toFixed(2)),
  }));

  if (filterCompanyId) {
    rows = rows.filter((r) =>
      partyMatchesCompanyFilter(
        { companyId: r.companyId, companyName: r.companyName },
        filterCompanyId,
        filterCompany?.companyName
      )
    );
  }

  rows.sort((a, b) => a.companyName.localeCompare(b.companyName));

  const active = rows.filter(
    (r) => r.totalJobs > 0 || r.totalInvoiced > 0 || r.totalPaid > 0
  );

  const summary = {
    totalJobs: active.reduce((s, r) => s + r.totalJobs, 0),
    totalInvoiced: Number(active.reduce((s, r) => s + r.totalInvoiced, 0).toFixed(2)),
    totalPaid: Number(active.reduce((s, r) => s + r.totalPaid, 0).toFixed(2)),
    totalOutstanding: Number(active.reduce((s, r) => s + r.outstanding, 0).toFixed(2)),
  };

  res.json({ success: true, data: active, summary });
};

export const expenseReport = async (req, res) => {
  const { from, to, vehicleId, expenseTypeId } = req.query;
  const where = { expenseDate: { [Op.between]: [from, to] } };
  if (vehicleId) where.vehicleId = vehicleId;
  if (expenseTypeId) where.expenseTypeId = expenseTypeId;

  const expenses = await DailyExpense.findAll({
    where,
    include: [
      { model: Vehicle, as: 'vehicle', attributes: ['id', 'vehicleNumber'] },
      { model: ExpenseType, as: 'expenseType', attributes: ['id', 'name'] },
    ],
    order: [['expenseDate', 'ASC']],
  });

  const byTypeVehicle = new Map();
  const monthly = new Map();

  expenses.forEach((exp) => {
    const plain = exp.get({ plain: true });
    const amount = num(plain.amount);
    const typeName = plain.expenseType?.name || 'Unknown';
    const vehicleNum = plain.vehicle?.vehicleNumber || '—';
    const key = `${typeName}::${vehicleNum}`;
    const cur = byTypeVehicle.get(key) || {
      expenseType: typeName,
      vehicle: vehicleNum,
      vehicleId: plain.vehicleId,
      expenseTypeId: plain.expenseTypeId,
      total: 0,
      count: 0,
    };
    cur.total += amount;
    cur.count += 1;
    byTypeVehicle.set(key, cur);

    const dateStr = String(plain.expenseDate ?? '').slice(0, 10);
    const monthKey = dateStr.length >= 7 ? dateStr.slice(0, 7) : 'unknown';
    monthly.set(monthKey, (monthly.get(monthKey) || 0) + amount);
  });

  const grouped = [...byTypeVehicle.values()].map((g) => ({
    ...g,
    total: Number(g.total.toFixed(2)),
  }));

  const monthlyTotals = [...monthly.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, total: Number(total.toFixed(2)) }));

  const summary = {
    totalExpenses: Number(grouped.reduce((s, g) => s + g.total, 0).toFixed(2)),
    recordCount: expenses.length,
  };

  res.json({ success: true, data: { grouped, monthlyTotals, items: expenses.length }, summary });
};

export const profitReport = async (req, res) => {
  const { from, to } = req.query;

  const [eodRows, expenseRows, outsideRow] = await Promise.all([
    EodEntry.findAll({
      attributes: ['totalAmount'],
      where: { date: { [Op.between]: [from, to] } },
    }),
    DailyExpense.findAll({
      attributes: ['amount'],
      where: { expenseDate: { [Op.between]: [from, to] } },
    }),
    JobAssignment.findAll({
      attributes: ['driverId', 'outsideDriverName', 'driverCost'],
      where: {
        assignmentDate: { [Op.between]: [from, to] },
        status: { [Op.ne]: 'cancelled' },
      },
    }),
  ]);

  const totalRevenue = sumInstances(eodRows, 'totalAmount');
  const totalExpenses = sumInstances(expenseRows, 'amount');
  const outsideDriverCost = sumUnassignedOutsideDriverCost(outsideRow);
  const netProfit = totalRevenue - totalExpenses - outsideDriverCost;

  res.json({
    success: true,
    data: {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalExpenses: Number(totalExpenses.toFixed(2)),
      outsideDriverCost: Number(outsideDriverCost.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
    },
    summary: {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalExpenses: Number(totalExpenses.toFixed(2)),
      outsideDriverCost: Number(outsideDriverCost.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
    },
  });
};

export const salaryReport = async (req, res) => {
  const { month, year, type } = req.query;

  if (type === 'driver') {
    const drivers = await Driver.findAll({
      where: { grossSalary: { [Op.ne]: null }, status: 'available' },
      order: [['name', 'ASC']],
    });
    const withSalary = drivers.filter((d) => num(d.grossSalary) > 0);
    const advances = await DriverAdvance.findAll({
      where: { salaryPeriodMonth: month, salaryPeriodYear: year },
    });
    const byDriver = new Map();
    advances.forEach((a) => {
      const list = byDriver.get(a.driverId) || [];
      list.push(a.get({ plain: true }));
      byDriver.set(a.driverId, list);
    });

    const rows = withSalary.map((driver) => {
      const plain = driver.get({ plain: true });
      const advs = byDriver.get(plain.id) || [];
      const row = buildSalarySummaryRow(
        { id: plain.id, name: plain.name, mobile: plain.mobile, grossSalary: plain.grossSalary },
        advs,
        'driverId'
      );
      return {
        ...row,
        advanceHistory: advs.map((a) => ({
          id: a.id,
          advanceDate: a.advanceDate,
          amount: num(a.amount),
          status: a.status,
          reason: a.reason,
          paymentMode: a.paymentMode,
        })),
      };
    });

    return res.json({ success: true, data: rows, summary: { count: rows.length } });
  }

  const employees = await Employee.findAll({
    where: { grossSalary: { [Op.ne]: null }, status: 'active' },
    order: [['name', 'ASC']],
  });
  const withSalary = employees.filter((e) => num(e.grossSalary) > 0);
  const advances = await EmployeeAdvance.findAll({
    where: { salaryPeriodMonth: month, salaryPeriodYear: year },
  });
  const byEmployee = new Map();
  advances.forEach((a) => {
    const list = byEmployee.get(a.employeeId) || [];
    list.push(a.get({ plain: true }));
    byEmployee.set(a.employeeId, list);
  });

  const rows = withSalary.map((employee) => {
    const plain = employee.get({ plain: true });
    const advs = byEmployee.get(plain.id) || [];
    const row = buildSalarySummaryRow(
      { id: plain.id, name: plain.name, mobile: plain.mobile, grossSalary: plain.grossSalary },
      advs,
      'employeeId'
    );
    return {
      ...row,
      employeeType: plain.employeeType,
      advanceHistory: advs.map((a) => ({
        id: a.id,
        advanceDate: a.advanceDate,
        amount: num(a.amount),
        status: a.status,
        reason: a.reason,
        paymentMode: a.paymentMode,
      })),
    };
  });

  res.json({ success: true, data: rows, summary: { count: rows.length } });
};
