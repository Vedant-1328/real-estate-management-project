import { Op } from 'sequelize';
import sequelize from '../config/db.js';
import {
  Company,
  Driver,
  EodEntry,
  ExpenseType,
  JobAssignment,
  JobType,
  Site,
  User,
  Vehicle,
  VehicleType,
} from '../models/index.js';
import { calculateEodTotal } from '../utils/eodCalculations.js';
import { resolveEodBillingRate } from '../utils/companyRates.js';
import {
  getEodBillingUnit,
  quantityLabelForUnit,
  vehicleTypeUsesBothBilling,
} from '../utils/eodBilling.js';
import { hardDestroy } from '../utils/hardDestroy.js';
import { hasPermission } from '../utils/permissions.js';

import { todayDate } from '../utils/dateOnly.js';
import { isLoaderVehicle } from '../utils/loaderVehicleTypes.js';

const vehicleInclude = {
  model: Vehicle,
  attributes: ['id', 'vehicleNumber', 'vehicleType', 'vehicleTypeId'],
  include: [
    {
      model: VehicleType,
      as: 'vehicleTypeRef',
      attributes: ['id', 'name', 'billingUnit'],
    },
  ],
};

const assignmentIncludes = [
  { model: Company, as: 'company', attributes: ['id', 'companyName'] },
  { model: JobType, as: 'jobType', attributes: ['id', 'name'] },
  { ...vehicleInclude, as: 'vehicle' },
  { model: Driver, as: 'driver', attributes: ['id', 'name', 'mobile'] },
  { model: Site, as: 'fromSite', attributes: ['id', 'siteName', 'companyId'] },
  { model: Site, as: 'toSite', attributes: ['id', 'siteName', 'companyId'] },
];

const loadedByVehicleInclude = {
  model: Vehicle,
  as: 'loadedByVehicle',
  attributes: ['id', 'vehicleNumber'],
  required: false,
};

const loadedByDriverInclude = {
  model: Driver,
  as: 'loadedByDriver',
  attributes: ['id', 'name'],
  required: false,
};

const eodIncludes = [
  ...assignmentIncludes.map((inc) => ({ ...inc })),
  loadedByVehicleInclude,
  loadedByDriverInclude,
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
      'outsideDriverName',
      'outsideDriverMobile',
      'outsideDriverVehicle',
      'replacedDriverId',
      'driverCost',
    ],
    include: [{ model: Driver, as: 'replacedDriver', attributes: ['id', 'name'] }],
  },
  { model: User, as: 'approver', attributes: ['id', 'name'] },
  { model: ExpenseType, as: 'expenseType', attributes: ['id', 'name', 'status'] },
];

const routeLabel = (fromSite, toSite, fromTemp, toTemp) => {
  const from = fromSite?.siteName || fromTemp || '—';
  const to = toSite?.siteName || toTemp || '—';
  return `${from} → ${to}`;
};

const parseOptionalAmount = (value) =>
  value != null && value !== '' ? Number(value) : null;

const resolveEodExpenseFields = async (body) => {
  const expense = parseOptionalAmount(body.expense);
  const expenseTypeId =
    body.expenseTypeId != null && body.expenseTypeId !== ''
      ? Number(body.expenseTypeId)
      : null;

  if (expense != null && expense > 0 && !expenseTypeId) {
    return { error: 'Select an expense type when entering an expense amount' };
  }
  if (expenseTypeId && (expense == null || expense <= 0)) {
    return { error: 'Enter an expense amount when selecting an expense type' };
  }
  if (expenseTypeId) {
    const expenseType = await ExpenseType.findByPk(expenseTypeId);
    if (!expenseType) {
      return { error: 'Expense type not found' };
    }
    if (expenseType.status !== 'active') {
      return { error: 'Selected expense type is inactive' };
    }
  }

  return {
    expense: expense != null && expense > 0 ? expense : null,
    expenseTypeId: expense != null && expense > 0 ? expenseTypeId : null,
  };
};

const formatEod = (entry) => {
  const plain = entry.get ? entry.get({ plain: true }) : { ...entry };
  ['plannedTrips', 'actualTrips', 'ratePerTrip', 'totalAmount', 'extraCharges', 'deductions', 'dieselFuel', 'expense'].forEach(
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
  plain.loadedByDriverLabel = plain.loadedByDriver?.name || null;
  const loadedByParts = [
    plain.loadedByVehicle?.vehicleNumber,
    plain.loadedByDriver?.name,
  ].filter(Boolean);
  plain.loadedByLabel = loadedByParts.length ? loadedByParts.join(' · ') : null;
  plain.replacedDriverId = assignment.replacedDriverId ?? null;
  plain.replacedDriverLabel = assignment.replacedDriver?.name || null;
  plain.isOutsideDriver = Boolean(assignment.outsideDriverName);
  if (assignment.driverCost != null) plain.driverCostPerDay = Number(assignment.driverCost);
  plain.isApproved = Boolean(plain.approvedBy);
  plain.approverName = plain.approver?.name || null;

  const masterBillingUnit = plain.vehicle?.vehicleTypeRef?.billingUnit ?? null;
  const billingUnit = getEodBillingUnit(
    plain.vehicle?.vehicleType,
    masterBillingUnit,
    plain.quantityUnit ?? null
  );
  plain.masterBillingUnit = masterBillingUnit;
  plain.billingUnit = billingUnit;
  plain.quantityLabel = quantityLabelForUnit(billingUnit);

  return plain;
};

const loadVehicleTypeBilling = async (vehicleId) => {
  if (!vehicleId) return { vehicleType: null, vehicleTypeBillingUnit: null };
  const vehicle = await Vehicle.findByPk(vehicleId, {
    attributes: ['vehicleType', 'vehicleTypeId'],
    include: [{ model: VehicleType, as: 'vehicleTypeRef', attributes: ['billingUnit'] }],
  });
  return {
    vehicleType: vehicle?.vehicleType ?? null,
    vehicleTypeBillingUnit: vehicle?.vehicleTypeRef?.billingUnit ?? null,
  };
};

const resolveLoadedByVehicleId = async (loadedByVehicleId, primaryVehicleId) => {
  if (loadedByVehicleId == null || loadedByVehicleId === '') {
    return { loadedByVehicleId: null };
  }
  const id = Number(loadedByVehicleId);
  if (!Number.isFinite(id) || id < 1) {
    return { error: 'Invalid loaded-by vehicle' };
  }
  if (primaryVehicleId != null && Number(primaryVehicleId) === id) {
    return { error: 'Loaded by must be a different vehicle than the main EOD vehicle' };
  }
  const loader = await Vehicle.findByPk(id, {
    attributes: ['id', 'vehicleType', 'vehicleTypeId', 'status'],
    include: [{ model: VehicleType, as: 'vehicleTypeRef', attributes: ['name'] }],
  });
  if (!loader) {
    return { error: 'Loaded-by vehicle not found' };
  }
  if (loader.status === 'inactive') {
    return { error: 'Loaded-by vehicle is inactive' };
  }
  if (!isLoaderVehicle(loader)) {
    return { error: 'Loaded by must be a JCB or Hitachi vehicle' };
  }
  return { loadedByVehicleId: id };
};

const resolveLoadedByDriverId = async (
  loadedByDriverId,
  { loadedByVehicleId, primaryDriverId } = {}
) => {
  if (loadedByDriverId == null || loadedByDriverId === '') {
    return { loadedByDriverId: null };
  }
  const id = Number(loadedByDriverId);
  if (!Number.isFinite(id) || id < 1) {
    return { error: 'Invalid loaded-by driver' };
  }
  if (!loadedByVehicleId) {
    return { error: 'Select a loaded-by vehicle before choosing a driver' };
  }
  if (primaryDriverId != null && Number(primaryDriverId) === id) {
    return { error: 'Loaded-by driver must be different from the main EOD driver' };
  }
  const driver = await Driver.findByPk(id, {
    attributes: ['id', 'name', 'driverType', 'status'],
  });
  if (!driver) {
    return { error: 'Loaded-by driver not found' };
  }
  if (driver.status === 'inactive') {
    return { error: 'Loaded-by driver is inactive' };
  }
  if (driver.driverType === 'outside') {
    return { error: 'Loaded-by driver must be a fleet driver' };
  }
  return { loadedByDriverId: id };
};

const resolveLoadedByFields = async (body, { primaryVehicleId, primaryDriverId } = {}) => {
  let loadedByVehicleIdInput = body.loadedByVehicleId;
  const loadedByDriverIdInput = body.loadedByDriverId;

  if (
    (loadedByDriverIdInput != null && loadedByDriverIdInput !== '') &&
    (loadedByVehicleIdInput == null || loadedByVehicleIdInput === '')
  ) {
    const hintDriver = await Driver.findByPk(Number(loadedByDriverIdInput), {
      attributes: ['id', 'defaultVehicleId'],
      include: [
        {
          model: Vehicle,
          as: 'defaultVehicle',
          attributes: ['id', 'vehicleType', 'vehicleTypeId'],
          include: [{ model: VehicleType, as: 'vehicleTypeRef', attributes: ['name'] }],
        },
      ],
    });
    const defaultVehicle = hintDriver?.defaultVehicle;
    if (defaultVehicle && isLoaderVehicle(defaultVehicle)) {
      loadedByVehicleIdInput = defaultVehicle.id;
    }
  }

  const vehicle = await resolveLoadedByVehicleId(loadedByVehicleIdInput, primaryVehicleId);
  if (vehicle?.error) return vehicle;

  if (!vehicle.loadedByVehicleId) {
    if (loadedByDriverIdInput != null && loadedByDriverIdInput !== '') {
      return {
        error:
          'Select a JCB or Hitachi loader vehicle, or assign one as the driver’s default vehicle in Drivers',
      };
    }
    return { loadedByVehicleId: null, loadedByDriverId: null };
  }

  const driver = await resolveLoadedByDriverId(loadedByDriverIdInput, {
    loadedByVehicleId: vehicle.loadedByVehicleId,
    primaryDriverId,
  });
  if (driver?.error) return driver;

  return {
    loadedByVehicleId: vehicle.loadedByVehicleId,
    loadedByDriverId: driver.loadedByDriverId,
  };
};

const resolveQuantityUnit = async ({ quantityUnit, vehicleId }) => {
  if (quantityUnit === 'hour' || quantityUnit === 'trip') return quantityUnit;
  const { vehicleTypeBillingUnit } = await loadVehicleTypeBilling(vehicleId);
  if (vehicleTypeBillingUnit === 'hour') return 'hour';
  if (vehicleTypeBillingUnit === 'trip') return 'trip';
  if (vehicleTypeBillingUnit === 'both') return 'trip';
  return null;
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

// Resolve billing rate from company rate cards (per-hour for JCB vehicles).
// Returns null when no matching rate card exists.
const resolveRateForContext = async ({ companyId, jobTypeId, vehicleId, date, quantityUnit }) => {
  if (!companyId || !jobTypeId) return null;
  const { vehicleType, vehicleTypeBillingUnit } = await loadVehicleTypeBilling(vehicleId);
  const rate = await resolveEodBillingRate({
    companyId,
    jobTypeId,
    vehicleType,
    vehicleTypeBillingUnit,
    quantityUnit: quantityUnit ?? null,
    asOfDate: date,
  });
  return rate ? Number(rate.rateAmount) : null;
};

// Validate standalone EOD context (when no assignmentId is supplied).
// Returns an error string, or null when valid.
const validateReplacementDriver = async (replacedDriverId) => {
  if (!replacedDriverId) return 'On replacement of is required';
  const replaced = await Driver.findByPk(replacedDriverId, {
    attributes: ['id', 'status', 'driverType'],
  });
  if (!replaced || replaced.status === 'inactive' || replaced.driverType === 'outside') {
    return 'Invalid replacement driver';
  }
  return null;
};

const validateStandaloneContext = async ({
  jobTypeId,
  companyId,
  vehicleId,
  driverId,
  isOutsideDriver,
  outsideDriverName,
  outsideDriverMobile,
  replacedDriverId,
  driverCost,
  fromSiteId,
  toSiteId,
  fromSiteTemp,
  toSiteTemp,
}) => {
  if (!jobTypeId) return 'Job type is required';
  const jobType = await JobType.findByPk(jobTypeId);
  if (!jobType) return 'Invalid job type';

  if (companyId) {
    const company = await Company.findByPk(companyId);
    if (!company) return 'Invalid company';
  }

  if (isOutsideDriver) {
    if (!outsideDriverName?.trim()) return 'Outside driver name is required';
    if (!outsideDriverMobile?.trim()) return 'Mobile is required';
    if (!vehicleId) return 'Fleet vehicle is required';
    const vehicle = await Vehicle.findByPk(vehicleId);
    if (!vehicle) return 'Invalid fleet vehicle';
    const replacementError = await validateReplacementDriver(replacedDriverId);
    if (replacementError) return replacementError;
    if (driverCost == null || driverCost === '' || Number(driverCost) <= 0) {
      return 'Driver pay per day is required';
    }
  } else {
    if (!vehicleId) return 'Vehicle is required';
    if (!driverId) return 'Driver is required';
    const vehicle = await Vehicle.findByPk(vehicleId);
    if (!vehicle) return 'Invalid vehicle';
    const driver = await Driver.findByPk(driverId);
    if (!driver) return 'Invalid driver';
  }

  if (!fromSiteId && !fromSiteTemp) return 'From site or temporary site name is required';
  if (!toSiteId && !toSiteTemp) return 'To site or temporary site name is required';

  return null;
};

/** Resolve billing company from body + master sites (matches invoice picker logic). */
const resolveCompanyIdForEod = async ({ companyId, fromSiteId, toSiteId }) => {
  if (companyId) return companyId;
  if (fromSiteId) {
    const from = await Site.findByPk(fromSiteId, { attributes: ['companyId'] });
    if (from?.companyId) return from.companyId;
  }
  if (toSiteId) {
    const to = await Site.findByPk(toSiteId, { attributes: ['companyId'] });
    if (to?.companyId) return to.companyId;
  }
  return null;
};

// Enforce "one EOD per resource per day":
//   own driver  -> unique (vehicleId, date) and (driverId, date)
//   outside     -> unique (outsideDriverName, date)
//
// `transaction` is required so the lookup participates in the surrounding
// create transaction. `lock: true` upgrades the SELECT to a row lock so two
// concurrent inserts can't both pass the check.
const findDuplicateEodForDay = async (
  { date, vehicleId, driverId, isOutsideDriver, outsideDriverName },
  { transaction } = {}
) => {
  const queryOptions = transaction ? { transaction, lock: true } : {};
  const ors = [];
  if (!isOutsideDriver) {
    if (vehicleId) ors.push({ vehicleId });
    if (driverId) ors.push({ driverId });
  }

  if (isOutsideDriver && outsideDriverName) {
    const sameDayAssignments = await JobAssignment.findAll({
      attributes: ['id'],
      where: {
        assignmentDate: date,
        outsideDriverName,
      },
      raw: true,
      ...queryOptions,
    });
    if (!sameDayAssignments.length) return null;
    return EodEntry.findOne({
      where: {
        date,
        assignmentId: { [Op.in]: sameDayAssignments.map((a) => a.id) },
      },
      ...queryOptions,
    });
  }

  if (!ors.length) return null;
  return EodEntry.findOne({
    where: {
      date,
      [Op.or]: ors,
    },
    ...queryOptions,
  });
};

export const createEodEntry = async (req, res) => {
  const body = req.body || {};
  const hasAssignmentId = body.assignmentId != null && body.assignmentId !== '';

  // Legacy mode: client supplied a JobAssignment id (kept for backward compat).
  if (hasAssignmentId) {
    const assignment = await JobAssignment.findByPk(body.assignmentId, {
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
    const extraCharges = body.extraCharges ?? 0;
    const deductions = body.deductions ?? 0;
    const actualTrips = body.actualTrips;
    let ratePerTrip =
      body.ratePerTrip != null && body.ratePerTrip !== '' ? Number(body.ratePerTrip) : null;

    const { vehicleTypeBillingUnit: legacyMasterUnit } = await loadVehicleTypeBilling(
      base.vehicleId
    );
    if (vehicleTypeUsesBothBilling(legacyMasterUnit) && !body.quantityUnit) {
      return res.status(400).json({
        success: false,
        message: 'Select whether this entry is billed per hour or per trip',
      });
    }
    const quantityUnit = await resolveQuantityUnit({
      quantityUnit: body.quantityUnit,
      vehicleId: base.vehicleId,
    });
    if (ratePerTrip == null && base.companyId) {
      ratePerTrip = await resolveRateForContext({
        companyId: base.companyId,
        jobTypeId: base.jobTypeId,
        vehicleId: base.vehicleId,
        date: base.date,
        quantityUnit,
      });
    }

    const totalAmount = calculateEodTotal({
      actualTrips,
      ratePerTrip: ratePerTrip ?? 0,
      extraCharges,
      deductions,
    });

    const dieselFuel =
      body.dieselFuel != null && body.dieselFuel !== ''
        ? body.dieselFuel
        : base.dieselFuel ?? null;
    const expenseFields = await resolveEodExpenseFields(body);
    if (expenseFields.error) {
      return res.status(400).json({ success: false, message: expenseFields.error });
    }

    const loadedBy = await resolveLoadedByFields(body, {
      primaryVehicleId: base.vehicleId,
      primaryDriverId: base.driverId,
    });
    if (loadedBy?.error) {
      return res.status(400).json({ success: false, message: loadedBy.error });
    }

    const payload = {
      ...base,
      quantityUnit,
      ratePerTrip,
      actualTrips,
      extraCharges,
      deductions,
      dieselFuel,
      expense: expenseFields.expense,
      expenseTypeId: expenseFields.expenseTypeId,
      totalAmount,
      remarks: body.remarks || null,
      startTime: body.startTime || null,
      endTime: body.endTime || null,
      loadedByVehicleId: loadedBy.loadedByVehicleId,
      loadedByDriverId: loadedBy.loadedByDriverId,
      billingStatus: 'pending',
    };

    if (body.approved && hasPermission(req.user, 'eod_entries', 'approve')) {
      payload.approvedBy = req.user.id;
      payload.approvalDate = new Date();
    }

    const entry = await EodEntry.create(payload);
    const full = await EodEntry.findByPk(entry.id, { include: eodIncludes });
    return res.status(201).json({ success: true, data: formatEod(full) });
  }

  // Standalone mode: build a hidden JobAssignment stub + the EOD in one transaction.
  const date = body.date || todayDate();
  const isOutsideDriver = Boolean(body.isOutsideDriver);
  const fromSiteId = body.fromSiteId ?? null;
  const toSiteId = body.toSiteId ?? null;
  const companyId = await resolveCompanyIdForEod({
    companyId: body.companyId ?? null,
    fromSiteId,
    toSiteId,
  });
  const jobTypeId = body.jobTypeId;
  const vehicleId = !isOutsideDriver ? body.vehicleId ?? null : body.vehicleId ?? null;
  const driverId = !isOutsideDriver ? body.driverId ?? null : null;
  const outsideDriverName = isOutsideDriver ? (body.outsideDriverName || '').trim() : null;
  const outsideDriverMobile = isOutsideDriver ? body.outsideDriverMobile || null : null;
  const outsideDriverVehicle = null;
  const replacedDriverId = isOutsideDriver ? Number(body.replacedDriverId) : null;
  const driverCost =
    isOutsideDriver && body.driverCost != null && body.driverCost !== ''
      ? Number(body.driverCost)
      : null;
  const fromSiteTemp = body.fromSiteTemp ? String(body.fromSiteTemp).trim() : null;
  const toSiteTemp = body.toSiteTemp ? String(body.toSiteTemp).trim() : null;

  let ratePerTrip =
    body.ratePerTrip != null && body.ratePerTrip !== '' ? Number(body.ratePerTrip) : null;

  const validationError = await validateStandaloneContext({
    jobTypeId,
    companyId,
    vehicleId,
    driverId,
    isOutsideDriver,
    outsideDriverName,
    outsideDriverMobile,
    replacedDriverId,
    driverCost,
    fromSiteId,
    toSiteId,
    fromSiteTemp,
    toSiteTemp,
  });
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  if (!companyId && (fromSiteId || toSiteId)) {
    return res.status(400).json({
      success: false,
      message:
        'Selected master site is not linked to a customer company. Edit the site in Sites and assign a company before saving this EOD.',
    });
  }

  const actualTrips = body.actualTrips;
  const plannedTrips =
    body.plannedTrips != null && body.plannedTrips !== ''
      ? Number(body.plannedTrips)
      : Number(actualTrips) || 0;
  const extraCharges = body.extraCharges ?? 0;
  const deductions = body.deductions ?? 0;

  const { vehicleTypeBillingUnit } = await loadVehicleTypeBilling(vehicleId);
  if (vehicleTypeUsesBothBilling(vehicleTypeBillingUnit) && !body.quantityUnit) {
    return res.status(400).json({
      success: false,
      message: 'Select whether this entry is billed per hour or per trip',
    });
  }
  const quantityUnit = await resolveQuantityUnit({
    quantityUnit: body.quantityUnit,
    vehicleId,
  });

  if (ratePerTrip == null && companyId) {
    ratePerTrip = await resolveRateForContext({
      companyId,
      jobTypeId,
      vehicleId,
      date,
      quantityUnit,
    });
  }

  const totalAmount = calculateEodTotal({
    actualTrips,
    ratePerTrip: ratePerTrip ?? 0,
    extraCharges,
    deductions,
  });

  const dieselFuel =
    body.dieselFuel != null && body.dieselFuel !== '' ? body.dieselFuel : null;
  const expenseFields = await resolveEodExpenseFields(body);
  if (expenseFields.error) {
    return res.status(400).json({ success: false, message: expenseFields.error });
  }

  const loadedBy = await resolveLoadedByFields(body, {
    primaryVehicleId: vehicleId,
    primaryDriverId: driverId,
  });
  if (loadedBy?.error) {
    return res.status(400).json({ success: false, message: loadedBy.error });
  }

  let result;
  try {
    result = await sequelize.transaction(async (t) => {
      // Race-safe duplicate guard: re-check + row-lock inside the txn so two
      // concurrent inserts can't both pass the check.
      const dup = await findDuplicateEodForDay(
        { date, vehicleId, driverId, isOutsideDriver, outsideDriverName },
        { transaction: t }
      );
      if (dup) {
        const err = new Error('DUPLICATE_EOD');
        err.code = 'DUPLICATE_EOD';
        throw err;
      }

      const assignment = await JobAssignment.create(
        {
          assignmentDate: date,
          companyId,
          jobTypeId,
          vehicleId,
          driverId,
          outsideDriverName,
          outsideDriverMobile,
          outsideDriverVehicle,
          replacedDriverId,
          fromSiteId,
          toSiteId,
          fromSiteTemp,
          toSiteTemp,
          expectedTrips: plannedTrips,
          companyRate: ratePerTrip,
          driverCost,
          dieselFuel,
          status: 'completed',
          createdBy: req.user?.id ?? null,
        },
        { transaction: t }
      );

      const payload = {
        assignmentId: assignment.id,
        date,
        companyId,
        vehicleId,
        driverId,
        jobTypeId,
        fromSiteId,
        toSiteId,
        plannedTrips,
        quantityUnit,
        ratePerTrip,
        actualTrips,
        extraCharges,
        deductions,
        dieselFuel,
        expense: expenseFields.expense,
        expenseTypeId: expenseFields.expenseTypeId,
        totalAmount,
        remarks: body.remarks || null,
        startTime: body.startTime || null,
        endTime: body.endTime || null,
        loadedByVehicleId: loadedBy.loadedByVehicleId,
        loadedByDriverId: loadedBy.loadedByDriverId,
        billingStatus: 'pending',
      };

      if (body.approved && hasPermission(req.user, 'eod_entries', 'approve')) {
        payload.approvedBy = req.user.id;
        payload.approvalDate = new Date();
      }

      const entry = await EodEntry.create(payload, { transaction: t });
      return entry;
    });
  } catch (err) {
    if (err?.code === 'DUPLICATE_EOD') {
      return res.status(409).json({
        success: false,
        message:
          'An EOD entry already exists for this resource on the selected date. Only one entry per day is allowed.',
      });
    }
    throw err;
  }

  const full = await EodEntry.findByPk(result.id, { include: eodIncludes });
  return res.status(201).json({ success: true, data: formatEod(full) });
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

  if (req.body.quantityUnit !== undefined) {
    entry.quantityUnit =
      req.body.quantityUnit === 'hour' || req.body.quantityUnit === 'trip'
        ? req.body.quantityUnit
        : null;
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
  if (req.body.expense !== undefined || req.body.expenseTypeId !== undefined) {
    const expenseFields = await resolveEodExpenseFields({
      expense: req.body.expense !== undefined ? req.body.expense : entry.expense,
      expenseTypeId:
        req.body.expenseTypeId !== undefined ? req.body.expenseTypeId : entry.expenseTypeId,
    });
    if (expenseFields.error) {
      return res.status(400).json({ success: false, message: expenseFields.error });
    }
    entry.expense = expenseFields.expense;
    entry.expenseTypeId = expenseFields.expenseTypeId;
  }
  if (req.body.ratePerTrip !== undefined) {
    entry.ratePerTrip =
      req.body.ratePerTrip != null && req.body.ratePerTrip !== ''
        ? Number(req.body.ratePerTrip)
        : null;
  }
  if (
    req.body.loadedByVehicleId !== undefined ||
    req.body.loadedByDriverId !== undefined
  ) {
    const primaryVehicleId =
      req.body.vehicleId !== undefined ? req.body.vehicleId : entry.vehicleId;
    const primaryDriverId =
      req.body.driverId !== undefined ? req.body.driverId : entry.driverId;
    const loadedBy = await resolveLoadedByFields(
      {
        loadedByVehicleId:
          req.body.loadedByVehicleId !== undefined
            ? req.body.loadedByVehicleId
            : entry.loadedByVehicleId,
        loadedByDriverId:
          req.body.loadedByDriverId !== undefined
            ? req.body.loadedByDriverId
            : entry.loadedByDriverId,
      },
      { primaryVehicleId, primaryDriverId }
    );
    if (loadedBy?.error) {
      return res.status(400).json({ success: false, message: loadedBy.error });
    }
    entry.loadedByVehicleId = loadedBy.loadedByVehicleId;
    entry.loadedByDriverId = loadedBy.loadedByDriverId;
  }

  let outsideStub = null;
  if (entry.assignmentId) {
    outsideStub = await JobAssignment.findByPk(entry.assignmentId, {
      attributes: [
        'id',
        'outsideDriverName',
        'outsideDriverMobile',
        'replacedDriverId',
        'vehicleId',
        'driverCost',
        'fromSiteTemp',
        'toSiteTemp',
      ],
    });
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

  if (entry.assignmentId) {
    const stub = outsideStub ?? (await JobAssignment.findByPk(entry.assignmentId));
    if (stub?.outsideDriverName) {
      const mobile =
        req.body.outsideDriverMobile !== undefined
          ? req.body.outsideDriverMobile
          : stub.outsideDriverMobile;
      const vehicleId =
        req.body.vehicleId !== undefined
          ? req.body.vehicleId
          : stub.vehicleId ?? entry.vehicleId;
      const replacedDriverId =
        req.body.replacedDriverId !== undefined
          ? req.body.replacedDriverId
          : stub.replacedDriverId;
      const driverCost =
        req.body.driverCost !== undefined ? req.body.driverCost : stub.driverCost;

      const outsideError = await validateStandaloneContext({
        jobTypeId: entry.jobTypeId,
        companyId: entry.companyId,
        vehicleId,
        driverId: null,
        isOutsideDriver: true,
        outsideDriverName: stub.outsideDriverName,
        outsideDriverMobile: mobile,
        replacedDriverId,
        driverCost,
        fromSiteId: entry.fromSiteId,
        toSiteId: entry.toSiteId,
        fromSiteTemp: stub.fromSiteTemp,
        toSiteTemp: stub.toSiteTemp,
      });
      if (outsideError) {
        return res.status(400).json({ success: false, message: outsideError });
      }

      if (req.body.outsideDriverMobile !== undefined) {
        stub.outsideDriverMobile = String(mobile).trim();
      }
      if (req.body.vehicleId !== undefined) {
        stub.vehicleId = Number(vehicleId);
        entry.vehicleId = stub.vehicleId;
      }
      if (req.body.replacedDriverId !== undefined) {
        stub.replacedDriverId = Number(replacedDriverId);
      }
      if (req.body.driverCost !== undefined) {
        stub.driverCost = Number(driverCost);
      }
      await stub.save();
      if (req.body.vehicleId !== undefined || req.body.driverCost !== undefined) {
        await entry.save();
      }
    }
  }

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

  // If this EOD was created in standalone mode it owns a hidden
  // JobAssignment stub. Delete both together so we don't leave an
  // orphan `completed` assignment behind.
  const assignmentId = entry.assignmentId;
  let stubAssignment = null;
  if (assignmentId) {
    stubAssignment = await JobAssignment.findOne({
      where: { id: assignmentId, status: 'completed' },
    });
  }

  await sequelize.transaction(async (t) => {
    await hardDestroy(entry, { transaction: t });
    if (stubAssignment) {
      await hardDestroy(stubAssignment, { transaction: t });
    }
  });

  res.json({ success: true, message: 'EOD entry deleted' });
};
