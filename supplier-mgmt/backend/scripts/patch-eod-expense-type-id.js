/**
 * Add expense_type_id to eod_entries (links EOD expense to expense_types master).
 * Run: node scripts/patch-eod-expense-type-id.js
 */
import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import sequelize from '../config/db.js';

dotenv.config();

const run = async () => {
  await connectDB();
  const [rows] = await sequelize.query(`
    SELECT COUNT(*) AS cnt
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'eod_entries'
      AND COLUMN_NAME = 'expense_type_id'
  `);
  if (Number(rows[0]?.cnt) > 0) {
    console.log('Column expense_type_id already exists on eod_entries — skipped');
    process.exit(0);
  }

  await sequelize.query(`
    ALTER TABLE eod_entries
    ADD COLUMN expense_type_id INT UNSIGNED NULL AFTER expense,
    ADD CONSTRAINT fk_eod_entries_expense_type
      FOREIGN KEY (expense_type_id) REFERENCES expense_types(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `);
  console.log('Added expense_type_id to eod_entries');
  process.exit(0);
};

run().catch((err) => {
  console.error('Patch failed:', err.message);
  process.exit(1);
});
