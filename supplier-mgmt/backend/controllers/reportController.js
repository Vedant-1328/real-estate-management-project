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

const num = (v) => Number(v ?? 0);

const siteLabel = (site, temp) => site?.siteName || temp || '—';

export const dailyJobReport = async (req, res) => {
  const { date, companyId, driverId, vehicleId, jobTypeId } = req.query;
  const where = { assignmentDate: date, status: { [Op.ne]: 'cancelled' } };
  if (companyId) where.companyId = companyId;
  if (driverId) where.driverId = driverId;
  if (vehicleId) where.vehicleId = vehicleId;
  if (jobTypeId) where.jobTypeId = jobTypeId;

  const assignments = await JobAssignment.findAll({
    where,
    include: [
      { model: Company, as: 'company', attributes: ['id', 'companyName'] },
      { model: JobType, as: 'jobType', attributes: ['id', 'name'] },
      { model: Vehicle, as: 'vehicle', attributes: ['id', 'vehicleNumber'] },
      { model: Driver, as: 'driver', attributes: ['id', 'name'] },
      { model: Site, as: 'fromSite', attributes: ['siteName'] },
      { model: Site, as: 'toSite', attributes: ['siteName'] },
      { model: EodEntry, as: 'eodEntries', required: false },
    ],
    order: [['id', 'ASC']],
  });

  const rows = assignments.map((a) => {
    const plain = a.get({ plain: true });
    const eod = plain.eodEntries?.find((e) => e.date === date) || plain.eodEntries?.[0];
    const plannedTrips = eod?.plannedTrips ?? plain.expectedTrips ?? 0;
    const actualTrips = eod?.actualTrips ?? 0;
    const billingAmount = eod
      ? num(eod.totalAmount)
      : num(plain.companyRate) * num(plain.expectedTrips);

    return {
      id: plain.id,
      assignmentDate: plain.assignmentDate,
      companyId: plain.companyId,
      companyName: plain.company?.companyName,
      jobType: plain.jobType?.name,
      vehicle: plain.vehicle?.vehicleNumber || plain.outsideDriverVehicle || '—',
      driver: plain.driver?.name || plain.outsideDriverName || '—',
      route: `${siteLabel(plain.fromSite, plain.fromSiteTemp)} → ${siteLabel(plain.toSite, plain.toSiteTemp)}`,
      plannedTrips,
      actualTrips,
      billingAmount: Number(billingAmount.toFixed(2)),
      status: plain.status,
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

  const eodAgg = await EodEntry.findAll({
    attributes: [
      'vehicleId',
      [fn('COUNT', col('EodEntry.id')), 'totalJobs'],
      [fn('COALESCE', fn('SUM', col('actual_trips')), 0), 'totalTrips'],
      [fn('COALESCE', fn('SUM', col('total_amount')), 0), 'revenue'],
    ],
    where: {
      date: { [Op.between]: [from, to] },
      vehicleId: { [Op.ne]: null },
    },
    group: ['vehicle_id'],
    raw: true,
  });

  const expenseAgg = await DailyExpense.findAll({
    attributes: [
      'vehicleId',
      [fn('COALESCE', fn('SUM', col('amount')), 0), 'expenses'],
    ],
    where: {
      expenseDate: { [Op.between]: [from, to] },
    },
    group: ['vehicle_id'],
    raw: true,
  });

  const eodMap = Object.fromEntries(eodAgg.map((r) => [r.vehicleId, r]));
  const expMap = Object.fromEntries(expenseAgg.map((r) => [r.vehicleId, r]));

  const rows = vehicles.map((v) => {
    const e = eodMap[v.id] || {};
    const x = expMap[v.id] || {};
    const revenue = num(e.revenue);
    const expenses = num(x.expenses);
    return {
      vehicleId: v.id,
      vehicleNumber: v.vehicleNumber,
      vehicleType: v.vehicleType,
      status: v.status,
      totalJobs: num(e.totalJobs),
      totalTrips: num(e.totalTrips),
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

  const assignmentAgg = await JobAssignment.findAll({
    attributes: [
      'driverId',
      [fn('COUNT', col('JobAssignment.id')), 'totalJobs'],
      [fn('COUNT', fn('DISTINCT', col('assignment_date'))), 'assignedDays'],
      [
        fn(
          'COALESCE',
          fn(
            'SUM',
            literal('CASE WHEN outside_driver_name IS NOT NULL THEN driver_cost ELSE 0 END')
          ),
          0
        ),
        'outsidePaymentsOnAssignment',
      ],
    ],
    where: {
      assignmentDate: { [Op.between]: [from, to] },
      driverId: { [Op.ne]: null },
      status: { [Op.ne]: 'cancelled' },
    },
    group: ['driver_id'],
    raw: true,
  });

  const eodAgg = await EodEntry.findAll({
    attributes: [
      'driverId',
      [fn('COALESCE', fn('SUM', col('actual_trips')), 0), 'totalTrips'],
    ],
    where: {
      date: { [Op.between]: [from, to] },
      driverId: { [Op.ne]: null },
    },
    group: ['driver_id'],
    raw: true,
  });

  const outsideAgg = await JobAssignment.findAll({
    attributes: [[fn('COALESCE', fn('SUM', col('driver_cost')), 0), 'outsideDriverPayments']],
    where: {
      assignmentDate: { [Op.between]: [from, to] },
      driverId: null,
      outsideDriverName: { [Op.ne]: null },
      ...(driverId && { id: -1 }),
    },
    raw: true,
  });

  const assignMap = Object.fromEntries(assignmentAgg.map((r) => [r.driverId, r]));
  const eodMap = Object.fromEntries(eodAgg.map((r) => [r.driverId, r]));

  const rows = drivers.map((d) => {
    const a = assignMap[d.id] || {};
    const e = eodMap[d.id] || {};
    return {
      driverId: d.id,
      name: d.name,
      mobile: d.mobile,
      driverType: d.driverType,
      status: d.status,
      totalJobs: num(a.totalJobs),
      totalTrips: num(e.totalTrips),
      assignedDays: num(a.assignedDays),
      outsideDriverPayments: Number(num(a.outsidePaymentsOnAssignment).toFixed(2)),
    };
  });

  const activeRows = rows.filter(
    (r) => r.totalJobs > 0 || r.totalTrips > 0 || r.outsideDriverPayments > 0
  );

  if (!driverId && outsideAgg[0]) {
    const outsideTotal = num(outsideAgg[0].outsideDriverPayments);
    if (outsideTotal > 0) {
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

export const companyBillingReport = async (req, res) => {
  const { from, to, companyId } = req.query;
  const companyWhere = {};
  if (companyId) companyWhere.id = companyId;

  const companies = await Company.findAll({
    where: companyWhere,
    attributes: ['id', 'companyName'],
    order: [['companyName', 'ASC']],
  });

  const jobAgg = await JobAssignment.findAll({
    attributes: ['companyId', [fn('COUNT', col('id')), 'totalJobs']],
    where: {
      assignmentDate: { [Op.between]: [from, to] },
      status: { [Op.ne]: 'cancelled' },
    },
    group: ['company_id'],
    raw: true,
  });

  const invoiceAgg = await Invoice.findAll({
    attributes: [
      'companyId',
      [fn('COALESCE', fn('SUM', col('grand_total')), 0), 'totalInvoiced'],
    ],
    where: {
      invoiceDate: { [Op.between]: [from, to] },
      paymentStatus: { [Op.ne]: 'cancelled' },
    },
    group: ['company_id'],
    raw: true,
  });

  const payments = await Payment.findAll({
    attributes: ['amount', 'invoiceId'],
    include: [
      {
        model: Invoice,
        as: 'invoice',
        attributes: ['companyId', 'grandTotal'],
        where: {
          invoiceDate: { [Op.between]: [from, to] },
          paymentStatus: { [Op.ne]: 'cancelled' },
        },
        required: true,
      },
    ],
  });

  const paidByCompany = {};
  payments.forEach((p) => {
    const cid = p.invoice?.companyId;
    if (!cid) return;
    paidByCompany[cid] = (paidByCompany[cid] || 0) + num(p.amount);
  });

  const jobMap = Object.fromEntries(jobAgg.map((r) => [r.companyId, r]));
  const invMap = Object.fromEntries(invoiceAgg.map((r) => [r.companyId, r]));

  const rows = companies.map((c) => {
    const totalInvoiced = num(invMap[c.id]?.totalInvoiced);
    const totalPaid = num(paidByCompany[c.id]);
    return {
      companyId: c.id,
      companyName: c.companyName,
      totalJobs: num(jobMap[c.id]?.totalJobs),
      totalInvoiced: Number(totalInvoiced.toFixed(2)),
      totalPaid: Number(totalPaid.toFixed(2)),
      outstanding: Number(Math.max(totalInvoiced - totalPaid, 0).toFixed(2)),
    };
  });

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

    const monthKey = plain.expenseDate.slice(0, 7);
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

  const [revenueRow, expenseRow, outsideRow] = await Promise.all([
    EodEntry.findOne({
      attributes: [[fn('COALESCE', fn('SUM', col('total_amount')), 0), 'total']],
      where: { date: { [Op.between]: [from, to] } },
      raw: true,
    }),
    DailyExpense.findOne({
      attributes: [[fn('COALESCE', fn('SUM', col('amount')), 0), 'total']],
      where: { expenseDate: { [Op.between]: [from, to] } },
      raw: true,
    }),
    JobAssignment.findOne({
      attributes: [[fn('COALESCE', fn('SUM', col('driver_cost')), 0), 'total']],
      where: {
        assignmentDate: { [Op.between]: [from, to] },
        outsideDriverName: { [Op.ne]: null },
        status: { [Op.ne]: 'cancelled' },
      },
      raw: true,
    }),
  ]);

  const totalRevenue = num(revenueRow?.total);
  const totalExpenses = num(expenseRow?.total);
  const outsideDriverCost = num(outsideRow?.total);
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
