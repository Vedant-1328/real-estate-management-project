import bcrypt from 'bcryptjs';
import {
  ExpenseType,
  JobType,
  Permission,
  Role,
  RolePermission,
  User,
} from '../models/index.js';
import { PERMISSION_ACTIONS } from '../models/Permission.js';
import { SUPER_ADMIN_ROLE } from '../utils/permissions.js';

export const MODULES = [
  'dashboard',
  'users',
  'roles',
  'companies',
  'job_types',
  'vehicles',
  'drivers',
  'employees',
  'sites',
  'expense_types',
  'job_assignments',
  'eod_entries',
  'daily_expenses',
  'invoices',
  'payments',
  'driver_advances',
  'employee_advances',
  'reports',
  'audit_logs',
];

const ROLES = [
  { name: SUPER_ADMIN_ROLE, description: 'Full system access' },
  { name: 'Admin/Manager', description: 'Operational management access' },
  { name: 'Accountant', description: 'Billing and finance access' },
  { name: 'Supervisor', description: 'Field operations supervision' },
  { name: 'Data Entry User', description: 'Data entry and viewing access' },
];

const JOB_TYPES = [
  { name: 'Dust', description: 'Dust material hauling', defaultUnit: 'trip' },
  { name: 'Black Soil', description: 'Black soil hauling', defaultUnit: 'trip' },
  { name: 'Debris', description: 'Debris removal', defaultUnit: 'trip' },
  { name: 'Yellow Soil', description: 'Yellow soil hauling', defaultUnit: 'trip' },
  { name: 'Mix Soil', description: 'Mixed soil hauling', defaultUnit: 'trip' },
];

const EXPENSE_TYPES = [
  'Diesel/Fuel',
  'Vehicle Repair',
  'Tyre',
  'Driver Allowance',
  'Toll',
  'Parking',
  'Loading/Unloading',
  'Maintenance',
  'Outside Driver Payment',
  'Miscellaneous',
];

export const seedIfEmpty = async () => {
  const roleCount = await Role.count();
  if (roleCount > 0) {
    console.log('Seed skipped — data already exists');
    return;
  }

  console.log('Seeding database...');

  const roles = await Role.bulkCreate(ROLES, { individualHooks: true });
  const superAdminRole = roles.find((r) => r.name === SUPER_ADMIN_ROLE);

  const permissionRows = [];
  for (const moduleName of MODULES) {
    for (const action of PERMISSION_ACTIONS) {
      permissionRows.push({ moduleName, action });
    }
  }
  const permissions = await Permission.bulkCreate(permissionRows, { individualHooks: true });

  await RolePermission.bulkCreate(
    permissions.map((p) => ({
      roleId: superAdminRole.id,
      permissionId: p.id,
    }))
  );

  await JobType.bulkCreate(JOB_TYPES.map((jt) => ({ ...jt, status: 'active' })), {
    individualHooks: true,
  });

  await ExpenseType.bulkCreate(
    EXPENSE_TYPES.map((name) => ({ name, status: 'active' }))
  );

  const hashedPassword = await bcrypt.hash('Admin@123', 10);
  await User.create({
    name: 'Super Admin',
    email: 'admin@supplier.com',
    password: hashedPassword,
    roleId: superAdminRole.id,
    status: 'active',
  });

  console.log('Seed completed');
};
