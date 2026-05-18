import sequelize from '../config/db.js';

try {
  await sequelize.query(
    'ALTER TABLE invoices ADD COLUMN issuer_company_id INT UNSIGNED NULL AFTER company_id'
  );
  console.log('invoices.issuer_company_id added');
} catch (err) {
  if (err.original?.code === 'ER_DUP_FIELDNAME') {
    console.log('issuer_company_id already exists');
  } else {
    throw err;
  }
}

try {
  await sequelize.query(
    'ALTER TABLE invoices ADD CONSTRAINT fk_invoices_issuer_company FOREIGN KEY (issuer_company_id) REFERENCES companies(id)'
  );
  console.log('foreign key added');
} catch (err) {
  if (err.original?.code === 'ER_DUP_KEYNAME' || err.original?.errno === 1826) {
    console.log('foreign key already exists');
  } else {
    throw err;
  }
}

await sequelize.close();
