/**
 * Add loaded_by_driver_id to eod_entries.
 * Run: node scripts/patch-eod-loaded-by-driver.js
 */
import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import sequelize from '../config/db.js';

dotenv.config();

const run = async () => {
  await connectDB();
  const [cols] = await sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'eod_entries'
       AND COLUMN_NAME = 'loaded_by_driver_id'`
  );
  if (cols.length) {
    console.log('Column loaded_by_driver_id already exists');
    process.exit(0);
  }
  await sequelize.query(`
    ALTER TABLE eod_entries
    ADD COLUMN loaded_by_driver_id INT UNSIGNED NULL,
    ADD CONSTRAINT fk_eod_loaded_by_driver
      FOREIGN KEY (loaded_by_driver_id) REFERENCES drivers(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `);
  console.log('Added eod_entries.loaded_by_driver_id');
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
