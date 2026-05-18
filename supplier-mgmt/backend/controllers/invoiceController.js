import { Op } from 'sequelize';
import {
  Company,
  Driver,
  EodEntry,
  Invoice,
  InvoiceItem,
  JobAssignment,
  JobType,
  Payment,
  Site,
  Vehicle,
  sequelize,
} from '../models/index.js';
import { calculateEodTotal } from '../utils/eodCalculations.js';
import { calculateInvoiceTotals } from '../utils/invoiceCalculations.js';
import { generateInvoiceNumber } from '../utils/invoiceNumber.js';
import { generateInvoicePdf } from '../utils/invoicePdf.js';

const siteLabel = (site, assignment, field) => {
  if (site?.siteName) return site.siteName;
  if (field === 'from' && assignment?.fromSiteTemp) return assignment.fromSiteTemp;
  if (field === 'to' && assignment?.toSiteTemp) return assignment.toSiteTemp;
  return '—';
};

const driverLabel = (driver, assignment) =>
  driver?.name || assignment?.outsideDriverName || '—';

const vehicleLabel = (vehicle, assignment) =>
  vehicle?.vehicleNumber || assignment?.outsideDriverVehicle || '—';

const billToParty = (plain) => {
  if (plain.billToName) {
    return {
      companyName: plain.billToName,
      billingAddress: plain.billToAddress || null,
      gstNumber: plain.billToGst || null,
    };
  }
  return plain.company || null;
};

const formatInvoice = (invoice) => {
  const plain = invoice.get ? invoice.get({ plain: true }) : { ...invoice };
  [
    'totalAmount',
    'extraCharges',
    'discount',
    'discountPercent',
    'taxRate',
    'cgstRate',
    'sgstRate',
    'taxAmount',
    'cgstAmount',
    'sgstAmount',
    'grandTotal',
  ].forEach((f) => {
    if (plain[f] != null) plain[f] = Number(plain[f]);
  });
  if (plain.payments) {
    plain.payments = plain.payments.map((p) => ({
      ...p,
      amount: Number(p.amount),
    }));
  }
  if (plain.items) {
    plain.items = plain.items.map((item) => ({
      ...item,
      ratePerTrip: Number(item.ratePerTrip),
      amount: Number(item.amount),
    }));
  }
  plain.taxableAmount =
    plain.totalAmount + plain.extraCharges - plain.discount;
  plain.billToLabel = plain.billToName || plain.company?.companyName || '—';
  plain.billToParty = billToParty(plain);
  return plain;
};

const eodInclude = [
  { model: JobType, as: 'jobType', attributes: ['id', 'name'] },
  { model: Vehicle, as: 'vehicle', attributes: ['id', 'vehicleNumber'] },
  { model: Driver, as: 'driver', attributes: ['id', 'name'] },
  { model: Site, as: 'fromSite', attributes: ['id', 'siteName'] },
  { model: Site, as: 'toSite', attributes: ['id', 'siteName'] },
  {
    model: JobAssignment,
    as: 'assignment',
    attributes: ['id', 'fromSiteTemp', 'toSiteTemp', 'outsideDriverName', 'outsideDriverVehicle'],
  },
];

export const getPendingEod = async (req, res) => {
  const { from, to } = req.query;

  const entries = await EodEntry.findAll({
    where: {
      date: { [Op.between]: [from, to] },
      billingStatus: 'pending',
      approvedBy: { [Op.ne]: null },
    },
    include: eodInclude,
    order: [['date', 'ASC']],
  });

  res.json({
    success: true,
    data: entries.map((e) => {
      const plain = e.get({ plain: true });
      return {
        id: plain.id,
        date: plain.date,
        jobType: plain.jobType?.name,
        vehicleNumber: vehicleLabel(plain.vehicle, plain.assignment),
        driverName: driverLabel(plain.driver, plain.assignment),
        fromSite: siteLabel(plain.fromSite, plain.assignment, 'from'),
        toSite: siteLabel(plain.toSite, plain.assignment, 'to'),
        actualTrips: plain.actualTrips,
        ratePerTrip: plain.ratePerTrip != null ? Number(plain.ratePerTrip) : null,
        extraCharges: plain.extraCharges != null ? Number(plain.extraCharges) : 0,
        deductions: plain.deductions != null ? Number(plain.deductions) : 0,
        amount: Number(plain.totalAmount),
      };
    }),
  });
};

export const listInvoices = async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const { companyId, paymentStatus, from, to } = req.query;

  const where = { paymentStatus: { [Op.ne]: 'cancelled' } };
  if (companyId) where.companyId = companyId;
  if (paymentStatus && paymentStatus !== 'all') where.paymentStatus = paymentStatus;
  if (from && to) {
    where.invoiceDate = { [Op.between]: [from, to] };
  } else if (from) {
    where.invoiceDate = { [Op.gte]: from };
  } else if (to) {
    where.invoiceDate = { [Op.lte]: to };
  }

  const { count, rows } = await Invoice.findAndCountAll({
    where,
    include: [
      { model: Company, as: 'company', attributes: ['id', 'companyName'] },
      { model: Company, as: 'issuerCompany', attributes: ['id', 'companyName'] },
    ],
    order: [['invoiceDate', 'DESC'], ['id', 'DESC']],
    limit,
    offset,
  });

  res.json({
    success: true,
    data: rows.map(formatInvoice),
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit) || 1,
    },
  });
};

export const getInvoice = async (req, res) => {
  const invoice = await Invoice.findByPk(req.params.id, {
    include: [
      { model: Company, as: 'company' },
      { model: Company, as: 'issuerCompany' },
      {
        model: InvoiceItem,
        as: 'items',
        separate: true,
        order: [['lineDate', 'ASC']],
      },
      {
        model: Payment,
        as: 'payments',
        separate: true,
        order: [['paymentDate', 'DESC']],
      },
    ],
  });

  if (!invoice) {
    return res.status(404).json({ success: false, message: 'Invoice not found' });
  }

  res.json({ success: true, data: formatInvoice(invoice) });
};

export const createInvoice = async (req, res) => {
  const {
    billToName,
    billToAddress,
    billToGst,
    issuerCompanyId,
    billingPeriodFrom,
    billingPeriodTo,
    eodEntryIds,
    subtotal: subtotalOverride,
    extraCharges = 0,
    discount = 0,
    discountPercent,
    cgstRate = 0,
    sgstRate = 0,
    notes,
    lineItems = [],
  } = req.body;

  const issuerCompany = await Company.findByPk(issuerCompanyId);
  if (!issuerCompany) {
    return res.status(400).json({ success: false, message: 'Invalid bill-from company' });
  }

  const entries = await EodEntry.findAll({
    where: {
      id: { [Op.in]: eodEntryIds },
      billingStatus: 'pending',
      approvedBy: { [Op.ne]: null },
    },
    include: eodInclude,
  });

  if (entries.length !== eodEntryIds.length) {
    return res.status(400).json({
      success: false,
      message: 'One or more EOD entries are invalid or already invoiced',
    });
  }

  const lineByEntryId = new Map(
    (Array.isArray(lineItems) ? lineItems : []).map((li) => [Number(li.eodEntryId), li])
  );

  for (const entry of entries) {
    const override = lineByEntryId.get(entry.id);
    if (!override) continue;

    const ratePerTrip =
      override.ratePerTrip != null && override.ratePerTrip !== ''
        ? Number(override.ratePerTrip)
        : null;

    entry.ratePerTrip = ratePerTrip;
    entry.totalAmount =
      override.amount != null && override.amount !== ''
        ? Number(override.amount)
        : calculateEodTotal({
            actualTrips: entry.actualTrips,
            ratePerTrip: ratePerTrip ?? 0,
            extraCharges: entry.extraCharges,
            deductions: entry.deductions,
          });
  }

  const entriesSubtotal = entries.reduce((s, e) => s + Number(e.totalAmount), 0);
  const subtotal =
    subtotalOverride != null && subtotalOverride !== ''
      ? Number(subtotalOverride)
      : entriesSubtotal;
  const discPct =
    discountPercent != null
      ? Number(discountPercent)
      : subtotal > 0
        ? (Number(discount) / subtotal) * 100
        : 0;

  const totals = calculateInvoiceTotals({
    subtotal,
    extraCharges,
    discountPercent: discPct,
    cgstRate,
    sgstRate,
  });

  const invoiceDate = new Date().toISOString().slice(0, 10);
  const invoiceNumber = await generateInvoiceNumber(invoiceDate);
  const totalTrips = entries.reduce((s, e) => s + (e.actualTrips || 0), 0);

  const t = await sequelize.transaction();

  try {
    const invoice = await Invoice.create(
      {
        invoiceNumber,
        invoiceDate,
        companyId: null,
        billToName: billToName.trim(),
        billToAddress: billToAddress?.trim() || null,
        billToGst: billToGst?.trim() || null,
        issuerCompanyId,
        billingPeriodFrom,
        billingPeriodTo,
        totalTrips,
        totalAmount: totals.totalAmount,
        extraCharges: totals.extraCharges,
        discount: totals.discount,
        discountPercent: totals.discountPercent,
        taxRate: totals.taxRate,
        cgstRate: totals.cgstRate,
        sgstRate: totals.sgstRate,
        taxAmount: totals.taxAmount,
        cgstAmount: totals.cgstAmount,
        sgstAmount: totals.sgstAmount,
        grandTotal: totals.grandTotal,
        paymentStatus: 'draft',
        notes: notes || null,
      },
      { transaction: t }
    );

    for (const entry of entries) {
      await entry.save({ transaction: t });
    }

    const items = entries.map((entry) => {
      const plain = entry.get({ plain: true });
      return {
        invoiceId: invoice.id,
        eodEntryId: plain.id,
        lineDate: plain.date,
        jobTypeName: plain.jobType?.name || '—',
        vehicleNumber: vehicleLabel(plain.vehicle, plain.assignment),
        driverName: driverLabel(plain.driver, plain.assignment),
        fromSite: siteLabel(plain.fromSite, plain.assignment, 'from'),
        toSite: siteLabel(plain.toSite, plain.assignment, 'to'),
        actualTrips: plain.actualTrips,
        ratePerTrip: plain.ratePerTrip ?? 0,
        amount: plain.totalAmount,
      };
    });

    await InvoiceItem.bulkCreate(items, { transaction: t });

    await EodEntry.update(
      { billingStatus: 'invoiced' },
      { where: { id: { [Op.in]: eodEntryIds } }, transaction: t }
    );

    await t.commit();

    const full = await Invoice.findByPk(invoice.id, {
      include: [
        { model: Company, as: 'company' },
        { model: Company, as: 'issuerCompany' },
        { model: InvoiceItem, as: 'items' },
        { model: Payment, as: 'payments' },
      ],
    });

    res.status(201).json({ success: true, data: formatInvoice(full) });
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

export const updateInvoiceStatus = async (req, res) => {
  const { status } = req.body;
  const allowed = ['generated', 'sent'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  const invoice = await Invoice.findByPk(req.params.id);
  if (!invoice) {
    return res.status(404).json({ success: false, message: 'Invoice not found' });
  }

  if (['paid', 'partially_paid', 'cancelled'].includes(invoice.paymentStatus)) {
    return res.status(400).json({
      success: false,
      message: 'Cannot change status of paid or cancelled invoice',
    });
  }

  invoice.paymentStatus = status;
  await invoice.save();

  const full = await Invoice.findByPk(invoice.id, {
    include: [
      { model: Company, as: 'company' },
      { model: Company, as: 'issuerCompany' },
      { model: InvoiceItem, as: 'items' },
      { model: Payment, as: 'payments' },
    ],
  });

  res.json({ success: true, data: formatInvoice(full) });
};

export const cancelInvoice = async (req, res) => {
  const invoice = await Invoice.findByPk(req.params.id, {
    include: [{ model: InvoiceItem, as: 'items' }],
  });

  if (!invoice) {
    return res.status(404).json({ success: false, message: 'Invoice not found' });
  }

  if (['paid', 'partially_paid'].includes(invoice.paymentStatus)) {
    return res.status(400).json({
      success: false,
      message: 'Cannot cancel invoice with payments recorded',
    });
  }

  const eodIds = (invoice.items || []).map((i) => i.eodEntryId);
  const t = await sequelize.transaction();

  try {
    invoice.paymentStatus = 'cancelled';
    await invoice.save({ transaction: t });

    if (eodIds.length) {
      await EodEntry.update(
        { billingStatus: 'pending' },
        { where: { id: { [Op.in]: eodIds } }, transaction: t }
      );
    }

    await t.commit();
    res.json({ success: true, message: 'Invoice cancelled' });
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

export const getOutstanding = async (_req, res) => {
  const invoices = await Invoice.findAll({
    where: { paymentStatus: { [Op.notIn]: ['cancelled', 'draft'] } },
    include: [
      { model: Company, as: 'company', attributes: ['id', 'companyName'] },
      { model: Payment, as: 'payments', attributes: ['amount'] },
    ],
  });

  const byCompany = new Map();

  for (const inv of invoices) {
    const plain = formatInvoice(inv);
    const cid = plain.billToLabel || plain.companyId || 'unknown';
    if (!byCompany.has(cid)) {
      byCompany.set(cid, {
        companyId: plain.companyId,
        companyName: plain.billToLabel || plain.company?.companyName || '—',
        totalInvoiced: 0,
        totalPaid: 0,
        outstanding: 0,
      });
    }
    const row = byCompany.get(cid);
    row.totalInvoiced += plain.grandTotal;
    const paid = (plain.payments || []).reduce((s, p) => s + p.amount, 0);
    row.totalPaid += paid;
  }

  const data = Array.from(byCompany.values()).map((row) => ({
    ...row,
    totalInvoiced: Number(row.totalInvoiced.toFixed(2)),
    totalPaid: Number(row.totalPaid.toFixed(2)),
    outstanding: Number((row.totalInvoiced - row.totalPaid).toFixed(2)),
  }));

  data.sort((a, b) => b.outstanding - a.outstanding);

  res.json({ success: true, data });
};

export const downloadInvoicePdf = async (req, res) => {
  const invoice = await Invoice.findByPk(req.params.id, {
    include: [
      { model: Company, as: 'company' },
      { model: Company, as: 'issuerCompany' },
      { model: InvoiceItem, as: 'items', order: [['lineDate', 'ASC']] },
      { model: Payment, as: 'payments' },
    ],
  });

  if (!invoice) {
    return res.status(404).json({ success: false, message: 'Invoice not found' });
  }

  const plain = formatInvoice(invoice);
  const pdf = await generateInvoicePdf({
    invoice: plain,
    company: plain.billToParty,
    issuerCompany: plain.issuerCompany,
    items: plain.items || [],
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${plain.invoiceNumber}.pdf"`
  );
  res.send(pdf);
};
