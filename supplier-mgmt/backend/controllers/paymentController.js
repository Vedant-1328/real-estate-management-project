import { Op } from 'sequelize';
import { Company, Invoice, Payment } from '../models/index.js';

const partyLabelFromInvoice = (inv) => {
  const plain = inv.get ? inv.get({ plain: true }) : inv;
  return (plain.billToName?.trim() || plain.company?.companyName || '').trim();
};

const normalizePartyName = (value) => value.trim().toLowerCase();

const invoiceMatchesPartyName = (inv, partyName) => {
  const label = normalizePartyName(partyLabelFromInvoice(inv));
  const search = normalizePartyName(partyName);
  if (!label || !search) return false;
  return label === search || label.includes(search) || search.includes(label);
};

const sumPayments = (payments = []) =>
  payments.reduce((s, p) => s + Number(p.amount || 0), 0);

const loadPayableInvoicesForParty = async (partyName) => {
  const invoices = await Invoice.findAll({
    where: { paymentStatus: { [Op.in]: ['draft', 'generated', 'sent', 'partially_paid'] } },
    include: [
      { model: Company, as: 'company', attributes: ['id', 'companyName'] },
      { model: Payment, as: 'payments', attributes: ['amount'] },
    ],
    order: [['invoiceDate', 'ASC'], ['id', 'ASC']],
  });

  return invoices
    .filter((inv) => invoiceMatchesPartyName(inv, partyName))
    .map((inv) => {
      const paid = sumPayments(inv.payments);
      const grandTotal = Number(inv.grandTotal);
      const balanceDue = Math.max(0, grandTotal - paid);
      return { inv, balanceDue };
    })
    .filter((row) => row.balanceDue > 0.005);
};

const recalculateInvoicePaymentStatus = async (invoiceId) => {
  const invoice = await Invoice.findByPk(invoiceId, {
    include: [{ model: Payment, as: 'payments' }],
  });
  if (!invoice || invoice.paymentStatus === 'cancelled') return;

  const paid = (invoice.payments || []).reduce((s, p) => s + Number(p.amount), 0);
  const grandTotal = Number(invoice.grandTotal);

  if (paid >= grandTotal) {
    invoice.paymentStatus = 'paid';
  } else if (paid > 0) {
    invoice.paymentStatus = 'partially_paid';
  } else if (invoice.paymentStatus === 'paid' || invoice.paymentStatus === 'partially_paid') {
    invoice.paymentStatus = invoice.paymentStatus === 'sent' ? 'sent' : 'generated';
  }

  await invoice.save();
  return invoice;
};

export const listPayments = async (req, res) => {
  const { from, to, paymentMode, invoiceId } = req.query;
  const where = {};

  if (from && to) {
    where.paymentDate = { [Op.between]: [from, to] };
  } else if (from) {
    where.paymentDate = { [Op.gte]: from };
  } else if (to) {
    where.paymentDate = { [Op.lte]: to };
  }

  if (invoiceId) {
    where.invoiceId = invoiceId;
  }

  let payments = await Payment.findAll({
    where,
    include: [
      {
        model: Invoice,
        as: 'invoice',
        attributes: [
          'id',
          'invoiceNumber',
          'billToName',
          'grandTotal',
          'paymentStatus',
        ],
        include: [{ model: Company, as: 'company', attributes: ['companyName'] }],
      },
    ],
    order: [
      ['paymentDate', 'DESC'],
      ['id', 'DESC'],
    ],
  });

  if (paymentMode && paymentMode !== 'all') {
    payments = payments.filter((p) => p.paymentMode === paymentMode);
  }

  const data = payments.map((p) => {
    const plain = p.get({ plain: true });
    const inv = plain.invoice || {};
    return {
      id: plain.id,
      invoiceId: plain.invoiceId,
      paymentDate: plain.paymentDate,
      amount: Number(plain.amount),
      paymentMode: plain.paymentMode,
      referenceNumber: plain.referenceNumber,
      notes: plain.notes,
      invoiceNumber: inv.invoiceNumber,
      billToLabel: inv.billToName || inv.company?.companyName || '—',
    };
  });

  const totalAmount = data.reduce((s, p) => s + p.amount, 0);

  res.json({
    success: true,
    data,
    meta: {
      count: data.length,
      totalAmount: Number(totalAmount.toFixed(2)),
    },
  });
};

export const getPayableInvoices = async (_req, res) => {
  const invoices = await Invoice.findAll({
    where: {
      paymentStatus: { [Op.in]: ['draft', 'generated', 'sent', 'partially_paid'] },
    },
    include: [{ model: Payment, as: 'payments', attributes: ['amount'] }],
    order: [['invoiceDate', 'DESC']],
  });

  const data = invoices.map((inv) => {
    const plain = inv.get({ plain: true });
    const paid = (plain.payments || []).reduce((s, p) => s + Number(p.amount), 0);
    const grandTotal = Number(plain.grandTotal);
    const balance = Math.max(0, grandTotal - paid);
    return {
      id: plain.id,
      invoiceNumber: plain.invoiceNumber,
      invoiceDate: plain.invoiceDate,
      billToLabel: plain.billToName || '—',
      grandTotal,
      paidAmount: Number(paid.toFixed(2)),
      balanceDue: Number(balance.toFixed(2)),
      paymentStatus: plain.paymentStatus,
    };
  });

  res.json({ success: true, data: data.filter((i) => i.balanceDue > 0.005) });
};

export const createPayment = async (req, res) => {
  const invoice = await Invoice.findByPk(req.body.invoiceId);
  if (!invoice) {
    return res.status(404).json({ success: false, message: 'Invoice not found' });
  }

  if (invoice.paymentStatus === 'cancelled') {
    return res.status(400).json({ success: false, message: 'Cannot pay cancelled invoice' });
  }

  if (invoice.paymentStatus === 'draft') {
    invoice.paymentStatus = 'generated';
    await invoice.save();
  }

  const payment = await Payment.create({
    invoiceId: req.body.invoiceId,
    paymentDate: req.body.paymentDate,
    amount: req.body.amount,
    paymentMode: req.body.paymentMode,
    referenceNumber: req.body.referenceNumber || null,
    notes: req.body.notes || null,
  });

  await recalculateInvoicePaymentStatus(invoice.id);

  const plain = payment.get({ plain: true });
  plain.amount = Number(plain.amount);

  res.status(201).json({ success: true, data: plain });
};

export const lookupPartyBalance = async (req, res) => {
  const partyName = (req.query.partyName || '').trim();
  if (!partyName) {
    return res.status(400).json({ success: false, message: 'partyName is required' });
  }

  const partyInvoices = await loadPayableInvoicesForParty(partyName);
  const balanceDue = partyInvoices.reduce((s, r) => s + r.balanceDue, 0);

  res.json({
    success: true,
    data: {
      partyName,
      balanceDue: Number(balanceDue.toFixed(2)),
      invoiceCount: partyInvoices.length,
      found: partyInvoices.length > 0,
    },
  });
};

export const createPartyPayment = async (req, res) => {
  const { partyName, paymentDate, amount, paymentMode, referenceNumber, notes } = req.body;
  const payAmount = Number(amount);

  const partyInvoices = await loadPayableInvoicesForParty(partyName);

  if (partyInvoices.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'No outstanding invoices found for this company or person',
    });
  }

  const totalDue = partyInvoices.reduce((s, r) => s + r.balanceDue, 0);
  if (payAmount > totalDue + 0.01) {
    return res.status(400).json({
      success: false,
      message: `Amount exceeds outstanding balance (${totalDue.toFixed(2)})`,
    });
  }

  let remaining = payAmount;
  const created = [];

  for (const { inv, balanceDue } of partyInvoices) {
    if (remaining <= 0.005) break;

    const apply = Math.min(remaining, balanceDue);
    if (inv.paymentStatus === 'draft') {
      inv.paymentStatus = 'generated';
      await inv.save();
    }

    const payment = await Payment.create({
      invoiceId: inv.id,
      paymentDate,
      amount: apply,
      paymentMode,
      referenceNumber: referenceNumber || null,
      notes: notes || null,
    });
    await recalculateInvoicePaymentStatus(inv.id);
    created.push(payment);
    remaining -= apply;
  }

  res.status(201).json({
    success: true,
    data: {
      payments: created.map((p) => ({ ...p.get({ plain: true }), amount: Number(p.amount) })),
      totalApplied: Number((payAmount - remaining).toFixed(2)),
    },
  });
};
