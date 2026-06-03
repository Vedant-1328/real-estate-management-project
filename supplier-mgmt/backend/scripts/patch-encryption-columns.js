/**
 * Widens columns that store encrypted ciphertext (longer than plaintext).
 * Run once: node scripts/patch-encryption-columns.js
 */
import sequelize from '../config/db.js';

const dropUniqueIndexesOnColumn = async (table, column) => {
  const [indexes] = await sequelize.query(`SHOW INDEX FROM \`${table}\``);
  const keys = [
    ...new Set(
      indexes
        .filter((i) => i.Column_name === column && i.Non_unique === 0 && i.Key_name !== 'PRIMARY')
        .map((i) => i.Key_name)
    ),
  ];
  for (const key of keys) {
    await sequelize.query(`ALTER TABLE \`${table}\` DROP INDEX \`${key}\``);
    console.log('Dropped index:', table, key);
  }
};

const run = async (sql) => {
  try {
    await sequelize.query(sql);
    console.log('OK:', sql.split('\n')[0].slice(0, 80));
  } catch (err) {
    console.warn('Skip:', err.message);
  }
};

const alters = [
  'ALTER TABLE users MODIFY mobile TEXT NULL',
  'ALTER TABLE drivers MODIFY mobile TEXT NULL, MODIFY license_number TEXT NULL',
  'ALTER TABLE employees MODIFY mobile TEXT NULL, MODIFY email TEXT NULL, MODIFY role_department TEXT NULL',
  `ALTER TABLE companies MODIFY contact_person TEXT NULL, MODIFY mobile TEXT NULL, MODIFY email TEXT NULL,
   MODIFY gst_number TEXT NULL, MODIFY payment_terms TEXT NULL, MODIFY bank_account_number TEXT NULL,
   MODIFY bank_ifsc_code TEXT NULL, MODIFY bank_account_holder_name TEXT NULL`,
  'ALTER TABLE sites MODIFY contact_person TEXT NULL, MODIFY mobile TEXT NULL',
  `ALTER TABLE job_assignments MODIFY outside_driver_name TEXT NULL, MODIFY outside_driver_mobile TEXT NULL,
   MODIFY outside_driver_vehicle TEXT NULL, MODIFY from_site_temp TEXT NULL, MODIFY to_site_temp TEXT NULL`,
  'ALTER TABLE invoices MODIFY bill_to_name TEXT NULL, MODIFY bill_to_gst TEXT NULL',
  'ALTER TABLE payments MODIFY reference_number TEXT NULL, MODIFY payment_mode TEXT NULL, MODIFY amount TEXT NULL',
  'ALTER TABLE temporary_sites MODIFY contact_person TEXT NULL, MODIFY mobile TEXT NULL',
  'ALTER TABLE daily_expenses MODIFY receipt_path TEXT NULL, MODIFY paid_by TEXT NULL, MODIFY payment_mode TEXT NULL, MODIFY amount TEXT NULL',
  'ALTER TABLE driver_advances MODIFY given_by TEXT NULL, MODIFY payment_mode TEXT NULL, MODIFY amount TEXT NULL',
  'ALTER TABLE employee_advances MODIFY given_by TEXT NULL, MODIFY payment_mode TEXT NULL, MODIFY amount TEXT NULL',
  `ALTER TABLE eod_entries MODIFY planned_trips TEXT NULL, MODIFY actual_trips TEXT NULL,
   MODIFY rate_per_trip TEXT NULL, MODIFY total_amount TEXT NULL, MODIFY extra_charges TEXT NULL,
   MODIFY deductions TEXT NULL, MODIFY diesel_fuel TEXT NULL, MODIFY expense TEXT NULL,
   MODIFY start_time TEXT NULL, MODIFY end_time TEXT NULL, MODIFY approval_date TEXT NULL`,
  `ALTER TABLE invoices MODIFY billing_period_from TEXT NULL, MODIFY billing_period_to TEXT NULL,
   MODIFY total_trips TEXT NULL, MODIFY total_amount TEXT NULL, MODIFY extra_charges TEXT NULL,
   MODIFY discount TEXT NULL, MODIFY discount_percent TEXT NULL, MODIFY tax_rate TEXT NULL,
   MODIFY cgst_rate TEXT NULL, MODIFY sgst_rate TEXT NULL, MODIFY tax_amount TEXT NULL,
   MODIFY cgst_amount TEXT NULL, MODIFY sgst_amount TEXT NULL, MODIFY grand_total TEXT NULL`,
  'ALTER TABLE permissions DROP INDEX permissions_module_action_unique',
  'ALTER TABLE permissions MODIFY module_name TEXT NOT NULL, MODIFY action TEXT NOT NULL',
  `CREATE UNIQUE INDEX permissions_module_action_unique ON permissions (module_name(191), action(191))`,
  `ALTER TABLE invoice_items MODIFY line_date TEXT NOT NULL, MODIFY job_type_name TEXT NOT NULL,
   MODIFY vehicle_number TEXT NULL, MODIFY driver_name TEXT NULL, MODIFY from_site TEXT NULL,
   MODIFY to_site TEXT NULL, MODIFY actual_trips TEXT NOT NULL, MODIFY rate_per_trip TEXT NOT NULL,
   MODIFY amount TEXT NOT NULL`,
  `ALTER TABLE job_assignments MODIFY expected_trips TEXT NULL, MODIFY company_rate TEXT NULL,
   MODIFY driver_cost TEXT NULL, MODIFY diesel_fuel TEXT NULL`,
  'ALTER TABLE audit_logs MODIFY module TEXT NOT NULL, MODIFY action TEXT NOT NULL, MODIFY record_id TEXT NULL',
];

for (const sql of alters) {
  await run(sql);
}

try {
  await dropUniqueIndexesOnColumn('roles', 'name');
  await sequelize.query(
    'ALTER TABLE roles MODIFY name TEXT NOT NULL, MODIFY description TEXT NULL'
  );
  console.log('OK: roles name/description -> TEXT');
  await sequelize.query('CREATE UNIQUE INDEX roles_name_unique ON roles (name(191))');
  console.log('OK: roles_name_unique');
} catch (err) {
  console.warn('Skip roles patch:', err.message);
}

try {
  await dropUniqueIndexesOnColumn('job_types', 'name');
  await sequelize.query(
    'ALTER TABLE job_types MODIFY name TEXT NOT NULL, MODIFY description TEXT NULL, MODIFY default_unit TEXT NOT NULL'
  );
  console.log('OK: job_types encrypted columns -> TEXT');
  await sequelize.query('CREATE UNIQUE INDEX job_types_name_unique ON job_types (name(191))');
  console.log('OK: job_types_name_unique');
} catch (err) {
  console.warn('Skip job_types patch:', err.message);
}

console.log('Encryption column patch finished.');
await sequelize.close();
