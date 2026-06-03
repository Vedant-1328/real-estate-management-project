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
import { calculateEodTotal, isOutsideEodEntry } from '../utils/eodCalculations.js';
import { calculateInvoiceTotals } from '../utils/invoiceCalculations.js';
import { generateInvoiceNumber } from '../utils/invoiceNumber.js';
import { sortInvoiceItemsByDate } from '../utils/encryptedAggregates.js';
import { generateInvoicePdf } from '../utils/invoicePdf.js';
import { hardDestroy, hardDestroyWhere } from '../utils/hardDestroy.js';

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

const sanitizeDateOnly = (value) => {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  if (/^invalid/i.test(s)) return null;
  return s.length >= 10 ? s.slice(0, 10) : s;
};

const formatInvoice = (invoice) => {
  const plain = invoice.get ? invoice.get({ plain: true }) : { ...invoice };
  plain.billingPeriodFrom = sanitizeDateOnly(plain.billingPeriodFrom);
  plain.billingPeriodTo = sanitizeDateOnly(plain.billingPeriodTo);
  [
    'totalTrips',
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
    plain.items = sortInvoiceItemsByDate(
      plain.items.map((item) => ({
        ...item,
        lineDate: sanitizeDateOnly(item.lineDate) ?? item.lineDate,
        ratePerTrip: Number(item.ratePerTrip),
        amount: Number(item.amount),
      }))
    );
  }
  plain.taxableAmount =
    plain.totalAmount + plain.extraCharges - plain.discount;
  plain.billToLabel = plain.billToName || plain.company?.companyName || '—';
  plain.billToParty = billToParty(plain);
  return plain;
};

const eodInclude = [
  { model: Company, as: 'company', attributes: ['id', 'companyName'] },
  { model: JobType, as: 'jobType', attributes: ['id', 'name'] },
  { model: Vehicle, as: 'vehicle', attributes: ['id', 'vehicleNumber'] },
  { model: Driver, as: 'driver', attributes: ['id', 'name'] },
  { model: Site, as: 'fromSite', attributes: ['id', 'siteName', 'companyId'] },
  { model: Site, as: 'toSite', attributes: ['id', 'siteName', 'companyId'] },
  {
    model: JobAssignment,
    as: 'assignment',
    attributes: [
      'id',
      'companyId',
      'fromSiteTemp',
      'toSiteTemp',
      'outsideDriverName',
      'outsideDriverVehicle',
    ],
  },
];

/** Effective billing customer for an EOD row (entry FK or linked sites/assignment). */
const effectiveEodCompanyId = (plain) => {
  const n = (v) => (v != null && v !== '' ? Number(v) : null);
  return (
    n(plain.companyId) ??
    n(plain.fromSite?.companyId) ??
    n(plain.toSite?.companyId) ??
    n(plain.assignment?.companyId) ??
    null
  );
};

export const getPendingEod = async (req, res) => {
  const { from, to, companyId } = req.query;

  const where = {
    billingStatus: 'pending',
  };

  if (from && to) {
    where.date = { [Op.between]: [from, to] };
  } else if (from) {
    where.date = { [Op.gte]: from };
  } else if (to) {
    where.date = { [Op.lte]: to };
  }

  const entries = await EodEntry.findAll({
    where,
    include: eodInclude,
    order: [['date', 'ASC']],
    subQuery: false,
  });

  const customerId = companyId ? Number(companyId) : null;
  const filtered = customerId
    ? entries.filter((e) => effectiveEodCompanyId(e.get({ plain: true })) === customerId)
    : entries;

  res.json({
    success: true,
    data: filtered.map((e) => {
      const plain = e.get({ plain: true });
      const linkedCompanyId = effectiveEodCompanyId(plain);
      return {
        id: plain.id,
        date: plain.date,
        linkedCompany: plain.company?.companyName || (linkedCompanyId ? `Company #${linkedCompanyId}` : '—'),
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
        isOutsideDriver: isOutsideEodEntry(plain),
        isApproved: Boolean(plain.approvedBy),
      };
    }),
  });
};

export const listInvoices = async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const { companyId, paymentStatus, from, to } = req.query;

  const where = {};
  if (paymentStatus && paymentStatus !== 'all') {
    where.paymentStatus = paymentStatus;
  } else {
    where.paymentStatus = { [Op.ne]: 'cancelled' };
  }
  if (from && to) {
    where.invoiceDate = { [Op.between]: [from, to] };
  } else if (from) {
    where.invoiceDate = { [Op.gte]: from };
  } else if (to) {
    where.invoiceDate = { [Op.lte]: to };
  }

  const queryLimit = companyId ? Math.max(limit * 5, 100) : limit;
  const queryOffset = companyId ? 0 : offset;

  let { count, rows } = await Invoice.findAndCountAll({
    where,
    include: [
      { model: Company, as: 'company', attributes: ['id', 'companyName'] },
      { model: Company, as: 'issuerCompany', attributes: ['id', 'companyName'] },
    ],
    order: [['invoiceDate', 'DESC'], ['id', 'DESC']],
    limit: queryLimit,
    offset: queryOffset,
  });

  if (companyId) {
    const company = await Company.findByPk(companyId, { attributes: ['companyName'] });
    const filterName = (company?.companyName || '').trim().toLowerCase();
    const fid = Number(companyId);
    rows = rows.filter((inv) => {
      const plain = inv.get({ plain: true });
      if (plain.companyId === fid) return true;
      const billTo = (plain.billToName || '').trim().toLowerCase();
      if (!filterName || !billTo) return false;
      return billTo === filterName || billTo.includes(filterName) || filterName.includes(billTo);
    });
    count = rows.length;
    rows = rows.slice(offset, offset + limit);
  }

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
    },
    include: eodInclude,
  });

  if (entries.length !== eodEntryIds.length) {
    return res.status(400).json({
      success: false,
      message: 'One or more EOD entries are invalid or already invoiced',
    });
  }

  const entryDates = entries
    .map((e) => String(e.date ?? '').slice(0, 10))
    .filter(Boolean)
    .sort();
  const resolvedBillingPeriodFrom = billingPeriodFrom || entryDates[0] || null;
  const resolvedBillingPeriodTo =
    billingPeriodTo || entryDates[entryDates.length - 1] || null;
  if (!resolvedBillingPeriodFrom || !resolvedBillingPeriodTo) {
    return res.status(400).json({
      success: false,
      message: 'Billing period could not be determined from selected entries',
    });
  }

  // Mark as approved when invoicing if still pending approval (common when the
  // afternoon EOD form was saved without the approve checkbox).
  const now = new Date();
  for (const entry of entries) {
    if (!entry.approvedBy) {
      entry.approvedBy = req.user.id;
      entry.approvalDate = now;
      await entry.save();
    }
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

  let entriesSubtotal = entries.reduce((s, e) => s + Number(e.totalAmount), 0);
  const subtotal =
    subtotalOverride != null && subtotalOverride !== ''
      ? Number(subtotalOverride)
      : entriesSubtotal;

  // If the user typed a subtotal but left per-line amounts at 0 (lump-sum
  // billing), distribute that subtotal across the lines proportionally to
  // actualTrips so the invoice rows match the header total.
  if (subtotal > 0 && entriesSubtotal === 0) {
    const totalTripsForDist = entries.reduce(
      (s, e) => s + (Number(e.actualTrips) || 0),
      0
    );
    if (totalTripsForDist > 0) {
      let allocated = 0;
      entries.forEach((entry, idx) => {
        const trips = Number(entry.actualTrips) || 0;
        const isLast = idx === entries.length - 1;
        const share = isLast
          ? subtotal - allocated
          : Math.round(((subtotal * trips) / totalTripsForDist) * 100) / 100;
        entry.totalAmount = share;
        entry.ratePerTrip = trips > 0 ? Math.round((share / trips) * 100) / 100 : 0;
        allocated += share;
      });
    } else {
      // Fallback: equal split if there are no trips
      const equal = Math.round((subtotal / entries.length) * 100) / 100;
      let allocated = 0;
      entries.forEach((entry, idx) => {
        const isLast = idx === entries.length - 1;
        entry.totalAmount = isLast ? subtotal - allocated : equal;
        entry.ratePerTrip = 0;
        allocated += entry.totalAmount;
      });
    }
    entriesSubtotal = subtotal;
  }

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
        billingPeriodFrom: resolvedBillingPeriodFrom,
        billingPeriodTo: resolvedBillingPeriodTo,
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

    await InvoiceItem.bulkCreate(items, { transaction: t, individualHooks: true });

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

const recalculateInvoicePaymentStatus = async (invoice, transaction) => {
  const payments = await Payment.findAll({
    where: { invoiceId: invoice.id },
    transaction,
  });
  const paid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const grandTotal = Number(invoice.grandTotal);

  if (invoice.paymentStatus === 'cancelled') return;

  if (paid >= grandTotal - 0.005) {
    invoice.paymentStatus = 'paid';
  } else if (paid > 0) {
    invoice.paymentStatus = 'partially_paid';
  } else if (invoice.paymentStatus === 'paid' || invoice.paymentStatus === 'partially_paid') {
    invoice.paymentStatus = 'generated';
  }

  await invoice.save({ transaction });
};

export const updateInvoice = async (req, res) => {
  const {
    billToName,
    billToAddress,
    billToGst,
    issuerCompanyId,
    billingPeriodFrom,
    billingPeriodTo,
    subtotal: subtotalOverride,
    extraCharges = 0,
    discountPercent,
    cgstRate = 0,
    sgstRate = 0,
    notes,
    lineItems = [],
  } = req.body;

  const invoice = await Invoice.findByPk(req.params.id, {
    include: [{ model: InvoiceItem, as: 'items' }],
  });

  if (!invoice) {
    return res.status(404).json({ success: false, message: 'Invoice not found' });
  }

  if (invoice.paymentStatus === 'cancelled') {
    return res.status(400).json({ success: false, message: 'Cannot edit a cancelled invoice' });
  }

  if (invoice.paymentStatus === 'paid') {
    return res.status(400).json({
      success: false,
      message: 'Cannot edit a fully paid invoice',
    });
  }

  const issuerCompany = await Company.findByPk(issuerCompanyId);
  if (!issuerCompany) {
    return res.status(400).json({ success: false, message: 'Invalid bill-from company' });
  }

  const lineById = new Map(
    (Array.isArray(lineItems) ? lineItems : []).map((li) => [Number(li.id), li])
  );

  const items = invoice.items || [];
  if (lineItems.length > 0 && lineItems.length !== items.length) {
    return res.status(400).json({
      success: false,
      message: 'Line items must include every row on this invoice',
    });
  }

  for (const item of items) {
    const override = lineById.get(item.id);
    if (!override) continue;
    if (override.ratePerTrip != null && override.ratePerTrip !== '') {
      item.ratePerTrip = Number(override.ratePerTrip);
    }
    if (override.amount != null && override.amount !== '') {
      item.amount = Number(override.amount);
    }
  }

  let itemsSubtotal = items.reduce((s, i) => s + Number(i.amount), 0);
  const subtotal =
    subtotalOverride != null && subtotalOverride !== ''
      ? Number(subtotalOverride)
      : itemsSubtotal;

  const discPct =
    discountPercent != null
      ? Number(discountPercent)
      : subtotal > 0
        ? (Number(invoice.discount) / subtotal) * 100
        : 0;

  const totals = calculateInvoiceTotals({
    subtotal,
    extraCharges,
    discountPercent: discPct,
    cgstRate,
    sgstRate,
  });

  const payments = await Payment.findAll({ where: { invoiceId: invoice.id } });
  const paidTotal = payments.reduce((s, p) => s + Number(p.amount), 0);
  if (paidTotal > totals.grandTotal + 0.01) {
    return res.status(400).json({
      success: false,
      message: `Grand total cannot be less than amount already paid (${paidTotal.toFixed(2)})`,
    });
  }

  const totalTrips = items.reduce((s, i) => s + (Number(i.actualTrips) || 0), 0);
  const t = await sequelize.transaction();

  try {
    for (const item of items) {
      await item.save({ transaction: t });
      const entry = await EodEntry.findByPk(item.eodEntryId, { transaction: t });
      if (entry) {
        entry.ratePerTrip = item.ratePerTrip;
        entry.totalAmount = item.amount;
        await entry.save({ transaction: t });
      }
    }

    invoice.billToName = billToName.trim();
    invoice.billToAddress = billToAddress?.trim() || null;
    invoice.billToGst = billToGst?.trim() || null;
    invoice.issuerCompanyId = issuerCompanyId;
    invoice.billingPeriodFrom = billingPeriodFrom;
    invoice.billingPeriodTo = billingPeriodTo;
    invoice.totalTrips = totalTrips;
    invoice.totalAmount = totals.totalAmount;
    invoice.extraCharges = totals.extraCharges;
    invoice.discount = totals.discount;
    invoice.discountPercent = totals.discountPercent;
    invoice.taxRate = totals.taxRate;
    invoice.cgstRate = totals.cgstRate;
    invoice.sgstRate = totals.sgstRate;
    invoice.taxAmount = totals.taxAmount;
    invoice.cgstAmount = totals.cgstAmount;
    invoice.sgstAmount = totals.sgstAmount;
    invoice.grandTotal = totals.grandTotal;
    invoice.notes = notes || null;

    await invoice.save({ transaction: t });

    if (payments.length > 0) {
      await recalculateInvoicePaymentStatus(invoice, t);
    }

    await t.commit();

    const full = await Invoice.findByPk(invoice.id, {
      include: [
        { model: Company, as: 'company' },
        { model: Company, as: 'issuerCompany' },
        { model: InvoiceItem, as: 'items' },
        { model: Payment, as: 'payments' },
      ],
    });

    res.json({ success: true, data: formatInvoice(full) });
  } catch (err) {
    await t.rollback();
    console.error('updateInvoice failed:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to update invoice',
    });
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
    include: [
      { model: InvoiceItem, as: 'items' },
      { model: Payment, as: 'payments' },
    ],
  });

  if (!invoice) {
    return res.status(404).json({ success: false, message: 'Invoice not found' });
  }

  const eodIds = (invoice.items || []).map((i) => i.eodEntryId).filter(Boolean);
  const paymentCount = invoice.payments?.length ?? 0;
  const t = await sequelize.transaction();

  try {
    if (paymentCount > 0) {
      await hardDestroyWhere(Payment, { invoiceId: invoice.id }, { transaction: t });
    }

    if (eodIds.length) {
      await EodEntry.update(
        { billingStatus: 'pending' },
        { where: { id: { [Op.in]: eodIds } }, transaction: t }
      );
    }

    await hardDestroyWhere(InvoiceItem, { invoiceId: invoice.id }, { transaction: t });
    await hardDestroy(invoice, { transaction: t });

    await t.commit();
    res.json({
      success: true,
      message:
        paymentCount > 0
          ? `Invoice deleted (${paymentCount} payment record(s) removed)`
          : 'Invoice deleted',
    });
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
