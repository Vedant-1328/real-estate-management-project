/**
 * Add vehicle_types master + permissions on an existing database.
 * Run: node scripts/seed-vehicle-types.js
 */
import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import sequelize from '../config/db.js';
import { Permission, Role, RolePermission, Vehicle, VehicleType } from '../models/index.js';

dotenv.config();
import { PERMISSION_ACTIONS } from '../models/Permission.js';
import { SUPER_ADMIN_ROLE } from '../utils/permissions.js';
import { findRoleByName } from '../utils/roleHelpers.js';

const DEFAULT_TYPES = [
  { name: 'Tipper', description: 'Tipper truck', billingUnit: 'trip', showsCapacity: false },
  { name: 'Truck', description: 'Standard truck', billingUnit: 'trip', showsCapacity: false },
  { name: 'Dumper', description: 'Dumper — capacity required on vehicle', billingUnit: 'trip', showsCapacity: true },
  { name: 'Hyva', description: 'Hyva', billingUnit: 'trip', showsCapacity: false },
  { name: 'JCB', description: 'JCB — billed by hour', billingUnit: 'hour', showsCapacity: false },
  { name: 'Hitachi', description: 'Hitachi — billed by hour', billingUnit: 'hour', showsCapacity: false },
  { name: 'Poclain', description: 'Poclain excavator', billingUnit: 'hour', showsCapacity: false },
  { name: 'Tractor', description: 'Tractor', billingUnit: 'trip', showsCapacity: false },
];

const linkVehiclesByName = async () => {
  const types = await VehicleType.findAll();
  const byName = new Map(types.map((t) => [t.name.toLowerCase(), t]));
  const vehicles = await Vehicle.findAll({ attributes: ['id', 'vehicleType', 'vehicleTypeId'] });
  let linked = 0;
  for (const v of vehicles) {
    if (!v.vehicleType || v.vehicleTypeId) continue;
    const match = byName.get(String(v.vehicleType).trim().toLowerCase());
    if (match) {
      v.vehicleTypeId = match.id;
      v.vehicleType = match.name;
      await v.save({ hooks: false });
      linked += 1;
    }
  }
  if (linked) console.log(`Linked ${linked} vehicle(s) to vehicle type master`);
};

const ensurePermissions = async () => {
  const superAdmin = await findRoleByName(SUPER_ADMIN_ROLE);
  if (!superAdmin) return;

  for (const action of PERMISSION_ACTIONS) {
    const [perm] = await Permission.findOrCreate({
      where: { moduleName: 'vehicle_types', action },
      defaults: { moduleName: 'vehicle_types', action },
    });
    await RolePermission.findOrCreate({
      where: { roleId: superAdmin.id, permissionId: perm.id },
      defaults: { roleId: superAdmin.id, permissionId: perm.id },
    });
  }
  console.log('Ensured vehicle_types permissions for Super Admin');
};

const ensureSchema = async () => {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS vehicle_types (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(80) NOT NULL UNIQUE,
      description TEXT NULL,
      billing_unit ENUM('trip','hour') NOT NULL DEFAULT 'trip',
      shows_capacity TINYINT(1) NOT NULL DEFAULT 0,
      status ENUM('active','inactive') NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      deleted_at DATETIME NULL
    )
  `);
  const [cols] = await sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehicles' AND COLUMN_NAME = 'vehicle_type_id'`
  );
  if (!cols.length) {
    await sequelize.query(`
      ALTER TABLE vehicles
      ADD COLUMN vehicle_type_id INT UNSIGNED NULL,
      ADD CONSTRAINT vehicles_vehicle_type_id_fk
        FOREIGN KEY (vehicle_type_id) REFERENCES vehicle_types(id)
    `);
  }
  const [capCol] = await sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehicle_types' AND COLUMN_NAME = 'shows_capacity'`
  );
  if (!capCol.length) {
    await sequelize.query(
      `ALTER TABLE vehicle_types ADD COLUMN shows_capacity TINYINT(1) NOT NULL DEFAULT 0`
    );
  }
  await sequelize.query(`
    ALTER TABLE vehicle_types
    MODIFY COLUMN billing_unit ENUM('trip','hour','both') NOT NULL DEFAULT 'trip'
  `).catch(() => {});
  const [eodQtyCol] = await sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'eod_entries' AND COLUMN_NAME = 'quantity_unit'`
  );
  if (!eodQtyCol.length) {
    await sequelize.query(`
      ALTER TABLE eod_entries
      ADD COLUMN quantity_unit ENUM('trip','hour') NULL AFTER actual_trips
    `);
  }
};

const main = async () => {
  await connectDB();
  await ensureSchema();

  for (const row of DEFAULT_TYPES) {
    const [vt, created] = await VehicleType.findOrCreate({
      where: { name: row.name },
      defaults: { ...row, status: 'active' },
    });
    if (created) {
      console.log(`Created vehicle type: ${vt.name}`);
    } else if (row.showsCapacity && !vt.showsCapacity) {
      vt.showsCapacity = true;
      await vt.save({ hooks: false });
      console.log(`Updated ${vt.name}: shows capacity on vehicle form`);
    }
  }

  await linkVehiclesByName();
  await ensurePermissions();
  console.log('Done.');
  process.exit(0);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
