import { Op } from 'sequelize';
import {
  DailyExpense,
  Driver,
  ExpenseType,
  User,
  Vehicle,
} from '../models/index.js';
import { toPublicUploadPath } from '../middlewares/expenseUpload.js';

const expenseIncludes = [
  { model: Vehicle, as: 'vehicle', attributes: ['id', 'vehicleNumber'] },
  { model: Driver, as: 'driver', attributes: ['id', 'name'] },
  { model: ExpenseType, as: 'expenseType', attributes: ['id', 'name'] },
  { model: User, as: 'creator', attributes: ['id', 'name'] },
];

const formatExpense = (expense) => {
  const plain = expense.get ? expense.get({ plain: true }) : { ...expense };
  if (plain.amount != null) plain.amount = Number(plain.amount);
  plain.createdByName = plain.creator?.name || null;
  return plain;
};

export const listExpenses = async (req, res) => {
  const { from, to, vehicleId, driverId, expenseTypeId } = req.query;
  const where = {};

  if (from && to) {
    where.expenseDate = { [Op.between]: [from, to] };
  } else if (from) {
    where.expenseDate = { [Op.gte]: from };
  } else if (to) {
    where.expenseDate = { [Op.lte]: to };
  }

  if (vehicleId) where.vehicleId = vehicleId;
  if (driverId) where.driverId = driverId;
  if (expenseTypeId) where.expenseTypeId = expenseTypeId;

  const expenses = await DailyExpense.findAll({
    where,
    include: expenseIncludes,
    order: [
      ['expenseDate', 'DESC'],
      ['id', 'DESC'],
    ],
  });

  const data = expenses.map(formatExpense);
  const listTotal = data.reduce((sum, row) => sum + (row.amount || 0), 0);

  res.json({
    success: true,
    data,
    meta: { listTotal },
  });
};

export const getExpense = async (req, res) => {
  const expense = await DailyExpense.findByPk(req.params.id, { include: expenseIncludes });
  if (!expense) {
    return res.status(404).json({ success: false, message: 'Expense not found' });
  }
  res.json({ success: true, data: formatExpense(expense) });
};

export const createExpense = async (req, res) => {
  const vehicle = await Vehicle.findByPk(req.body.vehicleId);
  if (!vehicle) {
    return res.status(400).json({ success: false, message: 'Invalid vehicle' });
  }

  const expenseType = await ExpenseType.findByPk(req.body.expenseTypeId);
  if (!expenseType) {
    return res.status(400).json({ success: false, message: 'Invalid expense type' });
  }

  if (req.body.driverId) {
    const driver = await Driver.findByPk(req.body.driverId);
    if (!driver) {
      return res.status(400).json({ success: false, message: 'Invalid driver' });
    }
  }

  const expense = await DailyExpense.create({
    expenseDate: req.body.expenseDate,
    vehicleId: req.body.vehicleId,
    driverId: req.body.driverId || null,
    expenseTypeId: req.body.expenseTypeId,
    amount: req.body.amount,
    paidBy: req.body.paidBy,
    paymentMode: req.body.paymentMode,
    receiptPath: req.file ? toPublicUploadPath(req.file.path) : null,
    notes: req.body.notes || null,
    createdBy: req.user.id,
  });

  const full = await DailyExpense.findByPk(expense.id, { include: expenseIncludes });
  res.status(201).json({ success: true, data: formatExpense(full) });
};

export const updateExpense = async (req, res) => {
  const expense = await DailyExpense.findByPk(req.params.id);
  if (!expense) {
    return res.status(404).json({ success: false, message: 'Expense not found' });
  }

  if (req.body.vehicleId) {
    const vehicle = await Vehicle.findByPk(req.body.vehicleId);
    if (!vehicle) {
      return res.status(400).json({ success: false, message: 'Invalid vehicle' });
    }
  }

  const fields = [
    'expenseDate',
    'vehicleId',
    'driverId',
    'expenseTypeId',
    'amount',
    'paidBy',
    'paymentMode',
    'notes',
  ];

  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      expense[field] = req.body[field] === '' ? null : req.body[field];
    }
  });

  if (req.file) {
    expense.receiptPath = toPublicUploadPath(req.file.path);
  }

  await expense.save();

  const full = await DailyExpense.findByPk(expense.id, { include: expenseIncludes });
  res.json({ success: true, data: formatExpense(full) });
};

export const deleteExpense = async (req, res) => {
  const expense = await DailyExpense.findByPk(req.params.id);
  if (!expense) {
    return res.status(404).json({ success: false, message: 'Expense not found' });
  }
  await expense.destroy();
  res.json({ success: true, message: 'Expense deleted' });
};

export const summaryByVehicle = async (req, res) => {
  const { from, to } = req.query;

  const expenses = await DailyExpense.findAll({
    where: {
      expenseDate: { [Op.between]: [from, to] },
      vehicleId: { [Op.ne]: null },
    },
    include: [
      { model: Vehicle, as: 'vehicle', attributes: ['id', 'vehicleNumber'] },
      { model: ExpenseType, as: 'expenseType', attributes: ['id', 'name'] },
    ],
  });

  const byVehicle = new Map();

  for (const exp of expenses) {
    const plain = formatExpense(exp);
    const vid = plain.vehicleId;
    if (!byVehicle.has(vid)) {
      byVehicle.set(vid, {
        vehicleId: vid,
        vehicleNumber: plain.vehicle?.vehicleNumber || '—',
        breakdown: [],
        grandTotal: 0,
        _typeTotals: new Map(),
      });
    }
    const row = byVehicle.get(vid);
    const typeName = plain.expenseType?.name || 'Other';
    const amount = plain.amount || 0;
    row.grandTotal += amount;
    row._typeTotals.set(typeName, (row._typeTotals.get(typeName) || 0) + amount);
  }

  const data = Array.from(byVehicle.values()).map((row) => {
    row.breakdown = Array.from(row._typeTotals.entries()).map(([expenseType, total]) => ({
      expenseType,
      total,
    }));
    delete row._typeTotals;
    row.grandTotal = Number(row.grandTotal.toFixed(2));
    row.breakdown.forEach((b) => {
      b.total = Number(b.total.toFixed(2));
    });
    return row;
  });

  data.sort((a, b) => a.vehicleNumber.localeCompare(b.vehicleNumber));

  res.json({ success: true, data });
};
