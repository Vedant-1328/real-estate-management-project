import { Op } from 'sequelize';
import {
  Company,
  CompanyJobRate,
  EodEntry,
  Invoice,
  InvoiceItem,
  JobAssignment,
  JobType,
  Payment,
  Site,
  sequelize,
} from '../models/index.js';
import { formatRate, RATE_TYPE_LABELS } from '../utils/companyRates.js';
import { hardDestroy, hardDestroyWhere } from '../utils/hardDestroy.js';
import { isFieldEncryptionEnabled } from '../utils/fieldEncryption.js';

const formatCompany = (company) => {
  const plain = company.get ? company.get({ plain: true }) : company;
  return plain;
};

export const listCompanies = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 10));
  const offset = (page - 1) * limit;
  const { search, status, companyType } = req.query;

  const where = {};
  if (status && status !== 'all') where.status = status;
  if (companyType && companyType !== 'all') where.companyType = companyType;
  if (search) {
    const term = `%${search}%`;
    if (isFieldEncryptionEnabled()) {
      where.companyName = { [Op.like]: term };
    } else {
      where[Op.or] = [
        { companyName: { [Op.like]: term } },
        { contactPerson: { [Op.like]: term } },
        { mobile: { [Op.like]: term } },
        { gstNumber: { [Op.like]: term } },
      ];
    }
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
    companyType: req.body.companyType || 'customer',
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
    'companyType',
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

const companyUsageCounts = async (companyId) => {
  const [sites, assignments, eodEntries, billedInvoices, issuedInvoices] = await Promise.all([
    Site.count({ where: { companyId } }),
    JobAssignment.count({ where: { companyId } }),
    EodEntry.count({ where: { companyId } }),
    Invoice.count({ where: { companyId } }),
    Invoice.count({ where: { issuerCompanyId: companyId } }),
  ]);

  return { sites, assignments, eodEntries, billedInvoices, issuedInvoices };
};

const deleteInvoicesForCompany = async (companyId, transaction) => {
  const invoices = await Invoice.findAll({
    where: {
      [Op.or]: [{ companyId }, { issuerCompanyId: companyId }],
    },
    include: [{ model: InvoiceItem, as: 'items' }],
    transaction,
  });

  for (const invoice of invoices) {
    await hardDestroyWhere(Payment, { invoiceId: invoice.id }, { transaction });
    await hardDestroyWhere(InvoiceItem, { invoiceId: invoice.id }, { transaction });
    await hardDestroy(invoice, { transaction });
  }

  return invoices.length;
};

const deleteEodEntriesForCompany = async (companyId, transaction) => {
  const entries = await EodEntry.findAll({
    where: { companyId },
    transaction,
  });

  for (const entry of entries) {
    const assignmentId = entry.assignmentId;
    await hardDestroy(entry, { transaction });
    if (assignmentId) {
      const stub = await JobAssignment.findOne({
        where: { id: assignmentId, status: 'completed', companyId },
        transaction,
      });
      if (stub) {
        await hardDestroy(stub, { transaction });
      }
    }
  }

  return entries.length;
};

const cascadeDeleteCompany = async (companyId) => {
  const t = await sequelize.transaction();
  try {
    const invoiceCount = await deleteInvoicesForCompany(companyId, t);
    const eodCount = await deleteEodEntriesForCompany(companyId, t);
    const assignmentCount = await JobAssignment.destroy({
      where: { companyId },
      force: true,
      transaction: t,
    });
    const siteCount = await Site.destroy({
      where: { companyId },
      force: true,
      transaction: t,
    });
    await hardDestroyWhere(CompanyJobRate, { companyId }, { transaction: t });

    const company = await Company.findByPk(companyId, { transaction: t });
    if (!company) {
      await t.rollback();
      return null;
    }
    await hardDestroy(company, { transaction: t });

    await t.commit();
    return { invoiceCount, eodCount, assignmentCount, siteCount };
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

export const deleteCompany = async (req, res) => {
  const company = await Company.findByPk(req.params.id);
  if (!company) {
    return res.status(404).json({ success: false, message: 'Company not found' });
  }

  const usage = await companyUsageCounts(company.id);
  const hasLinked =
    usage.sites > 0 ||
    usage.assignments > 0 ||
    usage.eodEntries > 0 ||
    usage.billedInvoices > 0 ||
    usage.issuedInvoices > 0;

  const cascade = req.query.cascade === 'true' || req.query.cascade === '1';
  if (hasLinked && !cascade) {
    const blockers = [];
    if (usage.sites > 0) blockers.push(`${usage.sites} site(s)`);
    if (usage.assignments > 0) blockers.push(`${usage.assignments} job assignment(s)`);
    if (usage.eodEntries > 0) blockers.push(`${usage.eodEntries} EOD entry(ies)`);
    if (usage.billedInvoices > 0) {
      blockers.push(`${usage.billedInvoices} invoice(s) billed to this company`);
    }
    if (usage.issuedInvoices > 0) {
      blockers.push(`${usage.issuedInvoices} invoice(s) issued by this company`);
    }
    return res.status(409).json({
      success: false,
      message: `This company is linked to ${blockers.join(', ')}. Confirm delete with cascade to remove the company and all related data.`,
      linked: usage,
    });
  }

  let summary;
  if (hasLinked) {
    summary = await cascadeDeleteCompany(company.id);
  } else {
    await hardDestroyWhere(CompanyJobRate, { companyId: company.id });
    await hardDestroy(company);
    summary = {};
  }

  if (summary === null) {
    return res.status(404).json({ success: false, message: 'Company not found' });
  }

  const parts = [];
  if (summary.siteCount) parts.push(`${summary.siteCount} site(s)`);
  if (summary.assignmentCount) parts.push(`${summary.assignmentCount} job assignment(s)`);
  if (summary.eodCount) parts.push(`${summary.eodCount} EOD entry(ies)`);
  if (summary.invoiceCount) parts.push(`${summary.invoiceCount} invoice(s)`);

  res.json({
    success: true,
    message:
      parts.length > 0
        ? `Company deleted along with ${parts.join(', ')}`
        : 'Company deleted',
  });
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
  if (company.companyType !== 'customer') {
    return res.status(400).json({
      success: false,
      message: 'Job rates can only be added to customer companies',
    });
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

  await hardDestroy(rate);
  res.json({ success: true, message: 'Rate deleted' });
};
