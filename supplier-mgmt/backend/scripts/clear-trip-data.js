/**
 * Clears all trip-related data: job assignments, EOD entries, and linked billing.
 * Run: node scripts/clear-trip-data.js
 */
import sequelize from '../config/db.js';

const count = async (table) => {
  const [rows] = await sequelize.query(`SELECT COUNT(*) AS cnt FROM ${table}`);
  return Number(rows[0]?.cnt ?? rows[0]?.CNT ?? 0);
};

const paymentsBefore = await count('payments');
const itemsBefore = await count('invoice_items');
const invoicesBefore = await count('invoices');
const eodBefore = await count('eod_entries');
const assignmentsBefore = await count('job_assignments');

await sequelize.transaction(async (t) => {
  await sequelize.query('DELETE FROM payments', { transaction: t });
  await sequelize.query('DELETE FROM invoice_items', { transaction: t });
  await sequelize.query('DELETE FROM invoices', { transaction: t });
  await sequelize.query('DELETE FROM eod_entries', { transaction: t });
  await sequelize.query('DELETE FROM job_assignments', { transaction: t });
});

for (const table of ['payments', 'invoice_items', 'invoices', 'eod_entries', 'job_assignments']) {
  await sequelize.query(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
}

const [auditResult] = await sequelize.query(
  `DELETE FROM audit_logs WHERE module IN (
    'job_assignments', 'eod_entries', 'invoices', 'payments'
  )`
);

console.log(`Deleted ${assignmentsBefore} job assignment(s).`);
console.log(`Deleted ${eodBefore} EOD / trip record(s).`);
console.log(`Deleted ${invoicesBefore} invoice(s), ${itemsBefore} line item(s), ${paymentsBefore} payment(s).`);
console.log(`Removed ${auditResult.affectedRows ?? 0} related audit log(s).`);
console.log('All trip data cleared. Masters (drivers, vehicles, sites, etc.) unchanged.');

await sequelize.close();
