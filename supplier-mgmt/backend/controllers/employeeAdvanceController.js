import { Op } from 'sequelize';
import { Employee, EmployeeAdvance } from '../models/index.js';
import { buildSalarySummaryRow } from '../utils/salaryAdvanceSummary.js';

const formatAdvance = (row) => {
  const plain = row.get ? row.get({ plain: true }) : { ...row };
  plain.amount = Number(plain.amount);
  plain.employeeName = plain.employee?.name;
  plain.employeeType = plain.employee?.employeeType;
  return plain;
};

export const listEmployeeAdvances = async (req, res) => {
  const { employeeId, month, year, status, search, employeeType } = req.query;
  const where = {};

  if (employeeId) where.employeeId = employeeId;
  if (month) where.salaryPeriodMonth = month;
  if (year) where.salaryPeriodYear = year;
  if (status && status !== 'all') where.status = status;

  const employeeWhere = { status: 'active' };
  if (employeeType && employeeType !== 'all') {
    employeeWhere.employeeType = employeeType;
  }
  if (search) {
    employeeWhere[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { mobile: { [Op.like]: `%${search}%` } },
    ];
  }

  const rows = await EmployeeAdvance.findAll({
    where,
    include: [
      {
        model: Employee,
        as: 'employee',
        attributes: ['id', 'name', 'mobile', 'employeeType'],
        where: employeeWhere,
        required: true,
      },
    ],
    order: [
      ['advanceDate', 'DESC'],
      ['id', 'DESC'],
    ],
  });

  res.json({ success: true, data: rows.map(formatAdvance) });
};

export const createEmployeeAdvance = async (req, res) => {
  const employee = await Employee.findByPk(req.body.employeeId);
  if (!employee) {
    return res.status(400).json({ success: false, message: 'Invalid employee' });
  }

  const advance = await EmployeeAdvance.create({
    employeeId: req.body.employeeId,
    advanceDate: req.body.advanceDate,
    amount: req.body.amount,
    givenBy: req.body.givenBy,
    paymentMode: req.body.paymentMode,
    reason: req.body.reason || null,
    salaryPeriodMonth: req.body.salaryPeriodMonth,
    salaryPeriodYear: req.body.salaryPeriodYear,
    status: 'pending',
  });

  const full = await EmployeeAdvance.findByPk(advance.id, {
    include: [
      { model: Employee, as: 'employee', attributes: ['id', 'name', 'mobile', 'employeeType'] },
    ],
  });

  res.status(201).json({ success: true, data: formatAdvance(full) });
};

export const updateEmployeeAdvance = async (req, res) => {
  const advance = await EmployeeAdvance.findByPk(req.params.id);
  if (!advance) {
    return res.status(404).json({ success: false, message: 'Advance not found' });
  }
  if (advance.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'Only pending advances can be updated',
    });
  }

  const fields = [
    'employeeId',
    'advanceDate',
    'amount',
    'givenBy',
    'paymentMode',
    'reason',
    'salaryPeriodMonth',
    'salaryPeriodYear',
  ];

  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      advance[field] = req.body[field] === '' ? null : req.body[field];
    }
  });

  await advance.save();

  const full = await EmployeeAdvance.findByPk(advance.id, {
    include: [
      { model: Employee, as: 'employee', attributes: ['id', 'name', 'mobile', 'employeeType'] },
    ],
  });

  res.json({ success: true, data: formatAdvance(full) });
};

export const deleteEmployeeAdvance = async (req, res) => {
  const advance = await EmployeeAdvance.findByPk(req.params.id);
  if (!advance) {
    return res.status(404).json({ success: false, message: 'Advance not found' });
  }
  if (advance.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'Only pending advances can be deleted',
    });
  }

  await advance.destroy();
  res.json({ success: true, message: 'Advance deleted' });
};

export const getEmployeeSalarySummary = async (req, res) => {
  const { month, year, employeeType } = req.query;

  const employeeWhere = {
    grossSalary: { [Op.ne]: null },
    status: 'active',
  };
  if (employeeType && employeeType !== 'all') {
    employeeWhere.employeeType = employeeType;
  }

  const employees = await Employee.findAll({
    where: employeeWhere,
    order: [['name', 'ASC']],
  });

  const withSalary = employees.filter((e) => Number(e.grossSalary) > 0);

  const advances = await EmployeeAdvance.findAll({
    where: {
      salaryPeriodMonth: month,
      salaryPeriodYear: year,
      status: 'pending',
    },
  });

  const byEmployee = new Map();
  advances.forEach((a) => {
    const list = byEmployee.get(a.employeeId) || [];
    list.push(a.get({ plain: true }));
    byEmployee.set(a.employeeId, list);
  });

  const data = withSalary.map((employee) => {
    const plain = employee.get({ plain: true });
    const row = buildSalarySummaryRow(
      {
        id: plain.id,
        name: plain.name,
        mobile: plain.mobile,
        grossSalary: plain.grossSalary,
      },
      byEmployee.get(plain.id) || [],
      'employeeId'
    );
    return {
      ...row,
      employeeName: plain.name,
      employeeType: plain.employeeType,
    };
  });

  res.json({ success: true, data });
};

export const processEmployeeSalary = async (req, res) => {
  const { employeeIds, month, year } = req.body;

  const [updated] = await EmployeeAdvance.update(
    { status: 'deducted' },
    {
      where: {
        employeeId: { [Op.in]: employeeIds },
        salaryPeriodMonth: month,
        salaryPeriodYear: year,
        status: 'pending',
      },
    }
  );

  res.json({
    success: true,
    message: `Processed ${updated} advance record(s)`,
    data: { processedCount: updated },
  });
};
