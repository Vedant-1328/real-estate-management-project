import { Op } from 'sequelize';
import {
  Company,
  DailyExpense,
  Driver,
  EodEntry,
  Invoice,
  JobAssignment,
  JobType,
  Payment,
  Site,
  Vehicle,
} from '../models/index.js';
import { groupSumInstances, sumInstances } from '../utils/encryptedAggregates.js';
import { todayDate } from '../utils/dateOnly.js';

const siteLabel = (site, temp) => site?.siteName || temp || '—';

const driverLabel = (entry) =>
  entry.driver?.name ||
  entry.assignment?.outsideDriverName ||
  '—';

const vehicleLabel = (entry) =>
  entry.vehicle?.vehicleNumber ||
  entry.assignment?.outsideDriverVehicle ||
  '—';

const eodIncludes = [
  { model: Company, as: 'company', attributes: ['companyName'] },
  { model: JobType, as: 'jobType', attributes: ['name'] },
  { model: Vehicle, as: 'vehicle', attributes: ['vehicleNumber'] },
  { model: Driver, as: 'driver', attributes: ['name'] },
  { model: Site, as: 'fromSite', attributes: ['siteName'] },
  { model: Site, as: 'toSite', attributes: ['siteName'] },
  {
    model: JobAssignment,
    as: 'assignment',
    attributes: ['fromSiteTemp', 'toSiteTemp', 'outsideDriverName', 'outsideDriverVehicle'],
  },
];

export const getSummary = async (_req, res) => {
  const today = todayDate();

  const [
    todayEodEntries,
    todayEodRows,
    todayExpenseRows,
    vehiclesAvailable,
    pendingInvoicesCount,
    pendingInvoices,
    driversAvailableRows,
  ] = await Promise.all([
    EodEntry.findAll({
      where: { date: today },
      include: eodIncludes,
      order: [['id', 'DESC']],
      limit: 20,
    }),
    EodEntry.findAll({
      attributes: ['actualTrips', 'totalAmount'],
      where: { date: today },
    }),
    DailyExpense.findAll({
      attributes: ['amount'],
      where: { expenseDate: today },
    }),
    Vehicle.count({ where: { status: 'available' } }),
    Invoice.count({
      where: {
        paymentStatus: { [Op.in]: ['draft', 'generated', 'sent', 'partially_paid'] },
      },
    }),
    Invoice.findAll({
      where: {
        paymentStatus: { [Op.in]: ['draft', 'generated', 'sent', 'partially_paid'] },
      },
      include: [{ model: Company, as: 'company', attributes: ['companyName'] }],
      order: [['invoiceDate', 'DESC']],
      limit: 15,
    }),
    Driver.findAll({
      where: { status: 'available', driverType: 'own' },
      attributes: ['id', 'name', 'mobile', 'licenseNumber'],
      include: [
        {
          model: Vehicle,
          as: 'defaultVehicle',
          attributes: ['vehicleNumber'],
        },
      ],
      order: [['name', 'ASC']],
      limit: 100,
    }),
  ]);

  const driversAvailable = driversAvailableRows.length;

  const todayJobsTotal = todayEodRows.length;
  const todayJobsApproved = await EodEntry.count({
    where: { date: today, approvedBy: { [Op.ne]: null } },
  });

  // "Vehicles on job" = distinct fleet vehicles working today PLUS the count
  // of outside-driver EODs (each outside driver brings their own truck and
  // is its own unit of work, so we don't want them invisible on the dash).
  const [fleetVehiclesAssigned, outsideEodCount] = await Promise.all([
    EodEntry.count({
      distinct: true,
      col: 'vehicle_id',
      where: { date: today, vehicleId: { [Op.ne]: null } },
    }),
    EodEntry.count({
      where: { date: today, vehicleId: null },
      include: [
        {
          model: JobAssignment,
          as: 'assignment',
          attributes: [],
          where: { outsideDriverName: { [Op.ne]: null } },
          required: true,
        },
      ],
    }),
  ]);
  const vehiclesAssignedToday = fleetVehiclesAssigned + outsideEodCount;

  const pendingInvoiceIds = pendingInvoices.map((i) => i.id);
  const paymentRows =
    pendingInvoiceIds.length > 0
      ? await Payment.findAll({
          attributes: ['invoiceId', 'amount'],
          where: { invoiceId: { [Op.in]: pendingInvoiceIds } },
        })
      : [];

  const paidMap = groupSumInstances(paymentRows, 'invoiceId', 'amount');

  const outstandingAmount = pendingInvoices.reduce((sum, inv) => {
    const paid = Number(paidMap[inv.id] ?? 0);
    return sum + Math.max(Number(inv.grandTotal) - paid, 0);
  }, 0);

  res.json({
    success: true,
    data: {
      todayJobsTotal,
      todayJobsCompleted: todayJobsApproved,
      todayTripsTotal: sumInstances(todayEodRows, 'actualTrips'),
      todayRevenue: Number(sumInstances(todayEodRows, 'totalAmount').toFixed(2)),
      todayExpenses: Number(sumInstances(todayExpenseRows, 'amount').toFixed(2)),
      vehiclesAssignedToday,
      vehiclesAvailable,
      driversAvailable,
      pendingInvoicesCount,
      outstandingAmount,
      todayEodEntries: todayEodEntries.map((e) => {
        const plain = e.get({ plain: true });
        return {
          id: plain.id,
          driver: driverLabel(plain),
          vehicle: vehicleLabel(plain),
          company: plain.company?.companyName ?? '—',
          jobType: plain.jobType?.name ?? '—',
          fromSite: siteLabel(plain.fromSite, plain.assignment?.fromSiteTemp),
          toSite: siteLabel(plain.toSite, plain.assignment?.toSiteTemp),
          actualTrips: plain.actualTrips != null ? Number(plain.actualTrips) : 0,
          totalAmount: plain.totalAmount != null ? Number(plain.totalAmount) : 0,
          billingStatus: plain.billingStatus,
          approved: Boolean(plain.approvedBy),
        };
      }),
      driversAvailableList: driversAvailableRows.map((d) => {
        const plain = d.get({ plain: true });
        return {
          id: plain.id,
          name: plain.name,
          mobile: plain.mobile || null,
          licenseNumber: plain.licenseNumber || null,
          vehicle: plain.defaultVehicle?.vehicleNumber || null,
        };
      }),
      pendingInvoicesList: pendingInvoices.map((inv) => ({
        id: inv.id,
        company: inv.company?.companyName ?? '—',
        billingAmount: Number(inv.grandTotal),
        amountPaid: Number(paidMap[inv.id] ?? 0),
        status: inv.paymentStatus,
      })),
    },
  });
};
