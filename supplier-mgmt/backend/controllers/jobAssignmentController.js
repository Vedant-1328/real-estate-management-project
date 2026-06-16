import { Op } from 'sequelize';
import {
  Company,
  Driver,
  EodEntry,
  Invoice,
  InvoiceItem,
  JobAssignment,
  JobType,
  Site,
  Vehicle,
  VehicleType,
} from '../models/index.js';
import { hardDestroy, hardDestroyWhere } from '../utils/hardDestroy.js';
import {
  buildConflictMessage,
  findAssignmentConflicts,
  hasConflict,
} from '../utils/assignmentConflict.js';
import { formatRate, resolveEodBillingRate } from '../utils/companyRates.js';
import { hasPermission } from '../utils/permissions.js';

const assignmentIncludes = [
  { model: Company, as: 'company', attributes: ['id', 'companyName'] },
  { model: JobType, as: 'jobType', attributes: ['id', 'name'] },
  {
    model: Vehicle,
    as: 'vehicle',
    attributes: ['id', 'vehicleNumber', 'vehicleType', 'vehicleTypeId'],
    include: [
      { model: VehicleType, as: 'vehicleTypeRef', attributes: ['id', 'name', 'billingUnit'] },
    ],
  },
  { model: Driver, as: 'driver', attributes: ['id', 'name', 'mobile'] },
  { model: Driver, as: 'replacedDriver', attributes: ['id', 'name', 'mobile'] },
  { model: Site, as: 'fromSite', attributes: ['id', 'siteName', 'companyId'] },
  { model: Site, as: 'toSite', attributes: ['id', 'siteName', 'companyId'] },
];

const formatAssignment = (assignment) => {
  const plain = assignment.get ? assignment.get({ plain: true }) : { ...assignment };
  if (plain.companyRate != null) plain.companyRate = Number(plain.companyRate);
  if (plain.driverCost != null) plain.driverCost = Number(plain.driverCost);
  if (plain.dieselFuel != null) plain.dieselFuel = Number(plain.dieselFuel);

  const fromLabel = plain.fromSite?.siteName || plain.fromSiteTemp || '—';
  const toLabel = plain.toSite?.siteName || plain.toSiteTemp || '—';
  plain.routeLabel = `${fromLabel} → ${toLabel}`;
  plain.replacedDriverLabel = plain.replacedDriver?.name || null;

  return plain;
};

const normalizePayload = (body) => {
  const isOutside = Boolean(body.isOutsideDriver);

  return {
    assignmentDate: body.assignmentDate,
    companyId:
      body.companyId != null && body.companyId !== '' ? Number(body.companyId) : null,
    jobTypeId: body.jobTypeId,
    vehicleId: body.vehicleId || null,
    driverId: isOutside ? null : body.driverId || null,
    outsideDriverName: isOutside ? body.outsideDriverName : null,
    outsideDriverMobile: isOutside ? body.outsideDriverMobile || null : null,
    outsideDriverVehicle: isOutside ? body.outsideDriverVehicle || null : null,
    replacedDriverId:
      isOutside && body.replacedDriverId != null && body.replacedDriverId !== ''
        ? Number(body.replacedDriverId)
        : null,
    fromSiteId: body.fromSiteId || null,
    toSiteId: body.toSiteId || null,
    fromSiteTemp: body.fromSiteTemp || null,
    toSiteTemp: body.toSiteTemp || null,
    expectedTrips: body.expectedTrips,
    dieselFuel: body.dieselFuel != null && body.dieselFuel !== '' ? body.dieselFuel : null,
    driverCost: isOutside ? body.driverCost ?? null : null,
    instructions: body.instructions || null,
    status: body.status,
  };
};

const validateAssignmentRefs = async (payload, { isOutside }) => {
  if (payload.companyId) {
    const company = await Company.findByPk(payload.companyId);
    if (!company) return 'Invalid company';
  }

  const jobType = await JobType.findByPk(payload.jobTypeId);
  if (!jobType) return 'Invalid job type';

  if (payload.vehicleId) {
    const vehicle = await Vehicle.findByPk(payload.vehicleId);
    if (!vehicle) return 'Invalid vehicle';
  } else if (!isOutside) {
    return 'Vehicle is required';
  }

  if (!isOutside) {
    if (!payload.driverId) return 'Driver is required';
    const driver = await Driver.findByPk(payload.driverId);
    if (!driver) return 'Invalid driver';
  } else if (!payload.outsideDriverName) {
    return 'Outside driver name is required';
  }

  if (!payload.fromSiteId && !payload.fromSiteTemp) {
    return 'From site or temporary site name is required';
  }
  if (!payload.toSiteId && !payload.toSiteTemp) {
    return 'To site or temporary site name is required';
  }

  return null;
};

const resolveCompanyRate = async (payload) => {
  let vehicleType = null;
  let vehicleTypeBillingUnit = null;
  if (payload.vehicleId) {
    const vehicle = await Vehicle.findByPk(payload.vehicleId, {
      attributes: ['vehicleType', 'vehicleTypeId'],
      include: [
        { model: VehicleType, as: 'vehicleTypeRef', attributes: ['billingUnit'] },
      ],
    });
    vehicleType = vehicle?.vehicleType ?? null;
    vehicleTypeBillingUnit = vehicle?.vehicleTypeRef?.billingUnit ?? null;
  }

  const rate = await resolveEodBillingRate({
    companyId: payload.companyId,
    jobTypeId: payload.jobTypeId,
    vehicleType,
    vehicleTypeBillingUnit,
    quantityUnit: null,
    asOfDate: payload.assignmentDate,
  });

  return rate ? Number(rate.rateAmount) : null;
};

const applyCompanyRate = async (payload) => {
  payload.companyRate = await resolveCompanyRate(payload);
  return payload;
};

const resolveConflict = async (req, res, { assignmentDate, vehicleId, driverId, excludeId }) => {
  const conflicts = await findAssignmentConflicts({
    assignmentDate,
    vehicleId,
    driverId,
    excludeId,
  });

  if (!hasConflict(conflicts)) return true;

  if (!req.body.forceAssign) {
    res.status(409).json({
      error: 'conflict',
      message: buildConflictMessage(conflicts),
      canOverride: true,
    });
    return false;
  }

  if (!hasPermission(req.user, 'job_assignments', 'override')) {
    res.status(403).json({ success: false, message: 'Override not permitted' });
    return false;
  }

  return true;
};

const loadAssignment = async (id) =>
  JobAssignment.findByPk(id, { include: assignmentIncludes });

export const getEffectiveRateForAssignment = async (req, res) => {
  const { companyId, jobTypeId, assignmentDate, vehicleType, quantityUnit } = req.query;

  let vehicleTypeBillingUnit = null;
  if (vehicleType) {
    const vt = await VehicleType.findOne({
      where: { name: String(vehicleType).trim() },
      attributes: ['billingUnit'],
    });
    vehicleTypeBillingUnit = vt?.billingUnit ?? null;
  }

  const rate = await resolveEodBillingRate({
    companyId,
    jobTypeId,
    vehicleType: vehicleType || null,
    vehicleTypeBillingUnit,
    quantityUnit: quantityUnit || null,
    asOfDate: assignmentDate,
  });

  res.json({
    success: true,
    data: rate ? formatRate(rate) : null,
  });
};

export const listAssignments = async (req, res) => {
  const { date, companyId, driverId, vehicleId, status, outsideOnly } = req.query;
  const where = {};

  if (date) where.assignmentDate = date;
  if (companyId) where.companyId = companyId;
  if (driverId) where.driverId = driverId;
  if (vehicleId) where.vehicleId = vehicleId;
  if (status && status !== 'all') where.status = status;
  if (outsideOnly === 'true' || outsideOnly === '1') {
    where.outsideDriverName = { [Op.ne]: null };
  }

  const assignments = await JobAssignment.findAll({
    where,
    include: assignmentIncludes,
    order: [
      ['assignmentDate', 'DESC'],
      ['id', 'DESC'],
    ],
  });

  res.json({
    success: true,
    data: assignments.map(formatAssignment),
  });
};

export const createAssignment = async (req, res) => {
  const isOutside = Boolean(req.body.isOutsideDriver);
  const payload = normalizePayload(req.body);
  payload.status = payload.status || 'planned';
  payload.createdBy = req.user.id;

  const refError = await validateAssignmentRefs(payload, { isOutside });
  if (refError) {
    return res.status(400).json({ success: false, message: refError });
  }

  payload.companyRate = null;

  const ok = await resolveConflict(req, res, {
    assignmentDate: payload.assignmentDate,
    vehicleId: payload.vehicleId,
    driverId: payload.driverId,
    excludeId: null,
  });
  if (!ok) return;

  const assignment = await JobAssignment.create(payload);
  const full = await loadAssignment(assignment.id);

  res.status(201).json({ success: true, data: formatAssignment(full) });
};

export const getAssignment = async (req, res) => {
  const assignment = await loadAssignment(req.params.id);
  if (!assignment) {
    return res.status(404).json({ success: false, message: 'Assignment not found' });
  }

  res.json({ success: true, data: formatAssignment(assignment) });
};

export const updateAssignment = async (req, res) => {
  const assignment = await JobAssignment.findByPk(req.params.id);
  if (!assignment) {
    return res.status(404).json({ success: false, message: 'Assignment not found' });
  }

  if (assignment.status === 'completed') {
    return res.status(400).json({
      success: false,
      message: 'Completed assignments cannot be edited',
    });
  }

  const isOutside = Boolean(req.body.isOutsideDriver);
  const payload = normalizePayload(req.body);

  const refError = await validateAssignmentRefs(payload, { isOutside });
  if (refError) {
    return res.status(400).json({ success: false, message: refError });
  }

  const ok = await resolveConflict(req, res, {
    assignmentDate: payload.assignmentDate,
    vehicleId: payload.vehicleId,
    driverId: payload.driverId,
    excludeId: assignment.id,
  });
  if (!ok) return;

  if (payload.status !== undefined) {
    assignment.status = payload.status;
  }

  const fields = [
    'assignmentDate',
    'companyId',
    'jobTypeId',
    'vehicleId',
    'driverId',
    'outsideDriverName',
    'outsideDriverMobile',
    'outsideDriverVehicle',
    'replacedDriverId',
    'fromSiteId',
    'toSiteId',
    'fromSiteTemp',
    'toSiteTemp',
    'expectedTrips',
    'companyRate',
    'dieselFuel',
    'driverCost',
    'instructions',
  ];

  fields.forEach((field) => {
    if (payload[field] !== undefined) {
      assignment[field] = payload[field];
    }
  });

  await assignment.save();

  const full = await loadAssignment(assignment.id);
  res.json({ success: true, data: formatAssignment(full) });
};

export const updateAssignmentStatus = async (req, res) => {
  const assignment = await JobAssignment.findByPk(req.params.id);
  if (!assignment) {
    return res.status(404).json({ success: false, message: 'Assignment not found' });
  }

  assignment.status = req.body.status;
  await assignment.save();

  const full = await loadAssignment(assignment.id);
  res.json({ success: true, data: formatAssignment(full) });
};

export const deleteAssignment = async (req, res) => {
  const assignment = await JobAssignment.findByPk(req.params.id);
  if (!assignment) {
    return res.status(404).json({ success: false, message: 'Assignment not found' });
  }

  const eodEntries = await EodEntry.findAll({
    where: { assignmentId: assignment.id },
    attributes: ['id', 'billingStatus'],
  });

  if (eodEntries.length) {
    const eodIds = eodEntries.map((e) => e.id);
    const invoiceItems = await InvoiceItem.findAll({
      where: { eodEntryId: { [Op.in]: eodIds } },
      include: [
        {
          model: Invoice,
          as: 'invoice',
          attributes: ['id', 'invoiceNumber', 'paymentStatus'],
        },
      ],
    });

    const activeItems = invoiceItems.filter(
      (item) => item.invoice && item.invoice.paymentStatus !== 'cancelled'
    );
    if (activeItems.length) {
      const numbers = [
        ...new Set(activeItems.map((item) => item.invoice.invoiceNumber).filter(Boolean)),
      ];
      return res.status(400).json({
        success: false,
        message: `Cannot delete: EOD for this assignment is on invoice ${numbers.join(', ')}. Cancel that invoice first.`,
      });
    }

    if (invoiceItems.length) {
      await hardDestroyWhere(InvoiceItem, { eodEntryId: { [Op.in]: eodIds } });
    }

    await hardDestroyWhere(EodEntry, { assignmentId: assignment.id });
  }

  await hardDestroy(assignment);
  res.json({ success: true, message: 'Assignment deleted' });
};
