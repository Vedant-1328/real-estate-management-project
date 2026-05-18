/**
 * Deletes all payments, invoice line items, and invoices.
 * Resets linked EOD entries to billing_status = 'pending'.
 * Run: node scripts/clear-invoices-payments.js
 */
import sequelize from '../config/db.js';

const count = async (table) => {
  const [rows] = await sequelize.query(`SELECT COUNT(*) AS cnt FROM ${table}`);
  return Number(rows[0]?.cnt ?? rows[0]?.CNT ?? 0);
};

const paymentsBefore = await count('payments');
const itemsBefore = await count('invoice_items');
const invoicesBefore = await count('invoices');

await sequelize.transaction(async (t) => {
  await sequelize.query(
    "UPDATE eod_entries SET billing_status = 'pending' WHERE billing_status = 'invoiced'",
    { transaction: t }
  );
  await sequelize.query('DELETE FROM payments', { transaction: t });
  await sequelize.query('DELETE FROM invoice_items', { transaction: t });
  await sequelize.query('DELETE FROM invoices', { transaction: t });
});

await sequelize.query('ALTER TABLE payments AUTO_INCREMENT = 1');
await sequelize.query('ALTER TABLE invoice_items AUTO_INCREMENT = 1');
await sequelize.query('ALTER TABLE invoices AUTO_INCREMENT = 1');

const [auditResult] = await sequelize.query(
  "DELETE FROM audit_logs WHERE module IN ('invoices', 'payments')"
);

console.log(`Deleted ${paymentsBefore} payment(s).`);
console.log(`Deleted ${itemsBefore} invoice line item(s).`);
console.log(`Deleted ${invoicesBefore} invoice(s).`);
console.log(`Removed ${auditResult.affectedRows ?? 0} related audit log(s).`);
console.log('Linked EOD entries reset to pending for re-invoicing.');

await sequelize.close();
