import sequelize from '../config/db.js';

const alters = [
  'ADD COLUMN bill_to_name VARCHAR(200) NULL AFTER issuer_company_id',
  'ADD COLUMN bill_to_address TEXT NULL AFTER bill_to_name',
  'ADD COLUMN bill_to_gst VARCHAR(30) NULL AFTER bill_to_address',
  'MODIFY company_id INT UNSIGNED NULL',
];

for (const clause of alters) {
  try {
    await sequelize.query(`ALTER TABLE invoices ${clause}`);
    console.log(`invoices: ${clause}`);
  } catch (err) {
    if (err.original?.code === 'ER_DUP_FIELDNAME') {
      console.log(`skip (exists): ${clause}`);
    } else {
      throw err;
    }
  }
}

await sequelize.close();
