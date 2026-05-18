import { Op } from 'sequelize';
import { Invoice } from '../models/index.js';

export const generateInvoiceNumber = async (invoiceDate = new Date()) => {
  const d = typeof invoiceDate === 'string' ? new Date(invoiceDate) : invoiceDate;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const prefix = `INV-${year}${month}-`;

  const latest = await Invoice.findOne({
    where: { invoiceNumber: { [Op.like]: `${prefix}%` } },
    order: [['invoiceNumber', 'DESC']],
    paranoid: false,
  });

  let seq = 1;
  if (latest?.invoiceNumber) {
    const part = latest.invoiceNumber.slice(prefix.length);
    const parsed = parseInt(part, 10);
    if (!Number.isNaN(parsed)) seq = parsed + 1;
  }

  return `${prefix}${String(seq).padStart(3, '0')}`;
};
