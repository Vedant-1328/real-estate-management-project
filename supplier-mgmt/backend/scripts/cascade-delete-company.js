/**
 * Cascade-delete a company and all linked records.
 * Usage: node scripts/cascade-delete-company.js <companyId>
 */
import dotenv from 'dotenv';
import { Op } from 'sequelize';
import { connectDB } from '../config/db.js';
import {
  Company,
  CompanyJobRate,
  EodEntry,
  Invoice,
  InvoiceItem,
  JobAssignment,
  Payment,
  Site,
  sequelize,
} from '../models/index.js';
import { hardDestroy, hardDestroyWhere } from '../utils/hardDestroy.js';

dotenv.config();

const companyId = Number(process.argv[2]);
if (!companyId) {
  console.error('Usage: node scripts/cascade-delete-company.js <companyId>');
  process.exit(1);
}

const deleteInvoices = async (id, transaction) => {
  const invoices = await Invoice.findAll({
    where: { [Op.or]: [{ companyId: id }, { issuerCompanyId: id }] },
    transaction,
  });
  for (const inv of invoices) {
    await hardDestroyWhere(Payment, { invoiceId: inv.id }, { transaction });
    await hardDestroyWhere(InvoiceItem, { invoiceId: inv.id }, { transaction });
    await hardDestroy(inv, { transaction });
  }
  return invoices.length;
};

const deleteEod = async (id, transaction) => {
  const entries = await EodEntry.findAll({ where: { companyId: id }, transaction });
  for (const entry of entries) {
    await hardDestroy(entry, { transaction });
    if (entry.assignmentId) {
      const stub = await JobAssignment.findOne({
        where: { id: entry.assignmentId, status: 'completed', companyId: id },
        transaction,
      });
      if (stub) await hardDestroy(stub, { transaction });
    }
  }
  return entries.length;
};

await connectDB();
const company = await Company.findByPk(companyId);
if (!company) {
  console.error('Company not found:', companyId);
  process.exit(1);
}

console.log('Deleting company:', company.companyName, `(id ${companyId})`);

const t = await sequelize.transaction();
try {
  const invoiceCount = await deleteInvoices(companyId, t);
  const eodCount = await deleteEod(companyId, t);
  const assignmentCount = await JobAssignment.destroy({
    where: { companyId },
    force: true,
    transaction: t,
  });
  const siteCount = await Site.destroy({ where: { companyId }, force: true, transaction: t });
  await hardDestroyWhere(CompanyJobRate, { companyId }, { transaction: t });
  await hardDestroy(company, { transaction: t });
  await t.commit();
  console.log('Done:', { invoiceCount, eodCount, assignmentCount, siteCount });
} catch (err) {
  await t.rollback();
  console.error('Failed:', err.message);
  process.exit(1);
}

await sequelize.close();
