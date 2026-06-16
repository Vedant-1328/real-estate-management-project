import bcrypt from 'bcryptjs';
import { Permission, Role, RolePermission, User } from '../models/index.js';
import { findRoleByName } from '../utils/roleHelpers.js';

const TEST_PASSWORD = 'Admin@123';

const rolePermissionMap = {
  'Admin/Manager': {
    dashboard: ['view'],
    companies: ['view', 'add', 'edit'],
    job_types: ['view'],
    vehicle_types: ['view', 'add', 'edit'],
    vehicles: ['view', 'add', 'edit'],
    drivers: ['view', 'add', 'edit'],
    employees: ['view', 'add', 'edit'],
    sites: ['view', 'add', 'edit'],
    expense_types: ['view'],
    job_assignments: ['view', 'add', 'edit', 'delete', 'override'],
    eod_entries: ['view', 'add', 'edit', 'delete', 'approve'],
    daily_expenses: ['view', 'add', 'edit', 'delete'],
    invoices: ['view', 'generate_invoice', 'print'],
    payments: ['view', 'add'],
    driver_advances: ['view', 'add', 'edit', 'approve'],
    employee_advances: ['view', 'add', 'edit', 'approve'],
    reports: ['view', 'export', 'print'],
  },
  Accountant: {
    dashboard: ['view'],
    companies: ['view'],
    job_types: ['view'],
    vehicle_types: ['view'],
    vehicles: ['view'],
    drivers: ['view'],
    employees: ['view'],
    sites: ['view'],
    expense_types: ['view'],
    job_assignments: ['view'],
    eod_entries: ['view'],
    daily_expenses: ['view', 'add', 'edit'],
    invoices: ['view', 'add', 'edit', 'generate_invoice', 'print', 'delete'],
    payments: ['view', 'add', 'edit'],
    driver_advances: ['view'],
    employee_advances: ['view'],
    reports: ['view', 'export', 'print'],
  },
  Supervisor: {
    dashboard: ['view'],
    companies: ['view'],
    job_types: ['view'],
    vehicle_types: ['view'],
    vehicles: ['view'],
    drivers: ['view'],
    employees: ['view'],
    sites: ['view'],
    expense_types: ['view'],
    job_assignments: ['view', 'add', 'edit'],
    eod_entries: ['view', 'add', 'edit', 'approve'],
    daily_expenses: ['view', 'add', 'edit'],
    invoices: ['view'],
    payments: ['view'],
    reports: ['view'],
  },
  'Data Entry User': {
    dashboard: ['view'],
    companies: ['view'],
    job_types: ['view'],
    vehicle_types: ['view'],
    vehicles: ['view'],
    drivers: ['view'],
    employees: ['view'],
    sites: ['view'],
    expense_types: ['view'],
    job_assignments: ['view', 'add'],
    eod_entries: ['view', 'add'],
    daily_expenses: ['view', 'add'],
    invoices: ['view'],
    driver_advances: ['view', 'add'],
    employee_advances: ['view', 'add'],
  },
};

const testUsers = [
  { name: 'Admin Manager', email: 'manager@supplier.com', role: 'Admin/Manager' },
  { name: 'Accountant User', email: 'accountant@supplier.com', role: 'Accountant' },
  { name: 'Supervisor User', email: 'supervisor@supplier.com', role: 'Supervisor' },
  { name: 'Data Entry', email: 'dataentry@supplier.com', role: 'Data Entry User' },
];

export const seedRolePermissionsAndUsers = async () => {
  const roles = await Role.findAll();
  const permissions = await Permission.findAll();
  const permByKey = new Map(
    permissions.map((p) => [`${p.moduleName}:${p.action}`, p.id])
  );

  for (const role of roles) {
    if (role.name === 'Super Admin') continue;

    const spec = rolePermissionMap[role.name];
    if (!spec) continue;

    const existing = await RolePermission.count({ where: { roleId: role.id } });
    if (existing > 0) continue;

    const rows = [];
    for (const [moduleName, actions] of Object.entries(spec)) {
      for (const action of actions) {
        const pid = permByKey.get(`${moduleName}:${action}`);
        if (pid) rows.push({ roleId: role.id, permissionId: pid });
      }
    }
    if (rows.length) {
      await RolePermission.bulkCreate(rows);
      console.log(`Seeded ${rows.length} permissions for ${role.name}`);
    }
  }

  const hash = await bcrypt.hash(TEST_PASSWORD, 10);
  for (const tu of testUsers) {
    const exists = await User.findOne({ where: { email: tu.email } });
    if (exists) continue;
    const role = await findRoleByName(tu.role);
    if (!role) continue;
    await User.create({
      name: tu.name,
      email: tu.email,
      password: hash,
      roleId: role.id,
      status: 'active',
    });
    console.log(`Created test user ${tu.email}`);
  }
};
