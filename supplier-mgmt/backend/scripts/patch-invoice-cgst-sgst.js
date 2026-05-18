import sequelize from '../config/db.js';

const columns = [
  'ADD COLUMN cgst_rate DECIMAL(5,2) NULL DEFAULT 0 AFTER tax_rate',
  'ADD COLUMN sgst_rate DECIMAL(5,2) NULL DEFAULT 0 AFTER cgst_rate',
  'ADD COLUMN cgst_amount DECIMAL(12,2) NULL DEFAULT 0 AFTER tax_amount',
  'ADD COLUMN sgst_amount DECIMAL(12,2) NULL DEFAULT 0 AFTER cgst_amount',
];

for (const clause of columns) {
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
