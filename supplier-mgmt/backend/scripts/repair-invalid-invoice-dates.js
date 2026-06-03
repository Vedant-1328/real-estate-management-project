/**
 * Clears corrupted billing period values (e.g. "Invalid date") on invoices.
 * Run once: node scripts/repair-invalid-invoice-dates.js
 */
import sequelize from '../config/db.js';

const run = async () => {
  const [result] = await sequelize.query(
    `UPDATE invoices
     SET billing_period_from = NULL, billing_period_to = NULL
     WHERE billing_period_from LIKE 'Invalid%'
        OR billing_period_to LIKE 'Invalid%'`
  );
  console.log('Repaired invoice billing periods:', result?.affectedRows ?? result);
  await sequelize.close();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
