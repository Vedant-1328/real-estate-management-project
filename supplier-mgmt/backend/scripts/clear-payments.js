/**
 * Deletes all payment records and resets invoice payment status where needed.
 * Invoices and EOD billing data are left unchanged.
 * Run: node scripts/clear-payments.js
 */
import { Op } from 'sequelize';
import sequelize from '../config/db.js';
import { Invoice } from '../models/index.js';

const count = async (table) => {
  const [rows] = await sequelize.query(`SELECT COUNT(*) AS cnt FROM ${table}`);
  return Number(rows[0]?.cnt ?? rows[0]?.CNT ?? 0);
};

const paymentsBefore = await count('payments');

await sequelize.query('DELETE FROM payments');
await sequelize.query('ALTER TABLE payments AUTO_INCREMENT = 1');

const invoices = await Invoice.findAll({
  where: { paymentStatus: { [Op.in]: ['paid', 'partially_paid'] } },
  attributes: ['id', 'paymentStatus'],
});

let resetCount = 0;
for (const invoice of invoices) {
  invoice.paymentStatus = 'generated';
  await invoice.save();
  resetCount += 1;
}

const [auditResult] = await sequelize.query(
  "DELETE FROM audit_logs WHERE module = 'payments'"
);

console.log(`Deleted ${paymentsBefore} payment(s).`);
console.log(`Reset ${resetCount} invoice(s) from paid/partially_paid to generated.`);
console.log(`Removed ${auditResult.affectedRows ?? 0} related audit log(s).`);

await sequelize.close();
