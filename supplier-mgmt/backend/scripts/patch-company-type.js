import sequelize from '../config/db.js';

try {
  await sequelize.query(
    "ALTER TABLE companies ADD COLUMN company_type ENUM('own', 'customer') NOT NULL DEFAULT 'customer' AFTER company_name"
  );
  console.log('companies.company_type added');
} catch (err) {
  if (err.original?.code === 'ER_DUP_FIELDNAME') {
    console.log('company_type already exists');
  } else {
    throw err;
  }
}

await sequelize.query(`
  UPDATE companies
  SET company_type = 'own'
  WHERE (bank_account_number IS NOT NULL AND bank_account_number != '')
     OR id IN (SELECT DISTINCT issuer_company_id FROM invoices WHERE issuer_company_id IS NOT NULL)
`);

console.log('Existing rows classified (bank/issuer → own, rest → customer default)');
await sequelize.close();
