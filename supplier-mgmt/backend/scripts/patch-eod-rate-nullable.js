import sequelize from '../config/db.js';

await sequelize.query(
  'ALTER TABLE eod_entries MODIFY rate_per_trip DECIMAL(12,2) NULL'
);
console.log('eod_entries.rate_per_trip is now nullable');
await sequelize.close();
