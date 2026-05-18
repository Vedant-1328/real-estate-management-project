import { Op } from 'sequelize';
import { Driver, DriverAdvance } from '../models/index.js';
import { buildSalarySummaryRow } from '../utils/salaryAdvanceSummary.js';

const formatAdvance = (row) => {
  const plain = row.get ? row.get({ plain: true }) : { ...row };
  plain.amount = Number(plain.amount);
  plain.driverName = plain.driver?.name;
  return plain;
};

export const listDriverAdvances = async (req, res) => {
  const { driverId, month, year, status, search } = req.query;
  const where = {};

  if (driverId) where.driverId = driverId;
  if (month) where.salaryPeriodMonth = month;
  if (year) where.salaryPeriodYear = year;
  if (status && status !== 'all') where.status = status;

  const driverWhere = {};
  if (search) {
    driverWhere[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { mobile: { [Op.like]: `%${search}%` } },
    ];
  }

  const rows = await DriverAdvance.findAll({
    where,
    include: [
      {
        model: Driver,
        as: 'driver',
        attributes: ['id', 'name', 'mobile'],
        where: Object.keys(driverWhere).length ? driverWhere : undefined,
        required: Boolean(search),
      },
    ],
    order: [
      ['advanceDate', 'DESC'],
      ['id', 'DESC'],
    ],
  });

  res.json({ success: true, data: rows.map(formatAdvance) });
};

export const createDriverAdvance = async (req, res) => {
  const driver = await Driver.findByPk(req.body.driverId);
  if (!driver) {
    return res.status(400).json({ success: false, message: 'Invalid driver' });
  }

  const advance = await DriverAdvance.create({
    driverId: req.body.driverId,
    advanceDate: req.body.advanceDate,
    amount: req.body.amount,
    givenBy: req.body.givenBy,
    paymentMode: req.body.paymentMode,
    reason: req.body.reason || null,
    salaryPeriodMonth: req.body.salaryPeriodMonth,
    salaryPeriodYear: req.body.salaryPeriodYear,
    status: 'pending',
  });

  const full = await DriverAdvance.findByPk(advance.id, {
    include: [{ model: Driver, as: 'driver', attributes: ['id', 'name', 'mobile'] }],
  });

  res.status(201).json({ success: true, data: formatAdvance(full) });
};

export const updateDriverAdvance = async (req, res) => {
  const advance = await DriverAdvance.findByPk(req.params.id);
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
    'driverId',
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

  const full = await DriverAdvance.findByPk(advance.id, {
    include: [{ model: Driver, as: 'driver', attributes: ['id', 'name', 'mobile'] }],
  });

  res.json({ success: true, data: formatAdvance(full) });
};

export const deleteDriverAdvance = async (req, res) => {
  const advance = await DriverAdvance.findByPk(req.params.id);
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

export const getDriverSalarySummary = async (req, res) => {
  const { month, year } = req.query;

  const drivers = await Driver.findAll({
    where: {
      grossSalary: { [Op.ne]: null },
      status: 'available',
    },
    order: [['name', 'ASC']],
  });

  const withSalary = drivers.filter((d) => Number(d.grossSalary) > 0);

  const advances = await DriverAdvance.findAll({
    where: {
      salaryPeriodMonth: month,
      salaryPeriodYear: year,
      status: 'pending',
    },
  });

  const byDriver = new Map();
  advances.forEach((a) => {
    const list = byDriver.get(a.driverId) || [];
    list.push(a.get({ plain: true }));
    byDriver.set(a.driverId, list);
  });

  const data = withSalary.map((driver) => {
    const plain = driver.get({ plain: true });
    const row = buildSalarySummaryRow(
      { id: plain.id, name: plain.name, mobile: plain.mobile, grossSalary: plain.grossSalary },
      byDriver.get(plain.id) || [],
      'driverId'
    );
    return row;
  });

  res.json({ success: true, data });
};

export const processDriverSalary = async (req, res) => {
  const { driverIds, month, year } = req.body;

  const [updated] = await DriverAdvance.update(
    { status: 'deducted' },
    {
      where: {
        driverId: { [Op.in]: driverIds },
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
