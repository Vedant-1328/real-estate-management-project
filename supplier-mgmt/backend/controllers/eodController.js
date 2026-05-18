import { Op } from 'sequelize';
import {
  Company,
  Driver,
  EodEntry,
  JobAssignment,
  JobType,
  Site,
  User,
  Vehicle,
} from '../models/index.js';
import { calculateEodTotal } from '../utils/eodCalculations.js';
import { hasPermission } from '../utils/permissions.js';

const todayDate = () => new Date().toISOString().slice(0, 10);

const assignmentIncludes = [
  { model: Company, as: 'company', attributes: ['id', 'companyName'] },
  { model: JobType, as: 'jobType', attributes: ['id', 'name'] },
  { model: Vehicle, as: 'vehicle', attributes: ['id', 'vehicleNumber', 'vehicleType'] },
  { model: Driver, as: 'driver', attributes: ['id', 'name', 'mobile'] },
  { model: Site, as: 'fromSite', attributes: ['id', 'siteName', 'companyId'] },
  { model: Site, as: 'toSite', attributes: ['id', 'siteName', 'companyId'] },
];

const eodIncludes = [
  ...assignmentIncludes.map((inc) => ({ ...inc })),
  {
    model: JobAssignment,
    as: 'assignment',
    attributes: [
      'id',
      'assignmentDate',
      'expectedTrips',
      'companyRate',
      'dieselFuel',
      'fromSiteTemp',
      'toSiteTemp',
    ],
  },
  { model: User, as: 'approver', attributes: ['id', 'name'] },
];

const routeLabel = (fromSite, toSite, fromTemp, toTemp) => {
  const from = fromSite?.siteName || fromTemp || '—';
  const to = toSite?.siteName || toTemp || '—';
  return `${from} → ${to}`;
};

const formatAssignmentPending = (assignment) => {
  const plain = assignment.get ? assignment.get({ plain: true }) : assignment;
  plain.routeLabel = routeLabel(
    plain.fromSite,
    plain.toSite,
    plain.fromSiteTemp,
    plain.toSiteTemp
  );
  plain.driverLabel =
    plain.driver?.name || plain.outsideDriverName || '—';
  plain.vehicleLabel =
    plain.vehicle?.vehicleNumber || plain.outsideDriverVehicle || '—';
  plain.plannedTrips = plain.expectedTrips;
  return plain;
};

const formatEod = (entry) => {
  const plain = entry.get ? entry.get({ plain: true }) : { ...entry };
  ['ratePerTrip', 'totalAmount', 'extraCharges', 'deductions', 'dieselFuel', 'expense'].forEach(
    (f) => {
      if (plain[f] != null) plain[f] = Number(plain[f]);
    }
  );

  const assignment = plain.assignment || {};
  plain.routeLabel = routeLabel(
    plain.fromSite,
    plain.toSite,
    assignment.fromSiteTemp,
    assignment.toSiteTemp
  );
  plain.driverLabel =
    plain.driver?.name || assignment.outsideDriverName || '—';
  plain.vehicleLabel =
    plain.vehicle?.vehicleNumber || assignment.outsideDriverVehicle || '—';
  plain.isApproved = Boolean(plain.approvedBy);
  plain.approverName = plain.approver?.name || null;

  return plain;
};

const buildEodFromAssignment = (assignment) => {
  const plain = assignment.get ? assignment.get({ plain: true }) : assignment;
  return {
    assignmentId: plain.id,
    date: plain.assignmentDate,
    companyId:
      plain.companyId ?? plain.fromSite?.companyId ?? plain.toSite?.companyId ?? null,
    vehicleId: plain.vehicleId,
    driverId: plain.driverId,
    jobTypeId: plain.jobTypeId,
    fromSiteId: plain.fromSiteId,
    toSiteId: plain.toSiteId,
    plannedTrips: plain.expectedTrips,
    ratePerTrip: null,
  };
};

export const listPending = async (_req, res) => {
  const today = todayDate();

  const existing = await EodEntry.findAll({
    attributes: ['assignmentId'],
    where: { date: today },
    raw: true,
  });
  const existingIds = existing.map((e) => e.assignmentId);

  const where = {
    assignmentDate: today,
    status: { [Op.notIn]: ['cancelled'] },
  };
  if (existingIds.length) {
    where.id = { [Op.notIn]: existingIds };
  }

  const assignments = await JobAssignment.findAll({
    where,
    include: assignmentIncludes,
    order: [['id', 'ASC']],
  });

  res.json({
    success: true,
    data: assignments.map(formatAssignmentPending),
  });
};

export const listEodEntries = async (req, res) => {
  const { from, to, companyId, driverId, vehicleId, billingStatus } = req.query;
  const where = {};

  if (from && to) {
    where.date = { [Op.between]: [from, to] };
  } else if (from) {
    where.date = { [Op.gte]: from };
  } else if (to) {
    where.date = { [Op.lte]: to };
  }

  if (companyId) where.companyId = companyId;
  if (driverId) where.driverId = driverId;
  if (vehicleId) where.vehicleId = vehicleId;
  if (billingStatus && billingStatus !== 'all') where.billingStatus = billingStatus;

  const entries = await EodEntry.findAll({
    where,
    include: eodIncludes,
    order: [
      ['date', 'DESC'],
      ['id', 'DESC'],
    ],
  });

  res.json({
    success: true,
    data: entries.map(formatEod),
  });
};

export const getEodEntry = async (req, res) => {
  const entry = await EodEntry.findByPk(req.params.id, { include: eodIncludes });
  if (!entry) {
    return res.status(404).json({ success: false, message: 'EOD entry not found' });
  }
  res.json({ success: true, data: formatEod(entry) });
};

export const createEodEntry = async (req, res) => {
  const assignment = await JobAssignment.findByPk(req.body.assignmentId, {
    include: assignmentIncludes,
  });
  if (!assignment) {
    return res.status(404).json({ success: false, message: 'Assignment not found' });
  }

  const existing = await EodEntry.findOne({
    where: { assignmentId: assignment.id },
  });
  if (existing) {
    return res.status(400).json({
      success: false,
      message: 'EOD entry already exists for this assignment',
    });
  }

  const base = buildEodFromAssignment(assignment);
  const extraCharges = req.body.extraCharges ?? 0;
  const deductions = req.body.deductions ?? 0;
  const actualTrips = req.body.actualTrips;
  const ratePerTrip =
    req.body.ratePerTrip != null && req.body.ratePerTrip !== ''
      ? Number(req.body.ratePerTrip)
      : null;

  const totalAmount = calculateEodTotal({
    actualTrips,
    ratePerTrip: ratePerTrip ?? 0,
    extraCharges,
    deductions,
  });

  const dieselFuel =
    req.body.dieselFuel != null && req.body.dieselFuel !== ''
      ? req.body.dieselFuel
      : base.dieselFuel ?? null;

  const expense =
    req.body.expense != null && req.body.expense !== '' ? req.body.expense : null;

  const payload = {
    ...base,
    ratePerTrip,
    actualTrips,
    extraCharges,
    deductions,
    dieselFuel,
    expense,
    totalAmount,
    remarks: req.body.remarks || null,
    startTime: req.body.startTime || null,
    endTime: req.body.endTime || null,
    billingStatus: 'pending',
  };

  if (req.body.approved && hasPermission(req.user, 'eod_entries', 'approve')) {
    payload.approvedBy = req.user.id;
    payload.approvalDate = new Date();
  }

  const entry = await EodEntry.create(payload);
  const full = await EodEntry.findByPk(entry.id, { include: eodIncludes });

  res.status(201).json({ success: true, data: formatEod(full) });
};

export const updateEodEntry = async (req, res) => {
  const entry = await EodEntry.findByPk(req.params.id);
  if (!entry) {
    return res.status(404).json({ success: false, message: 'EOD entry not found' });
  }

  if (entry.billingStatus === 'invoiced' && !hasPermission(req.user, 'eod_entries', 'approve')) {
    return res.status(403).json({
      success: false,
      message: 'Invoiced entries can only be edited by users with approve permission',
    });
  }

  if (req.body.actualTrips !== undefined) entry.actualTrips = req.body.actualTrips;
  if (req.body.extraCharges !== undefined) entry.extraCharges = req.body.extraCharges ?? 0;
  if (req.body.deductions !== undefined) entry.deductions = req.body.deductions ?? 0;
  if (req.body.remarks !== undefined) entry.remarks = req.body.remarks || null;
  if (req.body.startTime !== undefined) entry.startTime = req.body.startTime || null;
  if (req.body.endTime !== undefined) entry.endTime = req.body.endTime || null;
  if (req.body.dieselFuel !== undefined) {
    entry.dieselFuel =
      req.body.dieselFuel != null && req.body.dieselFuel !== '' ? req.body.dieselFuel : null;
  }
  if (req.body.expense !== undefined) {
    entry.expense =
      req.body.expense != null && req.body.expense !== '' ? req.body.expense : null;
  }

  entry.totalAmount = calculateEodTotal({
    actualTrips: entry.actualTrips,
    ratePerTrip: entry.ratePerTrip,
    extraCharges: entry.extraCharges,
    deductions: entry.deductions,
  });

  if (req.body.approved === true && hasPermission(req.user, 'eod_entries', 'approve')) {
    entry.approvedBy = req.user.id;
    entry.approvalDate = new Date();
  } else if (req.body.approved === false) {
    entry.approvedBy = null;
    entry.approvalDate = null;
  }

  await entry.save();

  const full = await EodEntry.findByPk(entry.id, { include: eodIncludes });
  res.json({ success: true, data: formatEod(full) });
};

export const approveEodEntry = async (req, res) => {
  if (!hasPermission(req.user, 'eod_entries', 'approve')) {
    return res.status(403).json({ success: false, message: 'Approve permission required' });
  }

  const entry = await EodEntry.findByPk(req.params.id);
  if (!entry) {
    return res.status(404).json({ success: false, message: 'EOD entry not found' });
  }

  entry.approvedBy = req.user.id;
  entry.approvalDate = new Date();
  await entry.save();

  const full = await EodEntry.findByPk(entry.id, { include: eodIncludes });
  res.json({ success: true, data: formatEod(full) });
};

export const deleteEodEntry = async (req, res) => {
  const entry = await EodEntry.findByPk(req.params.id);
  if (!entry) {
    return res.status(404).json({ success: false, message: 'EOD entry not found' });
  }
  if (entry.billingStatus === 'invoiced') {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete invoiced EOD entry',
    });
  }
  await entry.destroy();
  res.json({ success: true, message: 'EOD entry deleted' });
};
