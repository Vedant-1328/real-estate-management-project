/**
 * Adds job_assignments.replaced_driver_id (outside hire replacing a fleet driver).
 * Run: node scripts/patch-replaced-driver-id.js
 */
import sequelize from '../config/db.js';

const [cols] = await sequelize.query(
  `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'job_assignments'
   AND COLUMN_NAME = 'replaced_driver_id'`
);

if (!cols.length) {
  await sequelize.query(`
    ALTER TABLE job_assignments
    ADD COLUMN replaced_driver_id INT UNSIGNED NULL
    AFTER outside_driver_vehicle,
    ADD CONSTRAINT fk_job_assignments_replaced_driver
      FOREIGN KEY (replaced_driver_id) REFERENCES drivers(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `);
  console.log('Added job_assignments.replaced_driver_id');
} else {
  console.log('Column replaced_driver_id already exists');
}

await sequelize.close();
