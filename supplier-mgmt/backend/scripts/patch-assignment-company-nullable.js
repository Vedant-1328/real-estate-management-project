import sequelize from '../config/db.js';

await sequelize.query(
  'ALTER TABLE job_assignments MODIFY company_id INT UNSIGNED NULL'
);
console.log('job_assignments.company_id is now nullable');

await sequelize.query(
  'ALTER TABLE eod_entries MODIFY company_id INT UNSIGNED NULL'
);
console.log('eod_entries.company_id is now nullable');

await sequelize.close();
