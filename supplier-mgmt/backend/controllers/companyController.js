import { Op } from 'sequelize';
import {
  Company,
  CompanyJobRate,
  JobType,
} from '../models/index.js';
import { formatRate, RATE_TYPE_LABELS } from '../utils/companyRates.js';

const formatCompany = (company) => {
  const plain = company.get ? company.get({ plain: true }) : company;
  return plain;
};

export const listCompanies = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 10));
  const offset = (page - 1) * limit;
  const { search, status } = req.query;

  const where = {};
  if (status && status !== 'all') where.status = status;
  if (search) {
    where[Op.or] = [
      { companyName: { [Op.like]: `%${search}%` } },
      { contactPerson: { [Op.like]: `%${search}%` } },
      { mobile: { [Op.like]: `%${search}%` } },
      { gstNumber: { [Op.like]: `%${search}%` } },
    ];
  }

  const { count, rows } = await Company.findAndCountAll({
    where,
    order: [['companyName', 'ASC']],
    limit,
    offset,
  });

  res.json({
    success: true,
    data: rows.map(formatCompany),
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit) || 1,
    },
  });
};

export const createCompany = async (req, res) => {
  const company = await Company.create({
    companyName: req.body.companyName,
    contactPerson: req.body.contactPerson,
    mobile: req.body.mobile,
    email: req.body.email || null,
    billingAddress: req.body.billingAddress || null,
    gstNumber: req.body.gstNumber || null,
    paymentTerms: req.body.paymentTerms || null,
    bankAccountNumber: req.body.bankAccountNumber || null,
    bankIfscCode: req.body.bankIfscCode || null,
    bankAccountHolderName: req.body.bankAccountHolderName || null,
    status: req.body.status || 'active',
    notes: req.body.notes || null,
  });

  res.status(201).json({ success: true, data: formatCompany(company) });
};

export const getCompany = async (req, res) => {
  const company = await Company.findByPk(req.params.id);

  if (!company) {
    return res.status(404).json({ success: false, message: 'Company not found' });
  }

  const rates = await CompanyJobRate.findAll({
    where: { companyId: company.id },
    include: [{ model: JobType, as: 'jobType', attributes: ['id', 'name'] }],
    order: [['effectiveFrom', 'DESC']],
  });

  const plain = formatCompany(company);
  plain.jobRates = rates.map((r) => formatRate(r));

  res.json({ success: true, data: plain });
};

export const updateCompany = async (req, res) => {
  const company = await Company.findByPk(req.params.id);
  if (!company) {
    return res.status(404).json({ success: false, message: 'Company not found' });
  }

  const fields = [
    'companyName',
    'contactPerson',
    'mobile',
    'email',
    'billingAddress',
    'gstNumber',
    'paymentTerms',
    'bankAccountNumber',
    'bankIfscCode',
    'bankAccountHolderName',
    'status',
    'notes',
  ];

  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      company[field] = req.body[field] === '' ? null : req.body[field];
    }
  });

  await company.save();
  res.json({ success: true, data: formatCompany(company) });
};

export const deleteCompany = async (req, res) => {
  const company = await Company.findByPk(req.params.id);
  if (!company) {
    return res.status(404).json({ success: false, message: 'Company not found' });
  }

  await company.destroy();
  res.json({ success: true, message: 'Company deleted' });
};

export const listRates = async (req, res) => {
  const company = await Company.findByPk(req.params.id);
  if (!company) {
    return res.status(404).json({ success: false, message: 'Company not found' });
  }

  const rates = await CompanyJobRate.findAll({
    where: { companyId: req.params.id },
    include: [{ model: JobType, as: 'jobType', attributes: ['id', 'name'] }],
    order: [['effectiveFrom', 'DESC']],
  });

  res.json({
    success: true,
    data: rates.map((r) => formatRate(r)),
  });
};

export const createRate = async (req, res) => {
  const company = await Company.findByPk(req.params.id);
  if (!company) {
    return res.status(404).json({ success: false, message: 'Company not found' });
  }

  const jobType = await JobType.findByPk(req.body.jobTypeId);
  if (!jobType) {
    return res.status(400).json({ success: false, message: 'Invalid job type' });
  }

  const rate = await CompanyJobRate.create({
    companyId: company.id,
    jobTypeId: req.body.jobTypeId,
    vehicleType: req.body.vehicleType || null,
    rateType: req.body.rateType,
    rateAmount: req.body.rateAmount,
    effectiveFrom: req.body.effectiveFrom,
    effectiveTo: req.body.effectiveTo || null,
  });

  const withJobType = await CompanyJobRate.findByPk(rate.id, {
    include: [{ model: JobType, as: 'jobType', attributes: ['id', 'name'] }],
  });

  res.status(201).json({ success: true, data: formatRate(withJobType) });
};

export const updateRate = async (req, res) => {
  const rate = await CompanyJobRate.findOne({
    where: { id: req.params.rateId, companyId: req.params.id },
  });

  if (!rate) {
    return res.status(404).json({ success: false, message: 'Rate not found' });
  }

  const fields = ['jobTypeId', 'vehicleType', 'rateType', 'rateAmount', 'effectiveFrom', 'effectiveTo'];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      rate[field] = req.body[field] === '' ? null : req.body[field];
    }
  });

  await rate.save();

  const withJobType = await CompanyJobRate.findByPk(rate.id, {
    include: [{ model: JobType, as: 'jobType', attributes: ['id', 'name'] }],
  });

  res.json({ success: true, data: formatRate(withJobType) });
};

export const deleteRate = async (req, res) => {
  const rate = await CompanyJobRate.findOne({
    where: { id: req.params.rateId, companyId: req.params.id },
  });

  if (!rate) {
    return res.status(404).json({ success: false, message: 'Rate not found' });
  }

  await rate.destroy();
  res.json({ success: true, message: 'Rate deleted' });
};
