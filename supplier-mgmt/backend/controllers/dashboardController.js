import { Op, fn, col } from 'sequelize';
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

const todayDate = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10);
};

const siteLabel = (site, temp) => site?.siteName || temp || '—';

const driverLabel = (assignment) =>
  assignment.driver?.name ||
  assignment.outsideDriverName ||
  '—';

const vehicleLabel = (assignment) =>
  assignment.vehicle?.vehicleNumber ||
  assignment.outsideDriverVehicle ||
  '—';

export const getSummary = async (_req, res) => {
  const today = todayDate();

  const eodToday = await EodEntry.findAll({
    attributes: ['assignmentId'],
    where: { date: today },
    raw: true,
  });
  const eodAssignmentIds = eodToday.map((e) => e.assignmentId);

  const [
    todayJobsTotal,
    todayJobsCompleted,
    todayTripsResult,
    todayRevenueResult,
    todayExpensesResult,
    vehiclesAvailable,
    vehiclesAssignedToday,
    pendingInvoicesCount,
    todayAssignments,
    pendingEodAssignments,
    pendingInvoices,
  ] = await Promise.all([
    JobAssignment.count({
      where: { assignmentDate: today, status: { [Op.ne]: 'cancelled' } },
    }),
    JobAssignment.count({
      where: { assignmentDate: today, status: 'completed' },
    }),
    EodEntry.findOne({
      attributes: [[fn('COALESCE', fn('SUM', col('actual_trips')), 0), 'total']],
      where: { date: today },
      raw: true,
    }),
    EodEntry.findOne({
      attributes: [[fn('COALESCE', fn('SUM', col('total_amount')), 0), 'total']],
      where: { date: today },
      raw: true,
    }),
    DailyExpense.findOne({
      attributes: [[fn('COALESCE', fn('SUM', col('amount')), 0), 'total']],
      where: { expenseDate: today },
      raw: true,
    }),
    Vehicle.count({ where: { status: 'available' } }),
    JobAssignment.count({
      distinct: true,
      col: 'vehicle_id',
      where: {
        assignmentDate: today,
        vehicleId: { [Op.ne]: null },
        status: { [Op.in]: ['assigned', 'in_progress', 'completed'] },
      },
    }),
    Invoice.count({
      where: {
        paymentStatus: { [Op.in]: ['draft', 'generated', 'sent', 'partially_paid'] },
      },
    }),
    JobAssignment.findAll({
      where: { assignmentDate: today, status: { [Op.ne]: 'cancelled' } },
      include: [
        { model: Company, as: 'company', attributes: ['companyName'] },
        { model: JobType, as: 'jobType', attributes: ['name'] },
        { model: Vehicle, as: 'vehicle', attributes: ['vehicleNumber'] },
        { model: Driver, as: 'driver', attributes: ['name'] },
        { model: Site, as: 'fromSite', attributes: ['siteName'] },
        { model: Site, as: 'toSite', attributes: ['siteName'] },
      ],
      order: [['id', 'DESC']],
      limit: 20,
    }),
    JobAssignment.findAll({
      where: {
        assignmentDate: today,
        status: { [Op.in]: ['assigned', 'in_progress', 'completed'] },
        ...(eodAssignmentIds.length > 0 && { id: { [Op.notIn]: eodAssignmentIds } }),
      },
      include: [
        { model: Company, as: 'company', attributes: ['companyName'] },
        { model: JobType, as: 'jobType', attributes: ['name'] },
        { model: Vehicle, as: 'vehicle', attributes: ['vehicleNumber'] },
        { model: Driver, as: 'driver', attributes: ['name'] },
      ],
      order: [['id', 'ASC']],
      limit: 15,
    }),
    Invoice.findAll({
      where: {
        paymentStatus: { [Op.in]: ['draft', 'generated', 'sent', 'partially_paid'] },
      },
      include: [{ model: Company, as: 'company', attributes: ['companyName'] }],
      order: [['invoiceDate', 'DESC']],
      limit: 15,
    }),
  ]);

  const pendingEodCount = pendingEodAssignments.length;

  const pendingInvoiceIds = pendingInvoices.map((i) => i.id);
  const paidByInvoice =
    pendingInvoiceIds.length > 0
      ? await Payment.findAll({
          attributes: [
            'invoiceId',
            [fn('COALESCE', fn('SUM', col('amount')), 0), 'paid'],
          ],
          where: {
            invoiceId: { [Op.in]: pendingInvoiceIds },
          },
          group: ['invoice_id'],
          raw: true,
        })
      : [];

  const paidMap = Object.fromEntries(
    paidByInvoice.map((p) => [p.invoiceId, Number(p.paid)])
  );

  const outstandingAmount = pendingInvoices.reduce((sum, inv) => {
    const paid = Number(paidMap[inv.id] ?? 0);
    return sum + Math.max(Number(inv.grandTotal) - paid, 0);
  }, 0);

  res.json({
    success: true,
    data: {
      todayJobsTotal,
      todayJobsCompleted,
      pendingEodCount,
      todayTripsTotal: Number(todayTripsResult?.total ?? 0),
      todayRevenue: Number(todayRevenueResult?.total ?? 0),
      todayExpenses: Number(todayExpensesResult?.total ?? 0),
      vehiclesAssignedToday,
      vehiclesAvailable,
      pendingInvoicesCount,
      outstandingAmount,
      todayAssignments: todayAssignments.map((a) => ({
        id: a.id,
        driver: driverLabel(a),
        vehicle: vehicleLabel(a),
        company: a.company?.companyName ?? '—',
        jobType: a.jobType?.name ?? '—',
        fromSite: siteLabel(a.fromSite, a.fromSiteTemp),
        toSite: siteLabel(a.toSite, a.toSiteTemp),
        status: a.status,
      })),
      pendingEodList: pendingEodAssignments.map((a) => ({
        id: a.id,
        assignmentId: a.id,
        date: a.assignmentDate,
        driver: driverLabel(a),
        vehicle: vehicleLabel(a),
        company: a.company?.companyName ?? '—',
        jobType: a.jobType?.name ?? '—',
      })),
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
